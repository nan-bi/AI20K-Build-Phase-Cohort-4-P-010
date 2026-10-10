import { Injectable } from '@nestjs/common';
import { HostDutyStatus, HostRole, Prisma, TicketStatus, ViewingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LIVE_TICKET_STATUSES, LIVE_VIEWING_STATUSES, MIN_GAP_MIN } from './dispatch.constants';

type Db = PrismaService | Prisma.TransactionClient;

const VN_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** [00:00, 24:00) giờ Việt Nam (UTC+7, không có giờ mùa hè) chứa `at`. */
export function vnDayRange(at: Date): { from: Date; to: Date } {
  const startMs = Math.floor((at.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
  return { from: new Date(startMs), to: new Date(startMs + DAY_MS) };
}

/**
 * Chọn Sale cho một ca (dùng chung A6 tạo lịch, A8 đổi giờ, reject). Điều kiện đúng 01-CONTRACTS §4:
 * vai SALE · tài khoản đang mở · SĐT đã xác thực (Sale chưa xác thực không nhận được ca ⇒ ticket treo quá SLA) · ONLINE_AVAILABLE · cùng phân khu · không có ca trong ±45′ · không bị loại.
 * Chia đều việc: ít ca trong ngày hơn → rating cao hơn → vào hệ thống sớm hơn.
 */
@Injectable()
export class DispatchAssignerService {
  constructor(private readonly prisma: PrismaService) {}

  async pickHost(
    tx: Db,
    args: { zoneName: string; slot: Date; excludeHostIds?: string[]; excludeViewingId?: string },
  ): Promise<{ id: string } | null> {
    const gapMs = MIN_GAP_MIN * 60 * 1000;
    const candidates = await tx.fieldHost.findMany({
      where: {
        roles: { has: HostRole.SALE },
        dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
        profile: { isActive: true, isPhoneVerified: true },
        assignedZone: { contains: args.zoneName },
        ...(args.excludeHostIds?.length ? { id: { notIn: args.excludeHostIds } } : {}),
        tickets: {
          none: {
            status: { in: LIVE_TICKET_STATUSES },
            viewing: {
              status: { in: LIVE_VIEWING_STATUSES },
              viewingSlot: { gt: new Date(args.slot.getTime() - gapMs), lt: new Date(args.slot.getTime() + gapMs) },
              ...(args.excludeViewingId ? { id: { not: args.excludeViewingId } } : {}),
            },
          },
        },
      },
      select: { id: true, rating: true, createdAt: true },
    });
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return { id: candidates[0].id };

    const day = vnDayRange(args.slot);
    const loads = await tx.dispatchTicket.groupBy({
      by: ['hostId'],
      where: {
        hostId: { in: candidates.map((c) => c.id) },
        status: { in: [TicketStatus.ACCEPTED, TicketStatus.COMPLETED] },
        viewing: { viewingSlot: { gte: day.from, lt: day.to }, status: { not: ViewingStatus.CANCELLED } },
      },
      _count: { _all: true },
    });
    const load = new Map(loads.map((l) => [l.hostId as string, l._count._all]));
    const sorted = [...candidates].sort(
      (a, b) =>
        (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) ||
        Number(b.rating) - Number(a.rating) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    return { id: sorted[0].id };
  }

  /** Tạo ticket OFFERED cho một ca: tier 1 nếu có Sale phù hợp, ngược lại `hostId null, tier 2` (đi thẳng ZONE_POOL). */
  async offer(
    tx: Db,
    args: { viewingId: string; zoneName: string; slot: Date; excludeHostIds?: string[] },
  ) {
    const host = await this.pickHost(tx, {
      zoneName: args.zoneName,
      slot: args.slot,
      excludeHostIds: args.excludeHostIds,
      excludeViewingId: args.viewingId,
    });
    return tx.dispatchTicket.create({
      data: {
        viewingId: args.viewingId,
        hostId: host ? host.id : null,
        tier: host ? 1 : 2,
        slaSeconds: 180,
        status: TicketStatus.OFFERED,
      },
    });
  }
}
