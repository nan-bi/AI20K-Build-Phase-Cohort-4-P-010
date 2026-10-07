import { DEFAULT_MGMT_FEE_PER_M2, MGMT_FEE_CONFIG_KEY } from './landlord.mappers';

/** Đơn giá phí quản lý BQL (đ/m²) — NGUỒN DUY NHẤT cho tạo ký gửi lẫn niêm yết (hồ sơ 18 SPEC-P02 §3). */
export async function mgmtFeePerM2(db: {
  feeConfig: { findUnique: (args: { where: { configKey: string } }) => Promise<{ paramValue: unknown } | null> };
}): Promise<number> {
  const row = await db.feeConfig.findUnique({ where: { configKey: MGMT_FEE_CONFIG_KEY } });
  return row ? Number(row.paramValue) : DEFAULT_MGMT_FEE_PER_M2;
}
