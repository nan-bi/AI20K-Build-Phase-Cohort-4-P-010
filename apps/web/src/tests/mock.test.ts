import { describe, expect, it } from "vitest";
import { allInCost, isBargain, savingsPct } from "@/lib/mock/cost";
import { emptyCriteria, interpret, parseQuery, searchUnits } from "@/lib/mock/matchmaker";
import { bookableDays, upcomingSlots, MIN_LEAD_MS } from "@/lib/mock/slots";
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
  it("seed: căn holding/rented đúng và slot Host không trùng nhau", () => {
    const s = seedState(new Date("2026-09-26T07:00:00+07:00").getTime());
    expect(unitStatus(s, unitById("s2-16-2216")!)).toBe("holding");
    expect(unitStatus(s, unitById("s1-03-1512")!)).toBe("rented");
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
