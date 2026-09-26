/**
 * Công thức All-in Cost của VinStay AI (PRD §3.1):
 *   All-in = tiền thuê + phí quản lý (diện tích × 9.500đ) + phí gửi xe + dự toán điện nước (300k/người)
 */
export const RATES = {
  mgmtPerM2: 9_500,
  motorbike: 150_000,
  car: 1_250_000,
  utilityPerPerson: 300_000,
  /** Cọc giữ chỗ 24h — chuyển 100% thành Security Deposit khi ký HĐ, KHÔNG trừ vào tiền thuê tháng đầu. */
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

export function allInCost(unit: { rent: number; areaM2: number; bqlFeeIncluded?: boolean }, hh: Household = DEFAULT_HOUSEHOLD): CostBreakdown {
  const rent = unit.rent;
  const mgmt = unit.bqlFeeIncluded ? 0 : Math.round(unit.areaM2 * RATES.mgmtPerM2);
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
