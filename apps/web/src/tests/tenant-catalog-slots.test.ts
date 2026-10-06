import { describe, expect, it } from "vitest";
import { findEarliestInBounds, getMonthBounds } from "@/components/booking/slotPick";
import { slotsForDay } from "@/lib/booking/slots";
import { similarUnits } from "@/lib/tenant/catalog";

const NOW = new Date("2026-10-05T00:00:00+07:00").getTime();
const DAY = new Date("2026-10-06T00:00:00+07:00");

describe("slotsForDay (chỉ dựa trên busy-slots từ API)", () => {
  it("không có ca bận ⇒ mọi khung giờ của ngày tương lai đều đặt được", () => {
    const slots = slotsForDay(DAY, NOW);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("khung giờ nằm trong busy-slots ⇒ khoá với lý do busy, các giờ còn lại giữ nguyên", () => {
    const first = slotsForDay(DAY, NOW)[0];
    const slots = slotsForDay(DAY, NOW, [first.iso]);
    expect(slots[0]).toMatchObject({ available: false, reason: "busy" });
    expect(slots.slice(1).every((s) => s.available)).toBe(true);
  });

  it("quá gần giờ ưu tiên lý do past", () => {
    const slots = slotsForDay(new Date(NOW), NOW + 20 * 3_600_000, []);
    expect(slots.every((s) => !s.available && s.reason === "past")).toBe(true);
  });

  it("slot sớm nhất bỏ qua ca bận và nhảy sang khung giờ kế tiếp", () => {
    const bounds = getMonthBounds(NOW);
    const first = findEarliestInBounds(bounds.startOfToday, bounds.endOfMaxMonth, NOW)!;
    const next = findEarliestInBounds(bounds.startOfToday, bounds.endOfMaxMonth, NOW, [first.slot.iso])!;
    expect(next.slot.iso).not.toBe(first.slot.iso);
  });
});

describe("similarUnits (căn tương tự từ catalog thật)", () => {
  const mk = (code: string, rent: number, layout = "1PN", baseStatus = "available") => ({ code, rent, layout, baseStatus });
  const target = mk("A", 8_000_000);

  it("chỉ lấy căn còn trống, cùng layout, khác chính nó, gần giá nhất trước", () => {
    const list = [mk("A", 8_000_000), mk("B", 9_500_000), mk("C", 8_200_000), mk("D", 8_100_000, "2PN"), mk("E", 8_050_000, "1PN", "rented")];
    expect(similarUnits(list, target, 3).map((u) => u.code)).toEqual(["C", "B"]);
  });
});
