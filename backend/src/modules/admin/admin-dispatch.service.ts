import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminActor } from './admin-fee.service';
import { EscalateTicketDto, ReassignBookingDto } from './dto/admin.dto';

// SLA theo tầng (SAD_v2 §6.2): T1 300s, T2 180s; T3 (broadcast Area Lead) dùng 180s — đã chốt.
const TIER_SLA_SECONDS: Record<number, number> = { 1: 300, 2: 180, 3: 180 };
const MAX_TIER = 3;
const REASSIGNABLE = ['OFFERED', 'EXPIRED', 'ESCALATED'];
const ESCALATABLE = ['OFFERED', 'EXPIRED'];
const OPEN_VIEWING = ['PENDING_CONFIRMATION', 'CONFIRMED'];

function requireReason(reason?: string): string {
  const r = (reason ?? '').trim();
  if (!r) throw new BadRequestException('Bắt buộc nhập lý do can thiệp.');
  return r;
}

@Injectable()
export class AdminDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private breach(t: any, now: Date) {
    const deadline = new Date(new Date(t.offeredAt).getTime() + t.slaSeconds * 1000);
    const overdue = t.status === 'OFFERED' ? Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / 1000)) : 0;
    return { deadlineAt: deadline.toISOString(), secondsOverdue: overdue, isBreached: overdue > 0 };
  }

  private loadTickets() {
    return this.prisma.dispatchTicket.findMany({
      include: {
        host: { include: { profile: true } },
        viewing: { include: { unit: { include: { building: true } } } },
      },
      orderBy: { offeredAt: 'desc' },
    });
  }

  async getSlaMonitoring(now: Date = new Date()) {
    const tickets: any[] = await this.loadTickets();
    return tickets.map((t) => ({
      ticketId: t.id,
      viewingId: t.viewingId,
      bookingRef: t.viewing.bookingRefCode,
      viewingSlot: t.viewing?.viewingSlot ? new Date(t.viewing.viewingSlot).toISOString() : new Date().toISOString(),
      viewingStatus: t.viewing.status,
      unitCode: t.viewing.unit.unitCode,
      building: t.viewing.unit.building.buildingCode,
      hostId: t.hostId,
      hostName: t.host?.profile?.fullName || 'Chưa gán Host',
      tier: t.tier,
      slaSeconds: t.slaSeconds,
      status: t.status,
      offeredAt: new Date(t.offeredAt).toISOString(),
      ...this.breach(t, now),
    }));
  }

  async getSlaSummary(now: Date = new Date()) {
    const tickets: any[] = await this.loadTickets();
    const byTier: Record<string, Record<string, number>> = {};
    let breachedCount = 0;
    for (const t of tickets) {
      const row = (byTier[String(t.tier)] ??= {
        total: 0, offered: 0, accepted: 0, expired: 0, escalated: 0, breached: 0,
      });
      row.total += 1;
      const key = String(t.status).toLowerCase();
      if (key in row) row[key] += 1;
      if (this.breach(t, now).isBreached) {
        row.breached += 1;
        breachedCount += 1;
      }
    }
    return { byTier, breachedCount };
  }

  async reassign(viewingId: string, dto: ReassignBookingDto, actor: AdminActor, now: Date = new Date()) {
    const reason = requireReason(dto.reason);
    const ticket: any = await this.prisma.dispatchTicket.findFirst({
      where: { viewingId },
      orderBy: { offeredAt: 'desc' },
      include: { viewing: true },
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket điều phối cho lịch xem này.');
    if (!REASSIGNABLE.includes(ticket.status)) {
      throw new ConflictException(`Ticket đang ở trạng thái ${ticket.status}, không thể giao lại.`);
    }
    if (!OPEN_VIEWING.includes(ticket.viewing?.status)) {
      throw new ConflictException('Lịch xem đã kết thúc hoặc bị hủy, không thể giao lại.');
    }
    if (ticket.hostId === dto.hostId) throw new BadRequestException('Host mới trùng Host hiện tại.');
    const host: any = await this.prisma.fieldHost.findUnique({ where: { id: dto.hostId } });
    if (!host) throw new NotFoundException('Không tìm thấy Field Host.');
    if (host.dutyStatus !== 'ONLINE_AVAILABLE') throw new ConflictException('Field Host không ở trạng thái sẵn sàng.');

    const old = { hostId: ticket.hostId, status: ticket.status, tier: ticket.tier };
    await this.prisma.$transaction(async (tx: any) => {
      await tx.dispatchTicket.update({
        where: { id: ticket.id },
        data: { hostId: dto.hostId, status: 'OFFERED', offeredAt: now, acceptedAt: null },
      });
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DISPATCH_REASSIGNED',
      entityName: 'DispatchTicket',
      entityId: ticket.id,
      oldValue: old,
      newValue: { hostId: dto.hostId, status: 'OFFERED', reason },
    } as any);
    return {
      success: true,
      bookingId: viewingId,
      ticketId: ticket.id,
      newHostId: dto.hostId,
      reassignedAt: now.toISOString(),
      message: 'Đã điều phối lịch xem sang Field Host mới.',
    };
  }

  async escalate(ticketId: string, dto: EscalateTicketDto, actor: AdminActor, now: Date = new Date()) {
    const reason = requireReason(dto.reason);
    const ticket: any = await this.prisma.dispatchTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket điều phối.');
    if (!ESCALATABLE.includes(ticket.status)) {
      throw new ConflictException(`Ticket đang ở trạng thái ${ticket.status}, không thể leo thang.`);
    }
    if (ticket.tier >= MAX_TIER) throw new ConflictException('Ticket đã ở tầng cao nhất, không thể leo thêm.');

    const tier = ticket.tier + 1;
    const old = { tier: ticket.tier, status: ticket.status, hostId: ticket.hostId };
    await this.prisma.$transaction(async (tx: any) => {
      await tx.dispatchTicket.update({
        where: { id: ticket.id },
        data: { tier, status: 'ESCALATED', hostId: null, slaSeconds: TIER_SLA_SECONDS[tier], offeredAt: now },
      });
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DISPATCH_ESCALATED',
      entityName: 'DispatchTicket',
      entityId: ticket.id,
      oldValue: old,
      newValue: { tier, status: 'ESCALATED', reason },
    } as any);
    return { ticketId: ticket.id, tier, status: 'ESCALATED', slaSeconds: TIER_SLA_SECONDS[tier] };
  }
}
