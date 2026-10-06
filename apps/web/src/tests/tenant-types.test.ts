import { describe, expect, it } from "vitest";
import type {
  TenantBooking,
  TenantUnit,
} from "@/lib/tenant/types";

describe("tenant-types contract verification", () => {
  it("khớp đầy đủ các trường của TenantUnit DTO theo 01 §5", () => {
    const unit: TenantUnit = {
      code: "VHOP-S1.02-1208",
      building: "S1.02",
      floor: 12,
      door: "08",
      layout: "1PN",
      layoutLabel: "1PN+",
      bedrooms: 1,
      bathrooms: 1,
      areaM2: 48,
      direction: "Đông Nam",
      view: "Hồ điều hòa",
      furnishing: "full",
      items: ["ac", "fridge"],
      rent: 7000000,
      marketAvg: 7500000,
      managementFee: 500000,
      parkingFeeEstimate: 120000,
      utilityCostEstimate: 500000,
      status: "available",
      lock: "smart",
      photos: ["/p1.jpg"],
      interest24h: 3,
      petFriendly: true,
      minMonths: 6,
      verifiedAt: "2026-10-01T08:00:00Z",
      title: "Căn hộ 1PN+",
      description: "Đẹp",
      holdHours: 48,
      activeViewingAt: null,
    };
    expect(unit.code).toBeDefined();
    expect(unit.holdHours).toBeGreaterThanOrEqual(12);
    expect(unit.holdHours).toBeLessThanOrEqual(72);
  });

  it("khớp đầy đủ các trường của TenantBooking DTO theo 01 §5", () => {
    const booking: TenantBooking = {
      ref: "VS-A1B2C",
      status: "pending",
      unit: {} as unknown as TenantUnit,
      slot: "2026-10-05T01:30:00Z",
      createdAt: "2026-10-04T08:00:00Z",
      rescheduleCount: 0,
      contact: {
        name: "Nguyễn Văn A",
        phoneMasked: "0912 *** 678",
        persons: 2,
      },
      host: null,
      canModify: true,
      deposit: {
        amount: 2000000,
        transferContent: "COC VHOP-S1.02-1208 0912345678",
        qrRef: "VQ-123456",
        createdAt: "2026-10-04T08:00:00Z",
        termsAcceptedAt: "2026-10-04T08:05:00Z",
        termsVersion: "HOLD-2026.10-v1",
        outcome: "awaiting_payment",
        vietqr: null,
      },
    };
    expect(booking.deposit?.amount).toBe(2000000);
    expect(booking.deposit?.outcome).toBe("awaiting_payment");
  });
});
