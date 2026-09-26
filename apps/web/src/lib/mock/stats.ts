import { isSameDay } from "./format";
import { unitStatus } from "./selectors";
import type { MockState } from "./types";
import { UNITS, ZONES } from "./units";

/** Số căn ký gửi tổng và số căn đã thuê/giữ chỗ nền theo toà (dữ liệu tuần, mock) — cộng thêm thay đổi phát sinh trong phiên demo. */
const BUILDING_BASE: Record<string, { total: number; used: number }> = {
  "S1.01": { total: 42, used: 37 },
  "S1.03": { total: 38, used: 34 },
  "S1.09": { total: 45, used: 33 },
  "S1.10": { total: 40, used: 26 },
  "S2.02": { total: 52, used: 47 },
  "S2.09": { total: 48, used: 41 },
  "S2.12": { total: 50, used: 36 },
  "S2.16": { total: 44, used: 39 },
  "S2.19": { total: 46, used: 30 },
  ZR1: { total: 36, used: 31 },
  ZR2: { total: 34, used: 24 },
  "R1.02": { total: 30, used: 19 },
  P3: { total: 28, used: 22 },
  P4: { total: 32, used: 21 },
  H1: { total: 40, used: 35 },
  H2: { total: 38, used: 28 },
  M2: { total: 36, used: 27 },
  M3: { total: 34, used: 18 },
};

export function heatRows(state: MockState) {
  return ZONES.map((z) => ({
    zone: z.short,
    cells: z.buildings.map((b) => {
      const base = BUILDING_BASE[b];
      const delta = UNITS.filter((u) => u.building === b).reduce((sum, u) => {
        const now = unitStatus(state, u) !== "available" ? 1 : 0;
        const was = u.baseStatus !== "available" ? 1 : 0;
        return sum + (now - was);
      }, 0);
      return { building: b, total: base.total, used: Math.min(base.total, base.used + delta) };
    }),
  }));
}

export function occupancyOverall(state: MockState) {
  const rows = heatRows(state).flatMap((r) => r.cells);
  const total = rows.reduce((s, c) => s + c.total, 0);
  const used = rows.reduce((s, c) => s + c.used, 0);
  return { total, used, rate: used / total };
}

/** Số lịch xem đặt mới mỗi ngày (13 ngày trước + hôm nay tính từ dữ liệu thực trong phiên). */
const DAILY_BASE = [9, 12, 8, 13, 15, 11, 10, 14, 17, 16, 13, 18, 15];

export function dailyBookings(state: MockState, now: number) {
  const today = state.bookings.filter((b) => isSameDay(b.createdAt, now)).length + 12;
  return [...DAILY_BASE, today].map((value, i, arr) => {
    const d = new Date(now - (arr.length - 1 - i) * 86_400_000);
    return { label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, value };
  });
}

/** Tỷ lệ phí dịch vụ ký gửi trừ vào tiền thuê (mock, chưa có trong PRD — chỉ để minh hoạ khoản thu ròng). */
export const SERVICE_FEE_RATE = 0.05;

/** Doanh thu tiền thuê các tháng trước của chủ nhà (mock nền). */
export const LANDLORD_HISTORY: Record<string, number[]> = {
  L1: [9_500_000, 14_000_000, 16_000_000, 12_000_000, 12_000_000],
  L2: [13_000_000, 13_000_000, 19_500_000, 19_500_000, 13_000_000],
};
