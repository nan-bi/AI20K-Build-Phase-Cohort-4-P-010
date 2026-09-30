import { describe, expect, it } from "vitest";
import { allInCost, isBargain, savingsPct } from "@/lib/mock/cost";
import { emptyCriteria, interpret, parseQuery, searchUnits } from "@/lib/mock/matchmaker";
import { bookableDays, upcomingSlots, MIN_LEAD_MS, BOOKING_WINDOW_DAYS } from "@/lib/mock/slots";
import { seedState } from "@/lib/mock/seed";
import { similarUnits, slotTaken, unitStatus } from "@/lib/mock/selectors";
import { UNITS, unitById } from "@/lib/mock/units";
import { isValidVnPhone, normalizePhone, vndShort } from "@/lib/mock/format";

const available = (u: (typeof UNITS)[number]) => u.baseStatus;

describe("All-in Cost", () => {
  it("cộng đủ 4 khoản theo công thức PRD", () => {
    // 45m² × 9.500 = 427.500 · 1 xe máy 150.000 · 2 người × 300.000
    const c = allInCost({ rent: 7_000_000, areaM2: 45 }, { persons: 2, motorbikes: 1, cars: 0 });
    expect(c).toEqual({ rent: 7_000_000, mgmt: 427_500, parking: 150_000, utility: 600_000, total: 8_177_500 });
  });
  it("gắn Căn hời khi rẻ hơn giá TB toà ≥ 10%", () => {
    expect(isBargain({ rent: 7_000_000, marketAvg: 8_200_000 })).toBe(true);
    expect(savingsPct({ rent: 7_000_000, marketAvg: 8_200_000 })).toBe(15);
    expect(isBargain({ rent: 7_000_000, marketAvg: 7_500_000 })).toBe(false);
  });
});

describe("parseQuery", () => {
  it("hiểu ngân sách viết tắt và loại căn", () => {
    const p = parseQuery("Tìm Studio dưới 7tr5 ở Masteri", emptyCriteria()).patch;
    expect(p.budget).toBe(7_500_000);
    expect(p.layouts).toEqual(["Studio"]);
    expect(p.zones).toEqual(["masteri"]);
  });
  it("không nhầm '1 người' hay '45m2' thành loại căn/ngân sách", () => {
    const p = parseQuery("mình ở 1 người, căn 45m2", emptyCriteria());
    expect(p.patch.layouts).toEqual([]);
    expect(p.patch.budget).toBeUndefined();
    expect(p.patch.household.persons).toBe(1);
  });
  it("nhận toà cụ thể, đồ dùng và thú cưng", () => {
    const p = parseQuery("căn ở S2.12 có máy giặt cho nuôi mèo", emptyCriteria()).patch;
    expect(p.buildings).toEqual(["S2.12"]);
    expect(p.items).toContain("washer");
    expect(p.pets).toBe(true);
  });
});

describe("searchUnits", () => {
  it("lọc cứng: không căn nào có All-in vượt ngân sách", () => {
    const c = { ...emptyCriteria(), budget: 8_000_000 };
    const res = searchUnits(c, available);
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) expect(r.cost.total).toBeLessThanOrEqual(8_000_000);
  });
  it("không trả căn đã cho thuê hoặc đang giữ chỗ", () => {
    const res = searchUnits(emptyCriteria(), available);
    expect(res.some((r) => r.unit.baseStatus !== "available")).toBe(false);
  });
  it("Studio dưới 8 triệu ra ít nhất 3 căn (câu gợi ý mẫu)", () => {
    const r = interpret("Studio dưới 8 triệu", emptyCriteria(), false, available);
    expect(r.kind).toBe("search");
    if (r.kind === "search") expect(r.results.length).toBeGreaterThanOrEqual(3);
  });
  it("câu hỏi All-in trả lời FAQ, không tìm căn", () => {
    expect(interpret("Chi phí All-in gồm những gì?", emptyCriteria(), false, available).kind).toBe("answer");
  });
  it("hỏi lại khi thiếu thông tin", () => {
    expect(interpret("ok", emptyCriteria(), false, available).kind).toBe("answer");
  });
});

