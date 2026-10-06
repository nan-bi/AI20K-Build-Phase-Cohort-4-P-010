import { describe, expect, it } from "vitest";
import { toBookingView, toUnit } from "@/lib/tenant/adapters";
import type { BookingStatusWeb, TenantBooking, TenantUnit } from "@/lib/tenant/types";

describe("tenant adapters (toUnit & toBookingView)", () => {
  const baseDto: TenantUnit = {
    code: "VHOP-S1.02-1208",
    building: "S1.02",
    zoneName: "The Sapphire 1",
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
    items: ["ac", "fridge", "sofa"],
    rent: 7000000,
    marketAvg: 7500000,
    managementFee: 500000,
    parkingFeeEstimate: 120000,
    utilityCostEstimate: 500000,
    status: "available",
    lock: "smart",
    photos: ["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p2.jpg"],
    interest24h: 4,
    petFriendly: true,
    minMonths: 6,
    verifiedAt: "2026-10-01T08:00:00Z",
    title: "Căn 1PN+ Sapphire 1",
    description: "Nội thất cao cấp",
    holdHours: 48,
    activeViewingAt: "2026-10-04T09:30:00Z",
  };

  it("toUnit ánh xạ chính xác các trường căn hộ và giữ All-in cost", () => {
    const unit = toUnit(baseDto);
    expect(unit.id).toBe("VHOP-S1.02-1208");
    expect(unit.code).toBe("VHOP-S1.02-1208");
    expect(unit.building).toBe("S1.02");
    expect(unit.zoneId).toBe("sapphire1");
    expect(unit.layout).toBe("1PN");
    expect(unit.layoutLabel).toBe("1PN+");
    expect(unit.lock).toBe("smart");
    expect(unit.baseStatus).toBe("available");
    expect(unit.photos).toEqual(["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p2.jpg"]);
    expect(unit.holdHours).toBe(48);
    expect(unit.activeViewingAt).toBe("2026-10-04T09:30:00Z");
    expect(unit.landlordId).toBe(""); // Charter bảo mật chủ nhà
  });

  it("toUnit hỗ trợ 4 layout cơ bản và các trạng thái căn", () => {
    const layouts: ("Studio" | "1PN" | "2PN" | "3PN")[] = ["Studio", "1PN", "2PN", "3PN"];
    for (const l of layouts) {
      const u = toUnit({ ...baseDto, layout: l, layoutLabel: l });
      expect(u.layout).toBe(l);
    }

    const statuses: ("available" | "holding" | "rented")[] = ["available", "holding", "rented"];
    for (const s of statuses) {
      const u = toUnit({ ...baseDto, status: s });
      expect(u.baseStatus).toBe(s);
    }
  });

  it("toBookingView bao phủ đầy đủ 12 trạng thái hiển thị", () => {
    const allStatuses: BookingStatusWeb[] = [
      "pending",
      "confirmed",
      "lobby",
      "receiving",
      "viewing",
      "closing",
      "holding",
      "leased",
      "completed",
      "no_show",
      "cancelled",
      "rejected",
    ];

    for (const st of allStatuses) {
      const bookingDto: TenantBooking = {
        ref: "VS-A1B2C",
        status: st,
        unit: baseDto,
        slot: "2026-10-05T01:30:00Z",
        createdAt: "2026-10-04T08:00:00Z",
        rescheduleCount: 0,
        contact: {
          name: "Nguyễn Khách",
          phoneMasked: "0912 *** 678",
          persons: 2,
        },
        host: {
          name: "Trần Host",
          rating: 4.9,
        },
        canModify: true,
      };

      const view = toBookingView(bookingDto);
      expect(view.status).toBe(st);
      expect(view.unit.code).toBe(baseDto.code);
      expect(view.contact.name).toBe("Nguyễn Khách");
    }
  });
});
