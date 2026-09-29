import { allInCost, TENANT_MODIFY_LEAD_MS } from "./cost";
import { ALL_SLOT_TIMES, MIN_LEAD_MS, slotDate } from "./slots";
import type { Booking, BookingDispatch, BookingStatus, FeeConfig, MockState, Notice } from "./types";
import {
  HOSTS,
  UNITS,
  unitById,
  hostById,
  zoneById,
  zoneOfBuilding,
  type FieldHost,
  type HostRole,
  type Unit,
  type UnitDisplayStatus,
  type UnitStatus,
  type ZoneId,
} from "./units";

/** Lịch chưa có quyết định cuối (khách còn cơ hội xem hoặc đang xem). */
export const OPEN_STATUSES: BookingStatus[] = ["pending", "confirmed", "lobby", "receiving", "viewing", "closing"];
/** Lịch còn chiếm ca trực của Host. */
const BUSY_SLOT_STATUSES: BookingStatus[] = ["pending", "confirmed", "lobby", "receiving", "viewing", "closing"];

export const isOpenBooking = (b: Booking) => OPEN_STATUSES.includes(b.status);

export function unitStatus(state: MockState, unitOrId: Unit | string): UnitStatus {
  const id = typeof unitOrId === "string" ? unitOrId : unitOrId.id;
  const base = typeof unitOrId === "string" ? (unitById(unitOrId)?.baseStatus ?? "available") : unitOrId.baseStatus;
  const override = state.unitState[id];
  if (!override) return base;

  // Unit rảnh lại khi hết hạn thật (SPEC-P01 §2)
  if (override.status === "holding" && override.holdingUntil) {
    if (Date.parse(override.holdingUntil) <= Date.now()) {
      const isLeased = state.bookings.some((b) => b.unitId === id && b.status === "leased");
      if (!isLeased) {
        return "available";
      }
    }
  }

  return override.status;
}

export function holdEndsAt(b: Booking): number | undefined {
  return b.deposit?.expiresAt ? Date.parse(b.deposit.expiresAt) : undefined;
}

export function isHoldForfeited(b: Booking, now: number): boolean {
  const ends = holdEndsAt(b);
  return Boolean(b.deposit?.paidAt && !b.lease && ends !== undefined && now >= ends);
}

export function holdDaysLeft(b: Booking, now: number): number {
  const ends = holdEndsAt(b);
  if (ends === undefined) return 0;
  return Math.max(0, Math.ceil((ends - now) / 86_400_000));
}

export function canTenantModify(b: Booking, now: number): boolean {
  if (b.status !== "pending" && b.status !== "confirmed") return false;
  const slotTime = new Date(b.slot).getTime();
  return slotTime - now >= TENANT_MODIFY_LEAD_MS;
}

export function unitDisplayStatus(state: MockState, unit: Unit): UnitDisplayStatus {
  const st = unitStatus(state, unit);
  if (st !== "available") return st;
  const hasOpen = state.bookings.some((b) => b.unitId === unit.id && isOpenBooking(b));
  return hasOpen ? "viewing" : "available";
}

export function hostRoles(state: MockState, hostId: string): HostRole[] {
  if (state.hostRoles && state.hostRoles[hostId]) {
    return state.hostRoles[hostId];
  }
  const host = hostById(hostId);
  return host?.roles ?? ["sale"];
}

export function pickHostFor(
  state: MockState,
  zoneId: ZoneId,
  role: HostRole
): { hostId: string; fallback: boolean } {
  const z = zoneById(zoneId);
  if (z && hostRoles(state, z.hostId).includes(role)) {
    return { hostId: z.hostId, fallback: false };
  }

  // Lấy Host đầu tiên trong HOSTS có zones chứa zoneId, có role và status !== "off_duty"
  const candidateOnDuty = HOSTS.find(
    (h) =>
      h.zones.includes(zoneId) &&
      hostRoles(state, h.id).includes(role) &&
      h.status !== "off_duty"
  );
  if (candidateOnDuty) {
    return { hostId: candidateOnDuty.id, fallback: false };
  }

  // Bỏ điều kiện status
  const candidateAny = HOSTS.find(
    (h) => h.zones.includes(zoneId) && hostRoles(state, h.id).includes(role)
  );
  if (candidateAny) {
    return { hostId: candidateAny.id, fallback: false };
  }

  // Không có ai => fallback Host mặc định
  return { hostId: z ? z.hostId : "H01", fallback: true };
}

/** Số khách đang quan tâm căn (≥3 → gắn cờ HOT). */
export function unitInterest(state: MockState, unit: Unit): number {
  const open = state.bookings.filter((b) => b.unitId === unit.id && isOpenBooking(b)).length;
  return Math.max(unit.interest24h, open);
}

export const HOT_THRESHOLD = 3;

export function bookingByRef(state: MockState, ref: string): Booking | undefined {
  const key = ref.trim().toUpperCase();
  return state.bookings.find((b) => b.ref === key);
}

