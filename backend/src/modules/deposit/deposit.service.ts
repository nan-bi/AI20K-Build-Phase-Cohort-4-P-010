import { holdingDepositAmount } from './deposit-amount';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PhoneService } from '../auth/phone/phone.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { buildDepositTerms, DEPOSIT_TERMS_VERSION } from './deposit-terms';
import { getVietQrConfig, isDemoToolsEnabled, isVietQrWebhookConfigured } from './vietqr';
import { CreateDepositDto, UploadHostReceiptDto } from './dto/deposit.dto';
import { toTenantBooking, statusToWeb } from '../tenant/tenant.mappers';
import { DepositTermsDoc, TenantBooking } from '../tenant/tenant.types';
import { DepositStatus, HostRole, TicketStatus, UnitStatus, ViewingStatus } from '@prisma/client';

function isSerializationConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2034');
}

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly phones: PhoneService,
    private readonly bookingAccess: BookingAccessService,
  ) {}

  private async systemActorId(client: any): Promise<string> {
    const admin = await client.profile.findFirst({
      where: { role: { code: 'ops_admin' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!admin) {
      throw new ServiceUnavailableException({
        message: 'Chưa có tài khoản Admin thật để ghi nhận sự kiện đối soát.',
        code: 'system_actor_unavailable',
      });
    }
    return admin.id;
  }

  /**
   * Giờ giữ chỗ theo luật B4: `unit.holdHoursOverride` → `FeeConfig.hold_hours_default` (Admin cài) → 48, kẹp [12, 72].
   * Mọi nơi tính giờ giữ chỗ (biên bản, tạo cọc, báo có) PHẢI dùng hàm này để không lệch nhau và lệch catalog.
   */
  private async resolveHoldHours(override?: number | null, client: any = this.prisma): Promise<number> {
    let hours: number | null = override ?? null;
    if (hours == null) {
      const cfg = await client.feeConfig?.findUnique({ where: { configKey: 'hold_hours_default' } });
      hours = cfg ? Number(cfg.paramValue) : 48;
    }
    return Math.min(72, Math.max(12, Math.round(hours)));
  }

  /** A14 (công khai): biên bản điều khoản cọc khách đọc trước khi tick. Có `unitCode` thì dùng giờ giữ chỗ của căn đó. */
  async getPublicDepositTerms(unitCode?: string): Promise<DepositTermsDoc> {
    let override: number | null = null;
    if (unitCode) {
      const unit = await this.prisma.unit.findFirst({
        where: { unitCode: { equals: unitCode.trim(), mode: 'insensitive' } },
        select: { holdHoursOverride: true },
      });
      if (!unit) throw new NotFoundException({ message: 'Không tìm thấy căn hộ.', code: 'unit_not_found' });
      override = unit.holdHoursOverride;
    }
    return buildDepositTerms(await this.resolveHoldHours(override));
  }

  async getDepositTerms(ref: string, user: { id: string }): Promise<DepositTermsDoc> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    const unit = await this.prisma.unit.findUnique({
      where: { id: viewing.unitId },
    });

    return buildDepositTerms(await this.resolveHoldHours(unit?.holdHoursOverride));
  }

  async createDeposit(
    ref: string,
    user: { id: string },
    dto: CreateDepositDto,
    reqContext?: { ip?: string; userAgent?: string },
  ): Promise<TenantBooking> {
    if (!isDemoToolsEnabled() && (!getVietQrConfig() || !isVietQrWebhookConfigured())) {
      throw new ServiceUnavailableException({
        message: 'Thanh toán VietQR chưa được cấu hình đầy đủ để nhận và đối soát giao dịch.',
        code: 'vietqr_not_configured',
      });
    }

    const viewing = await this.bookingAccess.loadOwned(ref, user);

    if (viewing.status !== ViewingStatus.CLOSING) {
      throw new ConflictException({
        message: 'Lịch hẹn chưa ở trạng thái chốt cọc.',
        code: 'bad_status',
        expected: 'closing',
        actual: statusToWeb(viewing.status),
      });
    }

    if (dto.acceptTerms !== true) {
      throw new BadRequestException({
        message: 'Bạn phải đồng ý với điều khoản đặt cọc giữ chỗ.',
        code: 'invalid_request',
      });
    }

    if (dto.termsVersion !== DEPOSIT_TERMS_VERSION) {
      throw new ConflictException({
        message: 'Phiên bản điều khoản đặt cọc đã cũ, vui lòng tải lại.',
        code: 'terms_version_stale',
      });
    }

    // Check existing deposit
    const existingDeposit = await this.prisma.holdingDeposit.findUnique({
      where: { viewingId: viewing.id },
    });

    if (existingDeposit) {
      if (existingDeposit.paymentStatus === DepositStatus.PENDING_PAYMENT) {
        // Idempotent: return existing without changing termsAcceptedAt
        const reloaded = await this.bookingAccess.loadOwned(ref, user);
        let rawPhone: string | undefined;
        if (viewing.contactPhoneEnc) {
          try {
            rawPhone = this.phones.decrypt(viewing.contactPhoneEnc);
          } catch {}
        }
        return toTenantBooking(reloaded, { rawPhone, holdHours: existingDeposit.holdHours ?? 48 });
      }
      throw new ConflictException({
        message: 'Giao dịch cọc đã được xử lý hoặc không ở trạng thái chờ thanh toán.',
        code: 'bad_status',
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      await this.expireIfDue(viewing.unitId, tx);

      const unit = await tx.unit.findUnique({
        where: { id: viewing.unitId },
      });

      if (!unit || unit.status !== UnitStatus.AVAILABLE) {
        throw new ConflictException({
          message: 'Căn hộ đã có người khác giữ chỗ hoặc không còn trống.',
          code: 'unit_already_held',
        });
      }

      // Attribution lock: find host from accepted ticket
      const acceptedTicket = viewing.tickets?.find((t: any) => t.status === 'ACCEPTED');
      const attributedHostId = acceptedTicket?.hostId ?? null;
      let rawPhone: string | undefined;
      if (viewing.contactPhoneEnc) {
        try {
          rawPhone = this.phones.decrypt(viewing.contactPhoneEnc);
        } catch {
          rawPhone = undefined;
        }
      }

      const depositCode = `DEP-${ref}`;
      const amount = holdingDepositAmount(); // Constant: CẤM accept from client!
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
      const vietqrRef = `VQ-${randNum}-${randHex}`;
      const transferContent = `COC ${unit.unitCode} ${ref}`;
      const now = new Date();
      const holdHours = await this.resolveHoldHours(unit.holdHoursOverride, tx);

      const deposit = await tx.holdingDeposit.create({
        data: {
          depositCode,
          viewingId: viewing.id,
          unitId: unit.id,
          attributedHostId,
          amount,
          vietqrRef,
          transferContent,
          paymentStatus: DepositStatus.PENDING_PAYMENT,
          termsAcceptedAt: now,
          termsVersion: DEPOSIT_TERMS_VERSION,
          holdHours,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: 'tenant',
          actionType: 'DEPOSIT_TERMS_ACCEPTED',
          entityName: 'HoldingDeposit',
          entityId: deposit.id,
          newValue: {
            termsVersion: DEPOSIT_TERMS_VERSION,
            holdHours,
          },
          ipAddress: reqContext?.ip || '127.0.0.1',
          userAgent: reqContext?.userAgent || 'VinStay PWA / Web Client',
        },
      });

      const reloaded = await tx.viewing.findUnique({
        where: { id: viewing.id },
        include: {
          unit: { include: { building: true } },
          tenant: true,
          tickets: { include: { host: { include: { profile: true } } } },
          deposit: true,
        },
      });

      return toTenantBooking(reloaded, { rawPhone, holdHours });
    });
  }

  /**
   * DEMO (xoá khi có webhook ngân hàng thật): giả lập ngân hàng báo có cho cọc của chính khách này,
   * đi qua đúng markPaid nên first-to-pay, hết hạn giữ chỗ... vẫn chạy như thật.
   */
  async demoPay(ref: string, user: { id: string }): Promise<{ outcome: string }> {
    if (!isDemoToolsEnabled()) {
      throw new NotFoundException({ message: 'Không tìm thấy.', code: 'not_found' });
    }
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    const deposit = await this.prisma.holdingDeposit.findUnique({ where: { viewingId: viewing.id } });
    if (!deposit) {
      throw new ConflictException({ message: 'Chưa có giao dịch cọc để thanh toán.', code: 'bad_status' });
    }
    const outcome = await this.markPaid({
      depositCode: deposit.depositCode,
      amount: holdingDepositAmount(),
      bankRefNumber: `DEMO-${deposit.depositCode}`,
      actor: 'bank',
      actorId: user.id,
    });
    return { outcome };
  }

  async markPaid(input: {
    transferContent?: string;
    depositCode?: string;
    amount: number;
    bankRefNumber: string;
    paidAt?: Date;
    actor: 'bank';
    actorId?: string;
  }): Promise<'paid' | 'duplicate' | 'ignored' | 'refunded'> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Idempotent: check bankRefNumber in EscrowTransaction
      const existingTx = await tx.escrowTransaction.findUnique({
        where: { bankRefNumber: input.bankRefNumber },
      });
      if (existingTx) {
        return 'duplicate';
      }

      // 2. Find pending deposit by depositCode or transferContent
      let deposit: any = null;
      if (input.depositCode) {
        deposit = await tx.holdingDeposit.findFirst({
          where: {
            depositCode: input.depositCode,
            paymentStatus: { in: [DepositStatus.PENDING_PAYMENT, DepositStatus.QR_EXPIRED] },
          },
          include: { unit: true, viewing: { include: { tenant: true } } },
        });
      }

      if (!deposit && input.transferContent) {
        const cleaned = input.transferContent.trim().replace(/\s+/g, ' ');
        deposit = await tx.holdingDeposit.findFirst({
          where: {
            paymentStatus: { in: [DepositStatus.PENDING_PAYMENT, DepositStatus.QR_EXPIRED] },
            transferContent: { equals: cleaned, mode: 'insensitive' },
          },
          include: { unit: true, viewing: { include: { tenant: true } } },
        });
      }

      if (!deposit) {
        const systemActorId = input.actorId || (await this.systemActorId(tx));
        await tx.auditLog.create({
          data: {
            actorId: systemActorId,
            actorRole: input.actor,
            actionType: 'DEPOSIT_UNMATCHED',
            entityName: 'HoldingDeposit',
            entityId: input.depositCode || input.transferContent || 'unknown',
            newValue: { bankRefNumber: input.bankRefNumber, amount: input.amount },
          },
        });
        return 'ignored';
      }

      const effectiveActorId = deposit.viewing?.tenantId || input.actorId || (await this.systemActorId(tx));

      // 3. Amount check (must be exactly 2.000.000)
      if (Number(input.amount) !== holdingDepositAmount()) {
        await tx.auditLog.create({
          data: {
            actorId: effectiveActorId,
            actorRole: input.actor,
            actionType: 'DEPOSIT_AMOUNT_MISMATCH',
            entityName: 'HoldingDeposit',
            entityId: deposit.id,
            newValue: {
              expected: holdingDepositAmount(),
              received: input.amount,
              bankRefNumber: input.bankRefNumber,
            },
          },
        });
        return 'ignored';
      }

      // 4. Lazy expire
      await this.expireIfDue(deposit.unitId, tx);

      // 5. First-to-Pay Wins race condition lock
      const unitUpdate = await tx.unit.updateMany({
        where: { id: deposit.unitId, status: UnitStatus.AVAILABLE },
        data: { status: UnitStatus.HOLDING },
      });

      if (unitUpdate.count === 0) {
        // Race lost: unit already held or rented
        await tx.holdingDeposit.update({
          where: { id: deposit.id },
          data: { paymentStatus: DepositStatus.REFUNDED },
        });

        const execTime = input.paidAt || new Date();
        await tx.escrowTransaction.create({
          data: {
            depositId: deposit.id,
            transType: 'INBOUND_DEPOSIT',
            amount: holdingDepositAmount(),
            bankRefNumber: input.bankRefNumber,
            executedAt: execTime,
          },
        });

        await tx.escrowTransaction.create({
          data: {
            depositId: deposit.id,
            transType: 'REFUND',
            amount: holdingDepositAmount(),
            bankRefNumber: `${input.bankRefNumber}-R`,
            executedAt: execTime,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: effectiveActorId,
            actorRole: input.actor,
            actionType: 'DEPOSIT_LOST_RACE',
            entityName: 'HoldingDeposit',
            entityId: deposit.id,
            newValue: {
              bankRefNumber: input.bankRefNumber,
              reason: 'Căn hộ đã được người khác giữ chỗ trước.',
            },
          },
        });

        return 'refunded';
      }

      // 6. Won race (paid)
      const paidAt = input.paidAt || new Date();
      const holdHours = await this.resolveHoldHours(deposit.unit?.holdHoursOverride ?? deposit.holdHours, tx);
      const expiresAt = new Date(paidAt.getTime() + holdHours * 3600 * 1000);

      await tx.holdingDeposit.update({
        where: { id: deposit.id },
        data: {
          paymentStatus: DepositStatus.PAID_HOLDING,
          paidAt,
          holdHours,
          expiresAt,
        },
      });

      await tx.viewing.update({
        where: { id: deposit.viewingId },
        data: { status: ViewingStatus.HOLDING },
      });

      await tx.escrowTransaction.create({
        data: {
          depositId: deposit.id,
          transType: 'INBOUND_DEPOSIT',
          amount: holdingDepositAmount(),
          bankRefNumber: input.bankRefNumber,
          executedAt: paidAt,
        },
      });

      // Cancel other active viewings for the same unit
      await tx.viewing.updateMany({
        where: {
          unitId: deposit.unitId,
          id: { not: deposit.viewingId },
          status: {
            in: [
              ViewingStatus.PENDING_CONFIRMATION,
              ViewingStatus.CONFIRMED,
              ViewingStatus.LOBBY,
            ],
          },
        },
        data: {
          status: ViewingStatus.CANCELLED,
          closedReason: 'auto_cancelled_due_to_deposit',
        },
      });

      // Expire other pending deposits for the same unit
      await tx.holdingDeposit.updateMany({
        where: {
          unitId: deposit.unitId,
          id: { not: deposit.id },
          paymentStatus: DepositStatus.PENDING_PAYMENT,
        },
        data: { paymentStatus: DepositStatus.QR_EXPIRED },
      });

      await tx.auditLog.create({
        data: {
          actorId: effectiveActorId,
          actorRole: input.actor,
          actionType: 'DEPOSIT_PAID',
          entityName: 'HoldingDeposit',
          entityId: deposit.id,
          newValue: {
            bankRefNumber: input.bankRefNumber,
            paidAt: paidAt.toISOString(),
            holdHours,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return 'paid';
    });
  }

  async expireIfDue(unitId: string, tx?: any): Promise<void> {
    const db = tx || this.prisma;
    const now = new Date();

    const expiredDeposits = await db.holdingDeposit.findMany({
      where: {
        unitId,
        paymentStatus: { in: [DepositStatus.PAID_HOLDING, DepositStatus.UNC_PENDING_REVIEW] },
        expiresAt: { lte: now },
      },
      include: { viewing: true },
    });
    if (!expiredDeposits.length) return;

    for (const dep of expiredDeposits) {
      const isUncReview = dep.paymentStatus === DepositStatus.UNC_PENDING_REVIEW;
      await db.holdingDeposit.update({
        where: { id: dep.id },
        data: { paymentStatus: isUncReview ? DepositStatus.QR_EXPIRED : DepositStatus.FORFEITED },
      });

      if (dep.viewingId && !isUncReview) {
        await db.viewing.update({
          where: { id: dep.viewingId },
          data: {
            status: ViewingStatus.COMPLETED,
            closedReason: 'hold_expired',
          },
        });
      }

      await db.auditLog.create({
        data: {
          actorId: dep.viewing?.tenantId || (await this.systemActorId(db)),
          actorRole: 'system',
          actionType: isUncReview ? 'DEPOSIT_UNC_EXPIRED' : 'HOLD_EXPIRED',
          entityName: 'HoldingDeposit',
          entityId: dep.id,
          newValue: {
            expiredAt: now.toISOString(),
            previousExpiresAt: dep.expiresAt?.toISOString(),
          },
        },
      });
    }

    const activeDeposits = await db.holdingDeposit.findMany({
      where: {
        unitId,
        paymentStatus: { in: [DepositStatus.PAID_HOLDING, DepositStatus.UNC_PENDING_REVIEW] },
        expiresAt: { gt: now },
      },
      select: { id: true },
      take: 1,
    });
    if (!activeDeposits.length) {
      await db.unit.updateMany({
        where: { id: unitId, status: UnitStatus.HOLDING },
        data: { status: UnitStatus.AVAILABLE },
      });
    }
  }

  async uploadHostReceipt(depositId: string, dto: UploadHostReceiptDto, profileId: string) {
    const host = await this.prisma.fieldHost.findUnique({
      where: { profileId },
      select: { id: true, roles: true },
    });
    if (!host || !host.roles.includes(HostRole.SALE)) {
      throw new ForbiddenException('Chỉ Field Host phụ trách bán hàng mới được tải UNC.');
    }

    const tempHoldUntil = new Date(Date.now() + 30 * 60 * 1000);
    let result: { id: string; status: DepositStatus; tempHoldUntil: Date };
    try {
      result = await this.prisma.$transaction(async (tx) => {
      const deposit = await tx.holdingDeposit.findUnique({
        where: { id: depositId },
        include: { unit: true, viewing: { include: { tickets: true } } },
      });
      if (!deposit) throw new NotFoundException('Không tìm thấy khoản cọc.');
      if (deposit.paymentStatus !== DepositStatus.PENDING_PAYMENT) {
        throw new ConflictException('Chỉ nhận UNC cho khoản cọc đang chờ thanh toán.');
      }

      const assigned = deposit.attributedHostId === host.id || deposit.viewing.tickets.some(
        (ticket: any) =>
          ticket.hostId === host.id &&
          [TicketStatus.ACCEPTED, TicketStatus.CHECKED, TicketStatus.COMPLETED].includes(ticket.status),
      );
      if (!assigned) throw new ForbiddenException('Khoản cọc này không thuộc lịch được phân công cho bạn.');

      await this.expireIfDue(deposit.unitId, tx);
      const unit = await tx.unit.findUnique({ where: { id: deposit.unitId } });
      if (!unit || unit.status !== UnitStatus.AVAILABLE) {
        throw new ConflictException('Căn hộ đã được giữ chỗ hoặc không còn trống.');
      }
      const claimed = await tx.unit.updateMany({
        where: { id: deposit.unitId, status: UnitStatus.AVAILABLE },
        data: { status: UnitStatus.HOLDING },
      });
      if (claimed.count !== 1) throw new ConflictException('Căn hộ vừa được giữ chỗ bởi giao dịch khác.');

      await tx.holdingDeposit.update({
        where: { id: depositId },
        data: { paymentStatus: DepositStatus.UNC_PENDING_REVIEW, expiresAt: tempHoldUntil },
      });
      await tx.auditLog.create({
        data: {
          actorId: profileId,
          actorRole: 'field_host',
          actionType: 'DEPOSIT_UNC_UPLOADED',
          entityName: 'holding_deposits',
          entityId: depositId,
          oldValue: { paymentStatus: DepositStatus.PENDING_PAYMENT },
          newValue: {
            paymentStatus: DepositStatus.UNC_PENDING_REVIEW,
            receiptUrl: dto.receiptUrl,
            note: dto.note?.trim() || null,
            tempHoldUntil: tempHoldUntil.toISOString(),
          },
        },
      });
      return { id: depositId, status: DepositStatus.UNC_PENDING_REVIEW, tempHoldUntil };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (isSerializationConflict(error)) {
        throw new ConflictException('Căn hộ hoặc khoản cọc vừa được giao dịch khác xử lý. Vui lòng tải lại.');
      }
      throw error;
    }

    this.logger.log(`[HOST RECEIPT] Stored UNC review request for deposit ${depositId}.`);
    return {
      success: true,
      depositId: result.id,
      status: result.status,
      tempHoldUntil: result.tempHoldUntil.toISOString(),
      message: 'Đã lưu UNC để Admin đối soát; căn được giữ tạm trong 30 phút.',
    };
  }
}
