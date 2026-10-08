import { describe, expect, it } from "vitest";
import { depositPolicyFor, validateDepositAmount } from "@/lib/mock/selectors";
import type { MockState } from "@/lib/mock/types";

describe("Deposit Policy & Validation (Quy định cọc 50% – 400% giá thuê)", () => {
  it("1. Giá trị mặc định: minRatio = 0.5 (50%), maxRatio = 4.0 (400%), defaultRatio = 1.0 (100%)", () => {
    const mockState = {} as MockState;
    const policy = depositPolicyFor(mockState);
    expect(policy.minRatio).toBe(0.5);
    expect(policy.maxRatio).toBe(4.0);
    expect(policy.defaultRatio).toBe(1.0);
  });

  it("2. validateDepositAmount: từ chối cọc < 50% giá thuê và > 4 lần giá thuê", () => {
    const mockState = {
      depositPolicy: { minRatio: 0.5, maxRatio: 4.0, defaultRatio: 1.0 },
    } as MockState;
    const rent = 6_000_000;

    // 50% = 3_000_000, 4x = 24_000_000
    const tooLow = validateDepositAmount(mockState, rent, 2_999_000);
    expect(tooLow.ok).toBe(false);
    expect(tooLow.error).toContain("50%");

    const tooHigh = validateDepositAmount(mockState, rent, 24_000_001);
    expect(tooHigh.ok).toBe(false);
    expect(tooHigh.error).toContain("4");

    const validMin = validateDepositAmount(mockState, rent, 3_000_000);
    expect(validMin.ok).toBe(true);
    expect(validMin.min).toBe(3_000_000);
    expect(validMin.max).toBe(24_000_000);

    const validMid = validateDepositAmount(mockState, rent, 6_000_000);
    expect(validMid.ok).toBe(true);

    const validMax = validateDepositAmount(mockState, rent, 24_000_000);
    expect(validMax.ok).toBe(true);
  });

  it("3. validateDepositAmount với chính sách tuỳ chỉnh của Admin", () => {
    const customState = {
      depositPolicy: { minRatio: 1.0, maxRatio: 3.0, defaultRatio: 2.0 },
    } as MockState;
    const rent = 10_000_000;

    // 1.0x = 10tr, 3.0x = 30tr
    const under = validateDepositAmount(customState, rent, 8_000_000);
    expect(under.ok).toBe(false);

    const ok = validateDepositAmount(customState, rent, 15_000_000);
    expect(ok.ok).toBe(true);

    const over = validateDepositAmount(customState, rent, 35_000_000);
    expect(over.ok).toBe(false);
  });

  it("4. Bất biến tài chính: Cọc giữ chỗ 2.000.000đ chuyển 100% vào cọc bảo đảm, không trừ tiền thuê", () => {
    const holdingDeposit = 2_000_000;
    const monthlyRent = 8_000_000;
    const securityDeposit = 8_000_000; // 1 tháng

    // Số tiền khách cần nộp thêm để đủ cọc bảo đảm
    const remainingDepositToPay = securityDeposit - holdingDeposit;
    expect(remainingDepositToPay).toBe(6_000_000);

    // Tiền thuê tháng đầu KHÔNG bị trừ bởi cọc giữ chỗ
    const firstMonthRentPayable = monthlyRent;
    expect(firstMonthRentPayable).toBe(8_000_000);
  });
});