export const bookingById = (state: MockState, id: string) => state.bookings.find((b) => b.id === id);

export const bookingsOfPhone = (state: MockState, phone: string) => state.bookings.filter((b) => b.tenant.phone === phone);

export function hostBookings(state: MockState, hostId: string): Booking[] {
  return state.bookings.filter((b) => b.hostId === hostId && b.dispatch?.state !== "open");
}

/** Khung giờ đã có lịch khác của cùng Host trong cửa sổ 45 phút (quy tắc chống ôm lead). */
export function slotTaken(state: MockState, hostId: string, slotIso: string, ignoreId?: string): boolean {
  const t = new Date(slotIso).getTime();
  return state.bookings.some(
    (b) =>
      b.hostId === hostId &&
      b.id !== ignoreId &&
      b.dispatch?.state !== "open" &&
      BUSY_SLOT_STATUSES.includes(b.status) &&
      Math.abs(new Date(b.slot).getTime() - t) < 45 * 60_000,
  );
}

export function freeAt(state: MockState, hostId: string, slotIso: string, ignoreId?: string): boolean {
  return !slotTaken(state, hostId, slotIso, ignoreId);
}

export function saleCandidates(state: MockState, zoneId: ZoneId | null): FieldHost[] {
  return HOSTS.filter((h) => {
    if (h.status === "off_duty") return false;
    if (!hostRoles(state, h.id).includes("sale")) return false;
    if (zoneId !== null && !h.zones.includes(zoneId)) return false;
    return true;
  }).sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.avgAcceptSec !== b.avgAcceptSec) return a.avgAcceptSec - b.avgAcceptSec;
    return a.id.localeCompare(b.id);
  });
}

export function dispatchSale(
  state: MockState,
  unit: Unit,
  slotIso: string,
  ignoreId?: string
): BookingDispatch & { hostId: string } {
  const zone = zoneOfBuilding(unit.building);
  const zoneList = saleCandidates(state, zone?.id ?? null);
  const top = zoneList[0];
  const openedAt = new Date().toISOString();

  // 1. top tồn tại && freeAt(top, slot) ⇒ { hostId: top.id, state:"assigned", tier:"top", offeredTo:[top.id] }
  if (top && freeAt(state, top.id, slotIso, ignoreId)) {
    return {
      hostId: top.id,
      state: "assigned",
      tier: "top",
      offeredTo: [top.id],
      openedAt,
    };
  }

  // 2. free = zoneList.filter(h ≠ top && freeAt(h, slot))
  //    free.length > 0 ⇒ { hostId: free[0].id, state:"open", tier:"zone_pool", offeredTo: free.map(id) }
  const free = zoneList.filter((h) => h.id !== top?.id && freeAt(state, h.id, slotIso, ignoreId));
  if (free.length > 0) {
    return {
      hostId: free[0].id,
      state: "open",
      tier: "zone_pool",
      offeredTo: free.map((h) => h.id),
      openedAt,
    };
  }

  // 3. wide = saleCandidates(state, null).filter(h ∉ zoneList && freeAt(h, slot))
  //    wide.length > 0 ⇒ { hostId: wide[0].id, state:"open", tier:"wide_pool", offeredTo: wide.map(id), escalated:true }
  const zoneIds = new Set(zoneList.map((h) => h.id));
  const wide = saleCandidates(state, null).filter((h) => !zoneIds.has(h.id) && freeAt(state, h.id, slotIso, ignoreId));
  if (wide.length > 0) {
    return {
      hostId: wide[0].id,
      state: "open",
      tier: "wide_pool",
      offeredTo: wide.map((h) => h.id),
      escalated: true,
      openedAt,
    };
  }

  // 4. không ai ⇒ { hostId: top?.id ?? zone?.hostId ?? "H01", state:"open", tier:"wide_pool", offeredTo:[], escalated:true }
  return {
    hostId: top?.id ?? zone?.hostId ?? "H01",
    state: "open",
    tier: "wide_pool",
    offeredTo: [],
    escalated: true,
    openedAt,
  };
}

export function isOpenTicket(b: Booking): boolean {
  return b.dispatch?.state === "open";
}

export function openTicketsFor(state: MockState, hostId: string): Booking[] {
  return state.bookings.filter(
    (b) =>
      b.dispatch?.state === "open" &&
      b.dispatch.offeredTo.includes(hostId) &&
      b.status === "pending"
  );
}

export interface SlotOption {
  time: string;
  iso: string;
  available: boolean;
  reason?: "past";
}

export function slotsForDay(_state: MockState, day: Date, now: number): SlotOption[] {
  return ALL_SLOT_TIMES.map((time) => {
    const d = slotDate(day, time);
    const iso = d.toISOString();
    if (d.getTime() < now + MIN_LEAD_MS) return { time, iso, available: false, reason: "past" as const };
    return { time, iso, available: true };
  });
}