describe("lịch xem & seed", () => {
  it("khung giờ đặt được luôn cách hiện tại tối thiểu 30 phút", () => {
    const now = new Date("2026-09-26T09:50:00+07:00").getTime();
    for (const iso of upcomingSlots(now, 6)) expect(new Date(iso).getTime()).toBeGreaterThanOrEqual(now + MIN_LEAD_MS);
    expect(bookableDays(now).length).toBe(3);
  });
  it("bookableDays hỗ trợ cửa sổ 14 ngày và bỏ qua hôm nay khi đã hết giờ", () => {
    const morning = new Date("2026-09-26T09:00:00+07:00").getTime();
    const days14 = bookableDays(morning, BOOKING_WINDOW_DAYS);
    expect(days14).toHaveLength(14);
    for (let i = 1; i < days14.length; i++) {
      expect(days14[i].getTime()).toBeGreaterThan(days14[i - 1].getTime());
    }
    expect(days14[0].getDate()).toBe(26);

    const evening = new Date("2026-09-26T18:00:00+07:00").getTime();
    const daysAfterHours = bookableDays(evening, BOOKING_WINDOW_DAYS);
    expect(daysAfterHours).toHaveLength(14);
    expect(daysAfterHours[0].getDate()).toBe(27);
  });
  it("seed: căn holding/rented đúng và slot Host không trùng nhau", () => {
    const seedTime = new Date("2026-09-26T07:00:00+07:00").getTime();
    const s = seedState(seedTime);
    expect(unitStatus(s, unitById("s2-16-2216")!, seedTime)).toBe("holding");
    expect(unitStatus(s, unitById("s1-03-1512")!, seedTime)).toBe("rented");
    const b = s.bookings.find((x) => x.id === "bk-101")!;
    expect(slotTaken(s, b.hostId, b.slot, b.id)).toBe(false);
  });
  it("gợi ý căn tương đương cùng layout, còn trống", () => {
    const s = seedState(Date.now());
    const sim = similarUnits(s, unitById("s2-12-1608")!, 2);
    expect(sim).toHaveLength(2);
    for (const u of sim) expect(u.layout).toBe("1PN");
  });
});

describe("format", () => {
  it("chuẩn hoá và kiểm tra SĐT Việt Nam", () => {
    expect(normalizePhone("+84 912 345 678")).toBe("0912345678");
    expect(isValidVnPhone("0912345678")).toBe(true);
    expect(isValidVnPhone("12345")).toBe(false);
  });
  it("rút gọn tiền", () => {
    expect(vndShort(6_500_000)).toBe("6,5 triệu");
    expect(vndShort(7_000_000)).toBe("7 triệu");
    expect(vndShort(850_000)).toBe("850 nghìn");
  });
});

import {
  findDefaultDayIdx,
  findEarliestSlot,
  formatEarliestLabel,
  formatShortDay,
  getNextDayIdx,
} from "@/components/booking/slotPick";

describe("slotPick pure helpers", () => {
  const now = new Date("2026-09-26T10:00:00+07:00").getTime();
  const day0 = new Date("2026-09-26T00:00:00+07:00");
  const day1 = new Date("2026-09-27T00:00:00+07:00");
  const day2 = new Date("2026-09-28T00:00:00+07:00");
  const dayOct2 = new Date("2026-10-02T00:00:00+07:00"); // Thứ 6

  it("formatShortDay trả đúng Hôm nay, Mai, và thứ ngắn", () => {
    expect(formatShortDay(day0, now)).toBe("Hôm nay");
    expect(formatShortDay(day1, now)).toBe("Mai");
    expect(formatShortDay(day2, now)).toBe("T2"); // 28/09/2026 là Thứ hai
  });

  it("formatEarliestLabel format đúng chip sớm nhất", () => {
    expect(formatEarliestLabel(day0, "14:30", now)).toBe("Sớm nhất: Hôm nay · 14:30");
    expect(formatEarliestLabel(day1, "09:30", now)).toBe("Sớm nhất: Mai · 09:30");
    expect(formatEarliestLabel(dayOct2, "14:30", now)).toBe("Sớm nhất: T6 02/10 · 14:30");
  });

  it("findDefaultDayIdx ưu tiên slot đang chọn hoặc ngày đầu tiên còn giờ", () => {
    const days = [
      { date: day0, availableCount: 0 },
      { date: day1, availableCount: 4 },
      { date: day2, availableCount: 6 },
    ];
    // Ngày 0 kín lịch -> chọn ngày 1
    expect(findDefaultDayIdx(days, null)).toBe(1);

    // Có slotIso rơi vào ngày 2 -> chọn ngày 2
    expect(findDefaultDayIdx(days, "2026-09-28T14:30:00.000Z")).toBe(2);

    // Tất cả kín lịch -> fallback 0
    expect(findDefaultDayIdx([{ date: day0, availableCount: 0 }], null)).toBe(0);
  });

  it("findEarliestSlot tìm đúng slot trống đầu tiên", () => {
    const days = [
      {
        date: day0,
        slots: [
          { time: "08:30", iso: "2026-09-26T08:30:00", available: false, reason: "past" as const },
          { time: "09:30", iso: "2026-09-26T09:30:00", available: false, reason: "past" as const },
        ],
      },
      {
        date: day1,
        slots: [
          { time: "08:30", iso: "2026-09-27T08:30:00", available: true },
          { time: "09:30", iso: "2026-09-27T09:30:00", available: true },
        ],
      },
    ];
    const res = findEarliestSlot(days);
    expect(res).not.toBeNull();
    expect(res?.dayIdx).toBe(1);
    expect(res?.slot.time).toBe("08:30");
  });

  it("getNextDayIdx nhảy qua các ngày kín lịch khi dùng bàn phím", () => {
    const days = [
      { availableCount: 2 }, // 0
      { availableCount: 0 }, // 1 (kín)
      { availableCount: 0 }, // 2 (kín)
      { availableCount: 3 }, // 3
    ];
    // Từ 0 bấm next -> nhảy thẳng sang 3
    expect(getNextDayIdx(0, "next", days)).toBe(3);
    // Từ 3 bấm prev -> nhảy thẳng về 0
    expect(getNextDayIdx(3, "prev", days)).toBe(0);
    // Từ 0 bấm prev -> giữ nguyên 0
    expect(getNextDayIdx(0, "prev", days)).toBe(0);
    // Từ 3 bấm next -> giữ nguyên 3
    expect(getNextDayIdx(3, "next", days)).toBe(3);
  });
});

