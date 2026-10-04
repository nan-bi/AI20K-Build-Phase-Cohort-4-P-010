import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { PhoneService } from '../auth/phone/phone.service';
import { ActionTokenService } from '../auth/otp/action-token.service';
import { authError } from '../auth/auth.errors';
import {
  CreateBookingDto,
  CancelBookingDto,
  RescheduleBookingDto,
  RateBookingDto,
} from './dto/booking.dto';
import { ViewingStatus, UnitStatus, TicketStatus } from '@prisma/client';
import { DispatchAssignerService } from '../dispatch/dispatch-assigner.service';
import { ViewingFlowService } from '../host-viewings/viewing-flow.service';
import type { HostActor } from '../host-viewings/host-viewings.types';
import { toTenantBooking, statusToWeb } from '../tenant/tenant.mappers';
import { TenantBooking } from '../tenant/tenant.types';
import { isValidSlotTimeVN } from '../tenant/slots.helper';

function generateBookingRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VS-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingAccess: BookingAccessService,
    private readonly phones: PhoneService,
    private readonly actionTokens: ActionTokenService,
    private readonly assigner: DispatchAssignerService,
    private readonly flow: ViewingFlowService,
  ) {}

  /**
   * A6: Đặt lịch xem phòng (bắt buộc vai tenant).
   */
  async createBooking(user: { id: string }, dto: CreateBookingDto): Promise<TenantBooking> {
    // 1. Kiểm tra khung giờ xem phòng
    const slotDate = new Date(dto.slot);
    const now = Date.now();
    if (isNaN(slotDate.getTime()) || !isValidSlotTimeVN(slotDate)) {
      throw new UnprocessableEntityException({
        message: 'Khung giờ đặt lịch không thuộc SLOT_TIMES khả dụng (08:30–11:30, 14:30–17:30).',
        code: 'slot_invalid',
      });
    }

    const leadMs = slotDate.getTime() - now;
    if (leadMs < 30 * 60 * 1000) {
      throw new UnprocessableEntityException({
        message: 'Chỉ được đặt lịch xem phòng trước giờ xem tối thiểu 30 phút.',
        code: 'slot_invalid',
      });
    }

    if (leadMs > 14 * 24 * 60 * 60 * 1000) {
      throw new UnprocessableEntityException({
        message: 'Chỉ được đặt lịch xem phòng trong cửa sổ tối đa 14 ngày tới.',
        code: 'slot_invalid',
      });
    }

    // 2. Kiểm tra căn hộ
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        dto.unitCode,
      );
    const unit = await this.prisma.unit.findFirst({
      where: {
        ...(isUuid
          ? {
              OR: [
                { unitCode: { equals: dto.unitCode, mode: 'insensitive' } },
                { id: dto.unitCode },
              ],
            }
          : { unitCode: { equals: dto.unitCode, mode: 'insensitive' } }),
        isVerified: true,
        media: { some: {} },
      },
      include: { building: true },
    });

    if (!unit) {
      throw new NotFoundException({
        message: 'Không tìm thấy căn hộ hoặc căn hộ không còn khả dụng.',
        code: 'unit_not_found',
      });
    }

    if (unit.status !== UnitStatus.AVAILABLE) {
      throw new ConflictException({
        message: 'Căn hộ hiện không ở trạng thái sẵn sàng để đặt lịch xem.',
        code: 'unit_not_available',
      });
    }

    // 3. Kiểm tra trùng slot với viewing sống khác của cùng căn
    const conflictViewing = await this.prisma.viewing.findFirst({
      where: {
        unitId: unit.id,
        viewingSlot: slotDate,
        status: {
          in: [
            ViewingStatus.PENDING_CONFIRMATION,
            ViewingStatus.CONFIRMED,
            ViewingStatus.LOBBY,
            ViewingStatus.RECEIVING,
            ViewingStatus.VIEWING,
            ViewingStatus.CLOSING,
          ],
        },
      },
    });

    if (conflictViewing) {
      throw new ConflictException({
        message: 'Khung giờ này vừa có người đặt xem phòng.',
        code: 'slot_taken',
      });
    }

    // 4. Xác thực số điện thoại
    const normPhone = this.phones.normalize(dto.phone);
    if (!normPhone) {
      throw new BadRequestException({
        message: 'Số điện thoại không đúng định dạng Việt Nam.',
        code: 'invalid_request',
      });
    }

    if (dto.actionToken) {
      const payload = await this.actionTokens.redeem(dto.actionToken, 'TENANT_VIEWING');
      const payloadNorm = this.phones.normalize(payload.phone);
      if (payloadNorm !== normPhone) {
        throw authError('action_token_invalid');
      }
    } else {
      const profile = await this.prisma.profile.findUnique({ where: { id: user.id } });
      const expectedHash = this.phones.hash(normPhone);
      if (!profile?.isPhoneVerified || profile.phoneHash !== expectedHash) {
        throw new ForbiddenException({
          message: 'Vui lòng xác thực số điện thoại qua OTP trước khi đặt lịch.',
          code: 'otp_required',
        });
      }
    }

    // 5. Gắn SĐT vào hồ sơ nếu hồ sơ chưa có SĐT
    const profile = await this.prisma.profile.findUnique({ where: { id: user.id } });
    if (profile && !profile.phoneHash) {
      const targetHash = this.phones.hash(normPhone);
      const phoneTaken = await this.prisma.profile.findFirst({
        where: { phoneHash: targetHash, NOT: { id: user.id } },
      });
      if (phoneTaken) {
        throw authError('phone_already_registered');
      }

      await this.prisma.profile.update({
        where: { id: user.id },
        data: {
          phoneEnc: this.phones.encrypt(normPhone),
          phoneHash: targetHash,
          isPhoneVerified: true,
        },
      });
    }

    // 6. Sinh bookingRefCode duy nhất (VS-XXXXX)
    let refCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateBookingRefCode();
      const existing = await this.prisma.viewing.findUnique({
        where: { bookingRefCode: candidate },
        select: { id: true },
      });
      if (!existing) {
        refCode = candidate;
        break;
      }
    }
    if (!refCode) {
      refCode = `VS-${Date.now().toString().slice(-5)}`;
    }

    const contactPhoneEnc = this.phones.encrypt(normPhone);
    const contactPhoneHash = this.phones.hash(normPhone);

    // 7. Tạo Viewing và điều phối trong transaction
    const createdViewing = await this.prisma.$transaction(async (tx) => {
      // Re-check conflict
      const reCheck = await tx.viewing.findFirst({
        where: {
          unitId: unit.id,
          viewingSlot: slotDate,
          status: {
            in: [
              ViewingStatus.PENDING_CONFIRMATION,
              ViewingStatus.CONFIRMED,
              ViewingStatus.LOBBY,
              ViewingStatus.RECEIVING,
              ViewingStatus.VIEWING,
              ViewingStatus.CLOSING,
            ],
          },
        },
      });
      if (reCheck) {
        throw new ConflictException({
          message: 'Khung giờ này vừa có người đặt xem phòng.',
          code: 'slot_taken',
        });
      }

      const v = await tx.viewing.create({
        data: {
          bookingRefCode: refCode,
          unitId: unit.id,
          tenantId: user.id,
          contactName: dto.contactName.trim(),
          contactPhoneEnc,
          contactPhoneHash,
          partySize: dto.partySize || 1,
          tenantNote: dto.note?.trim() || null,
          viewingSlot: slotDate,
          status: ViewingStatus.PENDING_CONFIRMATION,
        },
      });

      // Điều phối (hồ sơ 15): Sale đúng vai/phân khu/đang trực/không trùng lịch; không ai ⇒ ticket vào Open Pool.
      await this.assigner.offer(tx, {
        viewingId: v.id,
        zoneName: unit.building.zoneName,
        slot: slotDate,
      });

      return v;
    });

    const fullViewing = await this.bookingAccess.loadOwned(createdViewing.bookingRefCode, user);
    return toTenantBooking(fullViewing, { rawPhone: normPhone });
  }

  /**
   * A7: Danh sách lịch hẹn xem phòng của tenant đang đăng nhập.
   */
  async getMyBookings(user: { id: string }): Promise<TenantBooking[]> {
    const viewings = await this.prisma.viewing.findMany({
      where: { tenantId: user.id },
      include: {
        unit: {
          include: {
            building: true,
            media: true,
          },
        },
        tenant: true,
        tickets: {
          include: {
            host: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: { offeredAt: 'asc' },
        },
        deposit: {
          include: {
            identity: true,
            contract: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return viewings.map((v) => {
      let rawPhone: string | undefined = undefined;
      if (v.contactPhoneEnc) {
        try {
          rawPhone = this.phones.decrypt(v.contactPhoneEnc);
        } catch {
          rawPhone = undefined;
        }
      }
      return toTenantBooking(v, { rawPhone });
    });
  }

  /**
   * A8: Chi tiết lịch hẹn xem phòng theo mã ref.
   */
  async getBookingByRef(ref: string, user: { id: string }): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    let rawPhone: string | undefined = undefined;
    if (viewing.contactPhoneEnc) {
      try {
        rawPhone = this.phones.decrypt(viewing.contactPhoneEnc);
      } catch {
        rawPhone = undefined;
      }
    }
    return toTenantBooking(viewing, { rawPhone });
  }

  /**
   * A9: Hủy lịch hẹn xem phòng.
   */
  async cancelBooking(ref: string, user: { id: string }, dto: CancelBookingDto): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    if (
      viewing.status !== ViewingStatus.PENDING_CONFIRMATION &&
      viewing.status !== ViewingStatus.CONFIRMED
    ) {
      throw new ConflictException({
        message: 'Không thể hủy lịch hẹn ở trạng thái hiện tại.',
        code: 'bad_status',
        expected: 'pending|confirmed',
        actual: statusToWeb(viewing.status),
      });
    }

    const leadMs = new Date(viewing.viewingSlot).getTime() - Date.now();
    if (leadMs < 2 * 60 * 60 * 1000) {
      throw new ConflictException({
        message: 'Chỉ được hủy lịch hẹn trước giờ xem tối thiểu 2 giờ.',
        code: 'too_late_to_modify',
      });
    }

    await this.prisma.$transaction([
      this.prisma.viewing.update({
        where: { id: viewing.id },
        data: {
          status: ViewingStatus.CANCELLED,
          closedReason: dto.reason.trim(),
        },
      }),
      this.prisma.dispatchTicket.updateMany({
        where: {
          viewingId: viewing.id,
          status: { in: [TicketStatus.OFFERED, TicketStatus.ACCEPTED] },
        },
        data: { status: TicketStatus.CANCELLED, closedAt: new Date() },
      }),
    ]);

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  /**
   * A10: Đổi khung giờ xem phòng.
   */
  async rescheduleBooking(ref: string, user: { id: string }, dto: RescheduleBookingDto): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    if (
      viewing.status !== ViewingStatus.PENDING_CONFIRMATION &&
      viewing.status !== ViewingStatus.CONFIRMED
    ) {
      throw new ConflictException({
        message: 'Không thể đổi lịch hẹn ở trạng thái hiện tại.',
        code: 'bad_status',
      });
    }

    const leadMs = new Date(viewing.viewingSlot).getTime() - Date.now();
    if (leadMs < 2 * 60 * 60 * 1000) {
      throw new ConflictException({
        message: 'Chỉ được đổi lịch hẹn trước giờ xem tối thiểu 2 giờ.',
        code: 'too_late_to_modify',
      });
    }

    const newSlot = new Date(dto.slot);
    if (isNaN(newSlot.getTime()) || !isValidSlotTimeVN(newSlot)) {
      throw new UnprocessableEntityException({
        message: 'Khung giờ mới không thuộc SLOT_TIMES hợp lệ.',
        code: 'slot_invalid',
      });
    }

    const newLeadMs = newSlot.getTime() - Date.now();
    if (newLeadMs < 30 * 60 * 1000 || newLeadMs > 14 * 24 * 60 * 60 * 1000) {
      throw new UnprocessableEntityException({
        message: 'Khung giờ mới phải cách hiện tại ít nhất 30 phút và trong vòng 14 ngày.',
        code: 'slot_invalid',
      });
    }

    // Check conflict (trừ chính viewing này)
    const conflict = await this.prisma.viewing.findFirst({
      where: {
        unitId: viewing.unitId,
        viewingSlot: newSlot,
        id: { not: viewing.id },
        status: {
          in: [
            ViewingStatus.PENDING_CONFIRMATION,
            ViewingStatus.CONFIRMED,
            ViewingStatus.LOBBY,
            ViewingStatus.RECEIVING,
            ViewingStatus.VIEWING,
            ViewingStatus.CLOSING,
          ],
        },
      },
    });

    if (conflict) {
      throw new ConflictException({
        message: 'Khung giờ mới đã có người đặt trước.',
        code: 'slot_taken',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.viewing.update({
        where: { id: viewing.id },
        data: {
          viewingSlot: newSlot,
          rescheduleCount: { increment: 1 },
          status: ViewingStatus.PENDING_CONFIRMATION,
          confirmedAt: null,
        },
      });

      // Hủy ticket cũ và điều phối lại
      await tx.dispatchTicket.updateMany({
        where: {
          viewingId: viewing.id,
          status: { in: [TicketStatus.OFFERED, TicketStatus.ACCEPTED] },
        },
        data: { status: TicketStatus.CANCELLED, closedAt: new Date() },
      });

      await this.assigner.offer(tx, {
        viewingId: viewing.id,
        zoneName: viewing.unit.building.zoneName,
        slot: newSlot,
      });
    });

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  /**
   * A11: Xin trễ 10 phút.
   */
  async requestLate(ref: string, user: { id: string }): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    if (viewing.status !== ViewingStatus.CONFIRMED) {
      throw new ConflictException({
        message: 'Chỉ có thể xin trễ khi lịch hẹn đã được xác nhận.',
        code: 'bad_status',
      });
    }

    if (!viewing.lateRequestedAt) {
      await this.prisma.viewing.update({
        where: { id: viewing.id },
        data: { lateRequestedAt: new Date() },
      });
    }

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  /**
   * A12: Check-in tại sảnh.
   */
  async lobbyCheckIn(ref: string, user: { id: string }): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    if (viewing.status !== ViewingStatus.CONFIRMED) {
      throw new ConflictException({
        message: 'Chỉ có thể check-in sảnh khi lịch hẹn đã được xác nhận.',
        code: 'bad_status',
      });
    }

    await this.prisma.viewing.update({
      where: { id: viewing.id },
      data: {
        status: ViewingStatus.LOBBY,
        lobbyCheckInAt: new Date(),
      },
    });

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  /**
   * A13: Đánh giá chất lượng phục vụ của Field Host.
   */
  async rateBooking(ref: string, user: { id: string }, dto: RateBookingDto): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    const allowed: ViewingStatus[] = [
      ViewingStatus.VIEWING,
      ViewingStatus.CLOSING,
      ViewingStatus.HOLDING,
      ViewingStatus.LEASED,
      ViewingStatus.COMPLETED,
    ];

    if (!allowed.includes(viewing.status)) {
      throw new ConflictException({
        message: 'Không thể đánh giá Field Host ở trạng thái này.',
        code: 'bad_status',
      });
    }

    if (viewing.tenantRating !== null && viewing.tenantRating !== undefined) {
      throw new ConflictException({
        message: 'Lịch hẹn này đã được đánh giá.',
        code: 'already_rated',
      });
    }

    await this.prisma.viewing.update({
      where: { id: viewing.id },
      data: { tenantRating: Math.round(dto.stars) },
    });

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  async demoBankPaid(ref: string, user: { id: string }): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      // Cập nhật hoặc tạo cọc nếu chưa có
      if (viewing.deposit) {
        await tx.holdingDeposit.update({
          where: { id: viewing.deposit.id },
          data: {
            paymentStatus: 'PAID_HOLDING',
            paidAt: now,
            expiresAt,
            holdHours: 48,
          },
        });
      } else {
        await tx.holdingDeposit.create({
          data: {
            depositCode: `DEP-${viewing.bookingRefCode}`,
            viewingId: viewing.id,
            unitId: viewing.unitId,
            amount: 2000000,
            vietqrRef: `VQ-DEMO-${Date.now().toString().slice(-6)}`,
            paymentStatus: 'PAID_HOLDING',
            paidAt: now,
            expiresAt,
            holdHours: 48,
          },
        });
      }

      await tx.unit.update({
        where: { id: viewing.unitId },
        data: { status: UnitStatus.HOLDING },
      });

      await tx.viewing.update({
        where: { id: viewing.id },
        data: { status: ViewingStatus.HOLDING },
      });

      // Cancel other viewings for the same unit
      await tx.viewing.updateMany({
        where: {
          unitId: viewing.unitId,
          id: { not: viewing.id },
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
          unitId: viewing.unitId,
          paymentStatus: 'PENDING_PAYMENT',
          id: viewing.deposit ? { not: viewing.deposit.id } : undefined,
        },
        data: {
          paymentStatus: 'QR_EXPIRED',
        },
      });
    });

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  async demoExpireHold(ref: string, user: { id: string }): Promise<TenantBooking> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    const past = new Date(Date.now() - 1000);

    await this.prisma.$transaction(async (tx) => {
      if (viewing.deposit) {
        await tx.holdingDeposit.update({
          where: { id: viewing.deposit.id },
          data: {
            expiresAt: past,
            paymentStatus: 'FORFEITED',
          },
        });
      }

      await tx.unit.update({
        where: { id: viewing.unitId },
        data: { status: UnitStatus.AVAILABLE },
      });

      await tx.viewing.update({
        where: { id: viewing.id },
        data: {
          status: ViewingStatus.COMPLETED,
          closedReason: 'hold_expired',
        },
      });
    });

    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  /**
   * Công cụ demo A21. Các bước phía Host đi qua `ViewingFlowService` (B7) với "Host giả lập" = chủ ticket hiện
   * tại của ca (không có ⇒ chọn Sale phù hợp; vẫn không có ⇒ 409 `no_host_available`). Bỏ ràng buộc về giờ.
   */
  async executeDemoStep(ref: string, step: string, user: { id: string }): Promise<TenantBooking> {
    switch (step) {
      case 'host-accept': {
        const { host, ticket } = await this.demoHost(ref, user, [TicketStatus.OFFERED]);
        await this.flow.claim(ticket.id, host);
        break;
      }
      case 'reminder':
        await this.flow.remind(ref, (await this.demoHost(ref, user, [TicketStatus.ACCEPTED])).host, {}, { demo: true });
        break;
      case 'host-receive':
        await this.flow.receive(ref, (await this.demoHost(ref, user, [TicketStatus.ACCEPTED])).host, {}, { demo: true });
        break;
      case 'host-view':
        // Mở cửa thật (kiểm mã, ghi audit) nhưng KHÔNG đưa mã cho khách.
        await this.flow.openDoor(ref, (await this.demoHost(ref, user, [TicketStatus.ACCEPTED])).host, {}, { demo: true });
        break;
      case 'host-start-deposit':
        await this.flow.startDeposit(ref, (await this.demoHost(ref, user, [TicketStatus.ACCEPTED])).host, {}, { demo: true });
        break;
      case 'bank-paid':
        return this.demoBankPaid(ref, user);
      case 'expire-hold':
        return this.demoExpireHold(ref, user);
      default:
        throw new BadRequestException({
          message: `Bước demo '${step}' không hợp lệ.`,
          code: 'invalid_request',
        });
    }
    const updated = await this.bookingAccess.loadOwned(ref, user);
    return toTenantBooking(updated);
  }

  private async demoHost(
    ref: string,
    user: { id: string },
    wanted: TicketStatus[],
  ): Promise<{ host: HostActor; ticket: { id: string } }> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);
    const ticket = [...(viewing.tickets ?? [])].reverse().find((t: any) => wanted.includes(t.status));
    if (!ticket) {
      throw new ConflictException({
        message: 'Lịch hẹn không ở trạng thái phù hợp cho bước demo này.',
        code: 'bad_status',
      });
    }
    let hostId: string | null = ticket.hostId;
    if (!hostId) {
      const picked = await this.assigner.pickHost(this.prisma, {
        zoneName: viewing.unit.building.zoneName,
        slot: new Date(viewing.viewingSlot),
        excludeViewingId: viewing.id,
      });
      hostId = picked?.id ?? null;
    }
    const row = hostId ? await this.prisma.fieldHost.findUnique({ where: { id: hostId } }) : null;
    if (!row) {
      throw new ConflictException({
        message: 'Không có Sale phù hợp để thao tác thay (công cụ demo).',
        code: 'no_host_available',
      });
    }
    return {
      ticket: { id: ticket.id },
      host: {
        hostId: row.id,
        profileId: row.profileId,
        assignedZone: row.assignedZone,
        rating: Number(row.rating),
        dutyStatus: row.dutyStatus,
      },
    };
  }
}
