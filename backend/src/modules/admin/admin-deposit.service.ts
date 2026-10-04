import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HOLD_DAYS_DEFAULT, HOLD_DAYS_KEY } from './admin-fee.service';
import type { AdminActor } from './admin-fee.service';

const DAY_MS = 86_400_000;

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
    return {
      items: rows.map((d) => ({
        id: d.id,
        depositCode: d.depositCode,
        unitCode: d.unit?.unitCode,
        amount: String(d.amount),
        paymentStatus: d.paymentStatus,
        paidAt: d.paidAt,
        expiresAt: d.expiresAt,
        attributedHostId: d.attributedHostId ?? null,
      })),
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

    const result = await this.prisma.$transaction(async (tx: any) => {
      const dep = await tx.holdingDeposit.findUnique({ where: { id }, include: { unit: true } });
      if (!dep) throw new NotFoundException('Không tìm thấy cọc');
      if (dep.paymentStatus !== 'UNC_PENDING_REVIEW') {
        throw new ConflictException(`Cọc đang ở trạng thái ${dep.paymentStatus}, không thể xử lý UNC`);
      }

      if (dto.decision === 'REJECT') {
        await tx.holdingDeposit.update({ where: { id }, data: { paymentStatus: 'QR_EXPIRED' } });
        return { dep, next: 'QR_EXPIRED', action: 'DEPOSIT_UNC_REJECTED' };
      }

      if (dep.unit?.status !== 'AVAILABLE') {
        throw new ConflictException('Căn hộ không còn AVAILABLE (đã có người cọc trước)');
      }
      const cfg = await tx.feeConfig.findUnique({ where: { configKey: HOLD_DAYS_KEY } });
      const days = cfg ? Number(cfg.paramValue) : HOLD_DAYS_DEFAULT;
      await tx.holdingDeposit.update({
        where: { id },
        data: { paymentStatus: 'PAID_HOLDING', paidAt: now, expiresAt: new Date(now.getTime() + days * DAY_MS) },
      });
      await tx.unit.update({ where: { id: dep.unit.id }, data: { status: 'HOLDING' } });
      return { dep, next: 'PAID_HOLDING', action: 'DEPOSIT_UNC_APPROVED' };
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: result.action,
      entityName: 'holding_deposits',
      entityId: id,
      oldValue: { paymentStatus: 'UNC_PENDING_REVIEW' },
      newValue: { paymentStatus: result.next, reason: dto.reason },
    } as any);

    return { id, paymentStatus: result.next };
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