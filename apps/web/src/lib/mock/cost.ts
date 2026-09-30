/**
 * Công thức All-in Cost của VinStay AI (PRD §3.1):
 *   All-in = tiền thuê + phí quản lý (diện tích × 9.500đ) + phí gửi xe + dự toán điện nước (300k/người)
 */
export const HOLD_HOURS_DEFAULT = 48;   // chủ tịch chốt 2026-09-29 (legal/02 Điều 2.3 cho 12–72)
export const HOLD_HOURS_MIN = 12;
export const HOLD_HOURS_MAX = 72;
export const HOUR_MS = 3_600_000;
export const MANDATE_TERM_MONTHS = 12;  // legal/01 Điều 8.1–8.2
export const NON_CIRCUMVENTION_MONTHS = 6; // legal/01 Điều 6.3
export const OCCUPANTS_MAX = 5;
export const PAYMENT_CYCLES = [1, 3, 6] as const; // legal/06 Điều 3.2
export type PaymentCycle = (typeof PAYMENT_CYCLES)[number];
export const TENANT_MODIFY_LEAD_MS = 2 * 3_600_000; // + Đ13 — đổi/huỷ lịch trước ≥ 2 giờ

export const RATES = {
  mgmtPerM2: 9_500,
  motorbike: 150_000,
  car: 1_250_000,
  utilityPerPerson: 300_000,
  /** Cọc giữ chỗ chuyển 100% thành Security Deposit khi ký HĐ, KHÔNG trừ vào tiền thuê tháng đầu. */
  holdingDeposit: 2_000_000,
  /** Căn hời phân khu: rẻ hơn giá trung bình toà ≥ 10%. */
  bargainThreshold: 0.1,
} as const;

export interface Household {
  persons: number;
  motorbikes: number;
  cars: number;
}

export const DEFAULT_HOUSEHOLD: Household = { persons: 1, motorbikes: 1, cars: 0 };

export interface CostBreakdown {
  rent: number;
  mgmt: number;
  parking: number;
  utility: number;
  total: number;
}

export function allInCost(unit: { rent: number; areaM2: number }, hh: Household = DEFAULT_HOUSEHOLD): CostBreakdown {
  const rent = unit.rent;
  const mgmt = Math.round(unit.areaM2 * RATES.mgmtPerM2);
  const parking = hh.motorbikes * RATES.motorbike + hh.cars * RATES.car;
  const utility = hh.persons * RATES.utilityPerPerson;
  return { rent, mgmt, parking, utility, total: rent + mgmt + parking + utility };
}

/** Tỷ lệ tiết kiệm so với giá trung bình toà (0.125 = rẻ hơn 12,5%). Âm nếu đắt hơn. */
export function savingsRatio(unit: { rent: number; marketAvg: number }): number {
  return (unit.marketAvg - unit.rent) / unit.marketAvg;
}

export const isBargain = (unit: { rent: number; marketAvg: number }) => savingsRatio(unit) >= RATES.bargainThreshold - 1e-9;

export const savingsPct = (unit: { rent: number; marketAvg: number }) => Math.round(savingsRatio(unit) * 100);