/** Các căn tương đương (cùng layout, còn trống, giá sát nhất) để gợi ý khi căn bị cọc mất. */
export function similarUnits(state: MockState, unit: Unit, n = 2): Unit[] {
  return UNITS.filter((u) => u.id !== unit.id && u.layout === unit.layout && unitStatus(state, u) === "available")
    .sort((a, b) => Math.abs(a.rent - unit.rent) - Math.abs(b.rent - unit.rent))
    .slice(0, n);
}

export function noticesFor(state: MockState, audience: Notice["audience"], toKey?: string): Notice[] {
  return state.notices
    .filter((n) => n.audience === audience && (toKey === undefined || n.toKey === toKey))
    .sort((a, b) => b.at.localeCompare(a.at));
}

// ─── Thu nhập Field Host ─────────────────────────────────────────────────────────────────────

export interface Earnings {
  viewings: number;
  viewingFee: number;
  deals: number;
  commission: number;
  bonus: number;
  multiplier: number;
  total: number;
}

/** Thù lao tuần: mỗi lượt dẫn + hoa hồng chốt cọc + thưởng nóng; Host ≥4.8★ nhân hệ số thưởng đánh giá. */
export function hostEarnings(state: MockState, host: FieldHost, fees: FeeConfig): Earnings {
  const mine = hostBookings(state, host.id);
  const viewings =
    host.weekTickets + mine.filter((b) => ["viewing", "closing", "holding", "leased", "completed"].includes(b.status)).length;
  const deals = host.weekDeals + mine.filter((b) => ["holding", "leased"].includes(b.status)).length;
  const multiplier = host.rating >= 4.8 ? fees.ratingMultiplier : 1;
  const viewingFee = viewings * fees.baseViewingFee;
  const commission = Math.round(deals * fees.dealCommission * multiplier);
  const bonus = deals > 0 ? fees.campaignBonus * Math.min(deals, 3) : 0;
  return { viewings, viewingFee, deals, commission, bonus, multiplier, total: viewingFee + commission + bonus };
}

// ─── Phễu chuyển đổi (Admin) ─────────────────────────────────────────────────────────────────

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
}

/** Phễu 6 giai đoạn (PRD AC 4.3.1): số nền của tuần + số thực phát sinh trong phiên demo. */
export function funnel(state: MockState): FunnelStep[] {
  const bk = state.bookings;
  const count = (fn: (b: Booking) => boolean) => bk.filter(fn).length;
  const booked = 384 + count((b) => !["rejected"].includes(b.status));
  const checkedIn = 301 + count((b) => !!b.lobbyAt || ["receiving", "viewing", "closing", "holding", "leased", "completed"].includes(b.status));
  const deposit = 132 + count((b) => !!b.deposit?.paidAt);
  const signed = 118 + count((b) => ["leased"].includes(b.status));
  return [
    { key: "visit", label: "Lượt truy cập web", value: 4820 },
    { key: "chat", label: "Chat AI Matchmaker", value: 1930 + state.chat.messages.filter((m) => m.role === "user").length },
    { key: "book", label: "Đặt lịch xem (đã OTP)", value: booked },
    { key: "checkin", label: "Check-in sảnh", value: checkedIn },
    { key: "deposit", label: "Quét VietQR cọc", value: deposit },
    { key: "sign", label: "Ký thỏa thuận số", value: signed },
  ];
}

/** Tỷ lệ bỏ hẹn = số nền của tuần (2/38) cộng các ca phát sinh trong phiên demo. */
export function noShowRate(state: MockState): number {
  const done = state.bookings.filter((b) => ["completed", "no_show", "leased", "holding"].includes(b.status)).length;
  const noShow = state.bookings.filter((b) => b.status === "no_show").length;
  return (2 + noShow) / (38 + done);
}

// ─── Chủ nhà ─────────────────────────────────────────────────────────────────────────────────

export function landlordUnits(state: MockState, landlordId: string): Unit[] {
  return UNITS.filter((u) => u.landlordId === landlordId && state.mandates[u.id]?.status !== "ended");
}

/** Hợp đồng thuê hiện hành của một căn (nếu có). */
export function activeLease(state: MockState, unitId: string): Booking | undefined {
  return state.bookings.find((b) => b.unitId === unitId && b.status === "leased");
}

/** Tổng tiền thuê hàng tháng thu về từ các căn đã cho thuê của chủ nhà. */
export function monthlyRent(state: MockState, landlordId: string): number {
  return landlordUnits(state, landlordId).reduce((sum, u) => sum + (activeLease(state, u.id)?.lease?.rent ?? 0), 0);
}

export function occupancy(state: MockState, units: Unit[]): { rented: number; holding: number; available: number } {
  const acc = { rented: 0, holding: 0, available: 0 };
  for (const u of units) acc[unitStatus(state, u)]++;
  return acc;
}

export const hostName = (id: string) => HOSTS.find((h) => h.id === id)?.name ?? "—";

export function bookingUnit(b: Booking): Unit {
  return unitById(b.unitId)!;
}

export const tenantAllIn = (unit: Unit, persons = 1) => allInCost(unit, { persons, motorbikes: 1, cars: 0 });
