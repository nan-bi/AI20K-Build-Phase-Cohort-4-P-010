import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { closeSelection, criteriaHasFilters, escShouldClose, previewPhase, selectUnit } from "@/lib/assistant/preview";
import { emptyCriteria } from "@/lib/tenant/matchmaker";
import { toUnit } from "@/lib/tenant/adapters";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/pricing/cost";
import type { TenantUnit } from "@/lib/tenant/types";

vi.mock("next/link", () => ({ default: (p: { href: string; children?: unknown }) => createElement("a", { href: p.href }, p.children as never) }));
vi.mock("@/components/unit/FavoriteButton", () => ({ FavoriteButton: () => null }));

describe("previewPhase", () => {
  it("idle trước tin đầu, loading khi chờ, results/empty sau đó", () => {
    expect(previewPhase({ started: false, pending: false, resultCount: 0 })).toBe("idle");
    expect(previewPhase({ started: true, pending: true, resultCount: 0 })).toBe("loading");
    expect(previewPhase({ started: true, pending: true, resultCount: 3 })).toBe("loading");
    expect(previewPhase({ started: true, pending: false, resultCount: 3 })).toBe("results");
    expect(previewPhase({ started: true, pending: false, resultCount: 0 })).toBe("empty");
  });
  it("criteriaHasFilters", () => {
    expect(criteriaHasFilters(emptyCriteria())).toBe(false);
    expect(criteriaHasFilters({ ...emptyCriteria(), budget: 12_000_000 })).toBe(true);
  });
});

describe("chọn/đóng chi tiết", () => {
  it("selectUnit giữ căn + cờ đặt lịch, closeSelection = null", () => {
    expect(selectUnit({ code: "A" })).toEqual({ unit: { code: "A" }, book: false });
    expect(selectUnit({ code: "A" }, true).book).toBe(true);
    expect(closeSelection()).toBeNull();
  });
  it("Esc chỉ đóng khi không có hộp thoại mở", () => {
    expect(escShouldClose("Escape", false)).toBe(true);
    expect(escShouldClose("Escape", true)).toBe(false);
    expect(escShouldClose("Enter", false)).toBe(false);
  });
});

const dto = {
  code: "VHOP-S1.02-1208", building: "S1.02", zoneName: "The Sapphire 1", floor: 12, door: "08", layout: "2PN", layoutLabel: "2PN",
  bedrooms: 2, bathrooms: 2, areaM2: 62, direction: "Đông Nam", view: "Hồ điều hòa", furnishing: "full", items: ["ac"], rent: 8_000_000,
  marketAvg: 10_000_000, managementFee: 500000, parkingFeeEstimate: 120000, utilityCostEstimate: 500000, status: "available", lock: "smart",
  photos: [], interest24h: 0, petFriendly: false, minMonths: 6, verifiedAt: "2026-10-01T08:00:00Z",
  holdHours: 48, activeViewingAt: null,
} as unknown as TenantUnit;

describe("UnitCard trong preview", () => {
  it("cùng thẻ /units: có All-in, WC, hướng, badge Căn hời, xếp hạng và lý do", async () => {
    const { UnitCard } = await import("@/components/unit/UnitCard");
    const unit = toUnit(dto);
    const html = renderToStaticMarkup(createElement(UnitCard, { unit, cost: allInCost(unit, DEFAULT_HOUSEHOLD), rank: 1, reasons: ["Trong ngân sách"], onSelect: () => {} }));
    expect(html).toContain("All-in");
    expect(html).toContain("2 WC");
    expect(html).toContain("Đông Nam");
    expect(html).toContain("Căn hời");
    expect(html).toContain("Gợi ý #1");
    expect(html).toContain("Trong ngân sách");
    expect(html).toContain("Đặt lịch xem");
    expect(html).toContain("/units/VHOP-S1.02-1208");
  });
});

describe("xếp lớp preview (lỗi badge/tim đè lên chi tiết)", () => {
  it("panel chi tiết có z-index cao hơn lớp z-20 của card và vùng kết quả được cô lập", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/components/chat/UnitPreviewPanel.module.css", "utf8");
    const z = Number(/position:\s*absolute;\s*z-index:\s*(\d+)/.exec(css)?.[1]);
    expect(z).toBeGreaterThan(20);
    const tsx = readFileSync("src/components/chat/ChatExperience.tsx", "utf8");
    expect(tsx).toMatch(/relative isolate z-0 flex-1 min-h-0 overflow-y-auto/);
  });
});

describe("focus: hỏi sâu/so sánh không làm preview thu hẹp", () => {
  const cat = ["A", "B", "C", "D"];
  it("search thay danh sách; focus đưa căn được nhắc lên đầu và giữ các căn còn lại", async () => {
    const { applyUnitsEvent } = await import("@/lib/assistant/pin");
    expect(applyUnitsEvent(["A", "B", "C"], cat, "search", null)?.pinned).toEqual(["A", "B", "C"]);
    expect(applyUnitsEvent(["C", "A"], cat, "focus", ["A", "B", "C"])?.pinned).toEqual(["C", "A", "B"]);
    expect(applyUnitsEvent(["D"], cat, "search", ["A", "B", "C"])?.pinned).toEqual(["D"]);
    expect(applyUnitsEvent(["Z"], cat, "focus", ["A"])).toBeNull();
  });
});

describe("preview ghim căn bot gợi ý dù danh mục vừa tải lại", () => {
  it("onSend dùng danh mục mới nhất (ref), không dùng bản chụp lúc bấm gửi", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/chat/ChatExperience.tsx", "utf8");
    expect(src).toMatch(/const known = catalogCodesRef\.current;[\s\S]*nextPinned\(pinned, [^\n]*known\.length \? known/);
    expect(src).not.toMatch(/nextPinned\([^\n]*catalog\.units\.map/);
  });
  it("danh mục rỗng lúc nhận event ⇒ vẫn ghim đúng mã bot gợi ý (kết quả điền khi danh mục tải xong)", async () => {
    const { applyUnitsEvent } = await import("@/lib/assistant/pin");
    const codes = ["A", "B"];
    expect(applyUnitsEvent(codes, codes, "search", null)?.pinned).toEqual(["A", "B"]);
    expect(applyUnitsEvent(codes, [], "search", null)).toBeNull(); // hành vi cũ gây preview trống
  });
});
