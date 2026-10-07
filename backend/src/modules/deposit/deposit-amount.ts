/**
 * Nguồn duy nhất của số tiền cọc giữ chỗ (VNĐ). Hồ sơ 18 chưa đổi quy tắc: luôn 2.000.000 cho mọi căn.
 * `unit` để dành cho đổi luật sau (non-goal hiện tại); hiện không dùng.
 */
export const HOLDING_DEPOSIT_VND = 2_000_000;

export function holdingDepositAmount(_unit?: unknown): number {
  return HOLDING_DEPOSIT_VND;
}
