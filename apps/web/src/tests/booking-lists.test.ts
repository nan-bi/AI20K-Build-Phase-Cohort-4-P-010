import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  isUpcomingBooking,
  splitTenantBookings,
} from "@/lib/tenant/adapters";
import type { TenantBooking, TenantUnit } from "@/lib/tenant/types";

const mockUnit: TenantUnit = {
  code: "VHOP-S1.02-1208",
  building: "S1.02",
  floor: 12,
  door: "08",
  layout: "1PN",
  layoutLabel: "1PN+",
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
  photos: [],
  interest24h: 4,
  petFriendly: true,
  minMonths: 6,
  verifiedAt: "2026-10-01T08:00:00Z",
  title: "Căn 1PN+",
  description: "",
  holdHours: 48,
  activeViewingAt: null,
};

function makeBooking(
  ref: string,
  status: TenantBooking["status"],
  slot: string,
): TenantBooking {
  return {
    ref,
    status,
    unit: mockUnit,
    slot,
    createdAt: "2026-10-01T08:00:00Z",
    rescheduleCount: 0,
    contact: {
      name: "Nguyễn Văn A",
      phoneMasked: "0912 ••• 678",
      persons: 1,
    },
    host: null,
    canModify: true,
  };
}

describe("booking list splitting and timeline helpers (SPEC-P04 §6, §8)", () => {
  it("splitTenantBookings phân tách chính xác lịch Sắp tới và Đã qua", () => {
    const b1 = makeBooking("VS-001", "confirmed", "2026-10-06T02:30:00Z");
    const b2 = makeBooking("VS-002", "holding", "2026-10-05T01:30:00Z");
    const b3 = makeBooking("VS-003", "cancelled", "2026-10-04T07:30:00Z");
    const b4 = makeBooking("VS-004", "completed", "2026-10-03T01:30:00Z");
    const b5 = makeBooking("VS-005", "leased", "2026-10-02T01:30:00Z");

    const { upcoming, past } = splitTenantBookings([b1, b2, b3, b4, b5]);

    expect(upcoming.map((b) => b.ref)).toEqual(["VS-001", "VS-002"]);
    expect(past.map((b) => b.ref)).toEqual(["VS-003", "VS-004", "VS-005"]);
  });

  it("isUpcomingBooking đúng với các trạng thái mở và holding", () => {
    expect(isUpcomingBooking(makeBooking("VS-1", "pending", "2026-10-05T00:00:00Z"))).toBe(true);
    expect(isUpcomingBooking(makeBooking("VS-2", "confirmed", "2026-10-05T00:00:00Z"))).toBe(true);
    expect(isUpcomingBooking(makeBooking("VS-3", "lobby", "2026-10-05T00:00:00Z"))).toBe(true);
    expect(isUpcomingBooking(makeBooking("VS-4", "closing", "2026-10-05T00:00:00Z"))).toBe(true);
    expect(isUpcomingBooking(makeBooking("VS-5", "holding", "2026-10-05T00:00:00Z"))).toBe(true);

    expect(isUpcomingBooking(makeBooking("VS-6", "completed", "2026-10-05T00:00:00Z"))).toBe(false);
    expect(isUpcomingBooking(makeBooking("VS-7", "cancelled", "2026-10-05T00:00:00Z"))).toBe(false);
    expect(isUpcomingBooking(makeBooking("VS-8", "no_show", "2026-10-05T00:00:00Z"))).toBe(false);
    expect(isUpcomingBooking(makeBooking("VS-9", "leased", "2026-10-05T00:00:00Z"))).toBe(false);
  });

  it("buildTimeline tạo đủ các mốc tiến trình theo trạng thái lịch hẹn", () => {
    const booking = makeBooking("VS-100", "closing", "2026-10-05T01:30:00Z");
    booking.confirmedAt = "2026-10-04T08:10:00Z";
    booking.lobbyAt = "2026-10-05T01:25:00Z";
    booking.viewingAt = "2026-10-05T01:30:00Z";
    booking.viewEndedAt = "2026-10-05T02:00:00Z";

    const steps = buildTimeline(booking);
    expect(steps.length).toBe(7);

    const createdStep = steps.find((s) => s.key === "created");
    expect(createdStep?.done).toBe(true);

    const viewingStep = steps.find((s) => s.key === "viewing");
    expect(viewingStep?.done).toBe(true);

    const closingStep = steps.find((s) => s.key === "closing");
    expect(closingStep?.done).toBe(true);
    expect(closingStep?.current).toBe(true);

    const holdingStep = steps.find((s) => s.key === "holding");
    expect(holdingStep?.done).toBe(false);
  });
});
