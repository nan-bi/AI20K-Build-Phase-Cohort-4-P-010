import { allInCost } from "./cost";
import { ALL_SLOT_TIMES, MIN_LEAD_MS, slotDate } from "./slots";
import type { Booking, BookingStatus, FeeConfig, MockState, Notice } from "./types";
import { HOSTS, UNITS, unitById, type FieldHost, type Unit, type UnitStatus } from "./units";

/** Lịch chưa có quyết định cuối (khách còn cơ hội xem hoặc đang xem). */
export const OPEN_STATUSES: BookingStatus[] = ["pending", "confirmed", "lobby", "receiving", "viewing", "closing"];
/** Lịch còn chiếm ca trực của Host. */
const BUSY_SLOT_STATUSES: BookingStatus[] = ["pending", "confirmed", "lobby", "receiving", "viewing", "closing"];

export const isOpenBooking = (b: Booking) => OPEN_STATUSES.includes(b.status);

export function unitStatus(state: MockState, unit: Unit): UnitStatus {
  return state.unitState[unit.id]?.status ?? unit.baseStatus;
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
  return state.bookings.filter((b) => b.hostId === hostId);
}

/** Khung giờ đã có lịch khác của cùng Host trong cửa sổ 45 phút (quy tắc chống ôm lead). */
export function slotTaken(state: MockState, hostId: string, slotIso: string, ignoreId?: string): boolean {
  const t = new Date(slotIso).getTime();
  return state.bookings.some(
    (b) =>
      b.hostId === hostId &&
      b.id !== ignoreId &&
      BUSY_SLOT_STATUSES.includes(b.status) &&
      Math.abs(new Date(b.slot).getTime() - t) < 45 * 60_000,
  );
}

export interface SlotOption {
  time: string;
  iso: string;
  available: boolean;
  reason?: "past" | "taken";
}

export function slotsForDay(state: MockState, hostId: string, day: Date, now: number, ignoreId?: string): SlotOption[] {
  return ALL_SLOT_TIMES.map((time) => {
    const d = slotDate(day, time);
    const iso = d.toISOString();
    if (d.getTime() < now + MIN_LEAD_MS) return { time, iso, available: false, reason: "past" as const };
    if (slotTaken(state, hostId, iso, ignoreId)) return { time, iso, available: false, reason: "taken" as const };
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
    host.weekTickets + mine.filter((b) => ["viewing", "closing", "holding", "signed", "leased", "completed"].includes(b.status)).length;
  const deals = host.weekDeals + mine.filter((b) => ["holding", "signed", "leased"].includes(b.status)).length;
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
  const checkedIn = 301 + count((b) => !!b.lobbyAt || ["receiving", "viewing", "closing", "holding", "signed", "leased", "completed"].includes(b.status));
  const deposit = 132 + count((b) => !!b.deposit?.paidAt);
  const signed = 118 + count((b) => ["signed", "leased"].includes(b.status));
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
  const done = state.bookings.filter((b) => ["completed", "no_show", "leased", "holding", "signed"].includes(b.status)).length;
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
