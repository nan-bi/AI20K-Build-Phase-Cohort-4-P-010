import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminActor } from './admin-fee.service';

const HOUR_MS = 3_600_000;
const HOLD_HOURS_KEY = 'hold_hours_default';
const HOLD_HOURS_DEFAULT = 48;

function isSerializationConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2034');
}

@Injectable()
export class AdminDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listDeposits(q: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
    const where: any = q.status ? { paymentStatus: q.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.holdingDeposit.findMany({
        where,
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      } as any) as Promise<any[]>,
      this.prisma.holdingDeposit.count({ where }),
    ]);
    const uncIds = rows.filter((d) => d.paymentStatus === 'UNC_PENDING_REVIEW').map((d) => d.id);
    const uncUploads = uncIds.length
      ? await this.prisma.auditLog.findMany({
          where: { entityName: 'holding_deposits', entityId: { in: uncIds }, actionType: 'DEPOSIT_UNC_UPLOADED' },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const uploadByDeposit = new Map<string, any>();
    for (const row of uncUploads) {
      if (!uploadByDeposit.has(row.entityId)) uploadByDeposit.set(row.entityId, row.newValue);
    }

    return {
      items: rows.map((d) => {
        const upload = uploadByDeposit.get(d.id);
        return {
          id: d.id,
          depositCode: d.depositCode,
          unitCode: d.unit?.unitCode,
          amount: String(d.amount),
          paymentStatus: d.paymentStatus,
          paidAt: d.paidAt,
          expiresAt: d.expiresAt,
          attributedHostId: d.attributedHostId ?? null,
          receiptUrl: upload?.receiptUrl ?? null,
          receiptNote: upload?.note ?? null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async resolveUnc(
    id: string,
    dto: { decision: 'APPROVE' | 'REJECT'; reason: string },
    actor: AdminActor,
    now: Date = new Date(),
  ) {
    if (!dto.reason?.trim()) throw new BadRequestException('Cần nhập lý do');
    if (dto.decision !== 'APPROVE' && dto.decision !== 'REJECT') {
      throw new BadRequestException('decision phải là APPROVE hoặc REJECT');
    }

    let result: any;
    try {
      result = await this.prisma.$transaction(async (tx: any) => {
      const dep = await tx.holdingDeposit.findUnique({ where: { id }, include: { unit: true } });
      if (!dep) throw new NotFoundException('Không tìm thấy cọc');
      if (dep.paymentStatus !== 'UNC_PENDING_REVIEW') {
        throw new ConflictException(`Cọc đang ở trạng thái ${dep.paymentStatus}, không thể xử lý UNC`);
      }

      if (dep.expiresAt && dep.expiresAt <= now) {
        await tx.holdingDeposit.update({ where: { id }, data: { paymentStatus: 'QR_EXPIRED' } });
        await this.releaseUnitIfNoActiveHold(tx, dep.unit?.id, id, now);
        return { dep, next: 'QR_EXPIRED', action: 'DEPOSIT_UNC_EXPIRED', expired: true };
      }

      if (dto.decision === 'REJECT') {
        await tx.holdingDeposit.update({ where: { id }, data: { paymentStatus: 'QR_EXPIRED' } });
        await this.releaseUnitIfNoActiveHold(tx, dep.unit?.id, id, now);
        return { dep, next: 'QR_EXPIRED', action: 'DEPOSIT_UNC_REJECTED' };
      }

      if (!dep.unit || (dep.unit.status !== 'AVAILABLE' && dep.unit.status !== 'HOLDING')) {
        throw new ConflictException('Căn hộ không còn khả dụng để duyệt UNC.');
      }
      if (dep.unit.status === 'HOLDING' && (!dep.expiresAt || dep.expiresAt <= now)) {
        throw new ConflictException('Căn hộ đang được giữ bởi một giao dịch khác hoặc trạng thái giữ đã hết hạn.');
      }
      const competing = await tx.holdingDeposit.findMany({
        where: {
          unitId: dep.unit.id,
          id: { not: id },
          paymentStatus: { in: ['UNC_PENDING_REVIEW', 'PAID_HOLDING'] },
          expiresAt: { gt: now },
        },
        select: { id: true },
      });
      if (competing.length) {
        throw new ConflictException('Căn hộ đã có khoản cọc khác đang được giữ trước.');
      }
      if (dep.unit.status === 'AVAILABLE') {
        const claimed = await tx.unit.updateMany({
          where: { id: dep.unit.id, status: 'AVAILABLE' },
          data: { status: 'HOLDING' },
        });
        if (claimed.count !== 1) {
          throw new ConflictException('Căn hộ vừa được giao dịch khác giữ chỗ.');
        }
      }

      const configuredHours = await tx.feeConfig.findUnique({ where: { configKey: HOLD_HOURS_KEY } });
      const requestedHours = Number(dep.holdHours ?? dep.unit.holdHoursOverride ?? configuredHours?.paramValue ?? HOLD_HOURS_DEFAULT);
      const holdHours = Math.min(72, Math.max(12, Math.round(requestedHours)));
      await tx.holdingDeposit.update({
        where: { id },
        data: { paymentStatus: 'PAID_HOLDING', paidAt: now, holdHours, expiresAt: new Date(now.getTime() + holdHours * HOUR_MS) },
      });
      return { dep, next: 'PAID_HOLDING', action: 'DEPOSIT_UNC_APPROVED', expired: false };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (isSerializationConflict(error)) {
        throw new ConflictException('Căn hộ hoặc khoản cọc vừa được xử lý bởi giao dịch khác. Vui lòng tải lại.');
      }
      throw error;
    }

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: result.action,
      entityName: 'holding_deposits',
      entityId: id,
      oldValue: { paymentStatus: 'UNC_PENDING_REVIEW' },
      newValue: { paymentStatus: result.next, reason: result.expired ? 'Hết 30 phút giữ tạm' : dto.reason },
    } as any);

    if (result.expired) throw new ConflictException('Yêu cầu UNC đã hết thời gian giữ tạm 30 phút.');

    return { id, paymentStatus: result.next };
  }

  private async releaseUnitIfNoActiveHold(tx: any, unitId: string | undefined, exceptDepositId: string, now: Date) {
    if (!unitId) return;
    const otherActiveHolds = await tx.holdingDeposit.findMany({
      where: {
        unitId,
        id: { not: exceptDepositId },
        paymentStatus: { in: ['UNC_PENDING_REVIEW', 'PAID_HOLDING'] },
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (!otherActiveHolds.length) {
      await tx.unit.updateMany({ where: { id: unitId, status: 'HOLDING' }, data: { status: 'AVAILABLE' } });
    }
  }

  // Chỉ ghi nhận yêu cầu; hoàn/tịch thu cọc là chính sách chưa chốt (ADMIN_OPEN_QUESTIONS).
  async voidHold(id: string, dto: { reason: string; note: string }, actor: AdminActor) {
    const dep: any = await this.prisma.holdingDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException('Không tìm thấy cọc');
    if (dep.paymentStatus !== 'PAID_HOLDING') {
      throw new ConflictException(`Chỉ áp dụng cho cọc PAID_HOLDING (hiện: ${dep.paymentStatus})`);
    }
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DEPOSIT_VOID_REQUESTED',
      entityName: 'holding_deposits',
      entityId: id,
      oldValue: { paymentStatus: dep.paymentStatus },
      newValue: { reason: dto.reason, note: dto.note },
    } as any);
    return {
      success: true,
      depositId: id,
      status: dep.paymentStatus,
      reason: dto.reason,
      note: dto.note,
      message: 'Đã ghi nhận yêu cầu hủy cọc; phương án xử lý tiền cọc chờ Ops quyết định.',
    };
  }

  async getContracts() {
    const rows: any[] = (await this.prisma.contract.findMany({
      include: { unit: true, tenant: true, landlord: true },
      orderBy: { createdAt: 'desc' },
    } as any)) as any;
    return rows.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      unitCode: c.unit?.unitCode,
      tenantName: c.tenant?.fullName,
      landlordName: c.landlord?.fullName,
      monthlyRentPrice: String(c.monthlyRentPrice),
      securityDepositAmount: String(c.securityDepositAmount),
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
    }));
  }
}
