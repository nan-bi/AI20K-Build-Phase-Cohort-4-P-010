import { Injectable } from '@nestjs/common';
import { TicketStatus, ViewingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneService } from '../auth/phone/phone.service';
import { vnDayRange } from '../dispatch/dispatch-assigner.service';
import { inZone, ticketTierAt } from '../dispatch/ticket-tier';
import { toSummary, toTicketCard, UNIT_INCLUDE } from './host-viewings.mappers';
import type { HostActor, HostBoard, TicketCard } from './host-viewings.types';

const DAY_MS = 24 * 3600 * 1000;
const SCHEDULE_STATUSES: ViewingStatus[] = [
  ViewingStatus.CONFIRMED,
  ViewingStatus.LOBBY,
  ViewingStatus.RECEIVING,
  ViewingStatus.VIEWING,
  ViewingStatus.CLOSING,
  ViewingStatus.HOLDING,
];
const HISTORY_LIMIT = 30;

/** `GET /host/board` — một request cho cả 3 tab (DB ở xa, RTT cao): yêu cầu mới + ca của tôi chạy song song. */
@Injectable()
export class HostBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
  ) {}

  async board(host: HostActor, now: Date = new Date()): Promise<HostBoard> {
    const [offered, mine] = await Promise.all([
      this.prisma.dispatchTicket.findMany({
        relationLoadStrategy: 'join',
        where: {
          status: TicketStatus.OFFERED,
          offeredAt: { gte: new Date(now.getTime() - DAY_MS) },
          viewing: {
            status: ViewingStatus.PENDING_CONFIRMATION,
            // Ca tôi đã từ chối không quay lại bảng của tôi.
            tickets: { none: { hostId: host.hostId, status: TicketStatus.ESCALATED } },
          },
        },
        include: { viewing: { include: { unit: { include: UNIT_INCLUDE } } } },
        orderBy: { offeredAt: 'asc' },
      }),
      this.prisma.dispatchTicket.findMany({
        relationLoadStrategy: 'join',
        where: {
          hostId: host.hostId,
          acceptedAt: { not: null },
          status: { in: [TicketStatus.ACCEPTED, TicketStatus.COMPLETED] },
        },
        include: { viewing: { include: { unit: { include: UNIT_INCLUDE } } } },
        orderBy: { acceptedAt: 'desc' },
        take: 200,
      }),
    ]);

    // ASSIGNED của tôi trước (sắp theo hạn SLA gần nhất), rồi pool theo thời điểm chào (DB đã sắp offeredAt tăng dần).
    const assigned: TicketCard[] = [];
    const pooled: TicketCard[] = [];
    for (const t of offered) {
      const tier = ticketTierAt(t, now);
      const own = t.hostId === host.hostId;
      if (tier === 'ASSIGNED') {
        if (own) assigned.push(toTicketCard(t, tier, { canAccept: true, canClaim: false }, this.phones));
        continue; // ASSIGNED của Sale khác không lộ
      }
      if (tier === 'ZONE_POOL' && !own && !inZone(host.assignedZone, t.viewing.unit.building.zoneName)) continue;
      pooled.push(toTicketCard(t, tier, { canAccept: false, canClaim: true }, this.phones));
    }
    const requests = [...assigned, ...pooled];

    const schedule = mine
      .filter((t) => SCHEDULE_STATUSES.includes(t.viewing.status))
      .map((t) => toSummary(t.viewing))
      .sort((a, b) => a.slot.localeCompare(b.slot));
    const history = mine
      .filter((t) => !SCHEDULE_STATUSES.includes(t.viewing.status))
      .map((t) => toSummary(t.viewing))
      .sort((a, b) => b.slot.localeCompare(a.slot))
      .slice(0, HISTORY_LIMIT);

    const today = vnDayRange(now);
    const recent = mine.filter((t) => t.acceptedAt && now.getTime() - t.acceptedAt.getTime() <= 30 * DAY_MS);
    const waits = recent.map((t) => (t.acceptedAt!.getTime() - t.offeredAt.getTime()) / 1000);

    return {
      requests,
      schedule,
      history,
      lobbyNow: schedule.find((s) => s.status === 'lobby')?.ref ?? null,
      kpis: {
        pending: requests.length,
        today: schedule.filter((s) => {
          const at = new Date(s.slot);
          return at >= today.from && at < today.to;
        }).length,
        avgAcceptSeconds: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
        rating: host.rating,
        ratedCount: recent.filter((t) => t.viewing.tenantRating != null).length,
      },
      dutyStatus: host.dutyStatus,
      serverTime: now.toISOString(),
    };
  }
}