import {
  canNavigateMonth,
  formatMonthTitle,
  formatSelectedDateLong,
  getCalendarMatrix,
  getMonthBounds,
} from "@/components/booking/slotPick";

describe("Calendar Date Picker helpers", () => {
  const now = new Date("2026-09-27T10:00:00+07:00").getTime();
  const bounds = getMonthBounds(now);

  it("getMonthBounds tính đúng tháng hiện tại và tháng tiếp theo", () => {
    expect(bounds.currentYear).toBe(2026);
    expect(bounds.currentMonth).toBe(8); // Tháng 9 (0-indexed)
    expect(bounds.maxYear).toBe(2026);
    expect(bounds.maxMonth).toBe(9); // Tháng 10 (0-indexed)
    expect(bounds.endOfMaxMonth.getDate()).toBe(31);
    expect(bounds.endOfMaxMonth.getMonth()).toBe(9);
  });

  it("canNavigateMonth chỉ cho phép xem tháng này và tháng sau", () => {
    // Đang ở tháng 9: không lùi được, chỉ tiến được
    expect(canNavigateMonth("prev", 2026, 8, bounds)).toBe(false);
    expect(canNavigateMonth("next", 2026, 8, bounds)).toBe(true);

    // Đang ở tháng 10: lùi được, không tiến được
    expect(canNavigateMonth("prev", 2026, 9, bounds)).toBe(true);
    expect(canNavigateMonth("next", 2026, 9, bounds)).toBe(false);
  });

  it("getCalendarMatrix sinh ma trận 7 cột chặn ngày quá khứ", () => {
    const matrixSept = getCalendarMatrix(2026, 8, bounds);
    expect(matrixSept.length % 7).toBe(0);

    // Ngày 26/09/2026 (quá khứ) phải bị disabled
    const cell26 = matrixSept.find((c) => c.isCurrentMonth && c.dayNumber === 26);
    expect(cell26?.isDisabled).toBe(true);

    // Ngày 27/09/2026 (hôm nay) khả dụng và isToday
    const cell27 = matrixSept.find((c) => c.isCurrentMonth && c.dayNumber === 27);
    expect(cell27?.isToday).toBe(true);
    expect(cell27?.isDisabled).toBe(false);

    // Ngày 30/09/2026 khả dụng
    const cell30 = matrixSept.find((c) => c.isCurrentMonth && c.dayNumber === 30);
    expect(cell30?.isDisabled).toBe(false);

    // Tháng 10: mọi ngày 01-31 đều khả dụng (nằm trong cửa sổ)
    const matrixOct = getCalendarMatrix(2026, 9, bounds);
    const cellOct1 = matrixOct.find((c) => c.isCurrentMonth && c.dayNumber === 1);
    expect(cellOct1?.isDisabled).toBe(false);
    const cellOct31 = matrixOct.find((c) => c.isCurrentMonth && c.dayNumber === 31);
    expect(cellOct31?.isDisabled).toBe(false);
  });

  it("formatMonthTitle và formatSelectedDateLong đúng định dạng", () => {
    expect(formatMonthTitle(2026, 8)).toBe("Tháng 9, 2026");
    expect(formatMonthTitle(2026, 9)).toBe("Tháng 10, 2026");
    expect(formatSelectedDateLong(new Date("2026-09-27T00:00:00+07:00"), now)).toContain("Hôm nay, 27/09/2026");
  });
});
