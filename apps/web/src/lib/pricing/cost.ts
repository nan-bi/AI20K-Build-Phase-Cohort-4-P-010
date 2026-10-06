/** All-in estimate uses the listed rent and management fee plus current operating fee rules. */
export const HOLD_HOURS_DEFAULT = 48;
export const HOUR_MS = 3_600_000;
export const MANDATE_TERM_MONTHS = 12;
export const OCCUPANTS_MAX = 5;
export const PAYMENT_CYCLES = [1, 3, 6] as const;
export type PaymentCycle = (typeof PAYMENT_CYCLES)[number];
export const TENANT_MODIFY_LEAD_MS = 2 * 3_600_000;

export const RATES = {
  mgmtPerM2: 9_500,
  motorbike: 150_000,
  car: 1_250_000,
  utilityPerPerson: 300_000,
  holdingDeposit: 2_000_000,
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

export function allInCost(
  unit: { rent: number; areaM2: number; managementFee?: number },
  household: Household = DEFAULT_HOUSEHOLD,
): CostBreakdown {
  const rent = unit.rent;
  const mgmt = unit.managementFee ?? Math.round(unit.areaM2 * RATES.mgmtPerM2);
  const parking = household.motorbikes * RATES.motorbike + household.cars * RATES.car;
  const utility = household.persons * RATES.utilityPerPerson;
  return { rent, mgmt, parking, utility, total: rent + mgmt + parking + utility };
}

export function savingsRatio(unit: { rent: number; marketAvg: number }): number {
  return (unit.marketAvg - unit.rent) / unit.marketAvg;
}

export const isBargain = (unit: { rent: number; marketAvg: number }) => savingsRatio(unit) >= RATES.bargainThreshold - 1e-9;
export const savingsPct = (unit: { rent: number; marketAvg: number }) => Math.round(savingsRatio(unit) * 100);
