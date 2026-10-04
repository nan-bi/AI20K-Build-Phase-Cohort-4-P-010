import { ASSIGNED_SLA_S, ZONE_POOL_UNTIL_S } from './dispatch.constants';

export type TicketTier = 'ASSIGNED' | 'ZONE_POOL' | 'WIDE_POOL';

/**
 * Tầng hiển thị của ticket OFFERED (01-CONTRACTS §3). Thuần hàm — tính lúc đọc để không lệch
 * giữa các instance và không cần job nền.
 *   hostId có, age < 180s            → ASSIGNED   (chỉ Sale được giao thấy / nhận)
 *   hostId có, 180s ≤ age < 360s     → ZONE_POOL  (Sale cùng phân khu)
 *   hostId null, age < 360s          → ZONE_POOL  (không ai nhận được tầng 1)
 *   age ≥ 360s                       → WIDE_POOL  (mọi Sale đang hoạt động)
 */
export function ticketTierAt(ticket: { hostId: string | null; offeredAt: Date }, now: Date): TicketTier {
  const ageS = (now.getTime() - ticket.offeredAt.getTime()) / 1000;
  if (ageS >= ZONE_POOL_UNTIL_S) return 'WIDE_POOL';
  if (ticket.hostId && ageS < ASSIGNED_SLA_S) return 'ASSIGNED';
  return 'ZONE_POOL';
}

/** Mốc hết SLA 3′ của ticket tầng ASSIGNED. */
export function slaEndsAt(offeredAt: Date): Date {
  return new Date(offeredAt.getTime() + ASSIGNED_SLA_S * 1000);
}

/** "Cùng phân khu" = phân khu của Host CHỨA tên phân khu của tòa (quy ước chung với booking & landlord-directory). */
export function inZone(assignedZone: string, zoneName: string): boolean {
  return assignedZone.includes(zoneName);
}
