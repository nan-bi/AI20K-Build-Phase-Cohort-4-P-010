import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { parseSse, type AssistantEvent } from "@/lib/assistant/stream";
import { applyUnitsEvent, nextPinned } from "@/lib/assistant/pin";
import { assumedLabel, sanitizeAssumed } from "@/lib/assistant/context";

vi.mock("next/link", () => ({ default: (p: { href: string; children?: unknown }) => createElement("a", { href: p.href }, p.children as never) }));
vi.mock("@/components/unit/FavoriteButton", () => ({ FavoriteButton: () => null }));

const sse = (raw: string) => new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(new TextEncoder().encode(raw)); c.close(); } });
const collect = async (it: AsyncIterable<AssistantEvent>) => {
  const out: AssistantEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
};
const codes = Array.from({ length: 25 }, (_, i) => `U${String(i).padStart(2, "0")}`);

describe("stream: matchedCodes + assumed", () => {
  it("parse matchedCodes (≤20, chỉ chuỗi) và assumed (chỉ khoá/kiểu hợp lệ); không có ⇒ không có khoá", async () => {
    const raw =
      `event: units\ndata: ${JSON.stringify({ unitCodes: ["U01"], mode: "search", matched: 31, matchedCodes: [...codes, 5], assumed: { occupants: 2, motorbikes: 1, cars: 0, evil: 9 } })}\n\n` +
      'event: units\ndata: {"unitCodes":["U01"],"mode":"search"}\n\n';
    const [a, b] = (await collect(parseSse(sse(raw)))) as Extract<AssistantEvent, { type: "units" }>[];
    expect(a.matchedCodes).toHaveLength(20);
    expect(a.matchedCodes?.[0]).toBe("U00");
    expect(a.matched).toBe(31);
    expect(a.assumed).toEqual({ occupants: 2, motorbikes: 1, cars: 0 });
    expect(Object.keys(b)).not.toContain("matchedCodes");
    expect(Object.keys(b)).not.toContain("assumed");
  });
});

describe("pin: danh sách đầy đủ theo xếp hạng", () => {
  const catalog = codes;
  it("matchedCodes làm danh sách ghim, căn bot nhắc đứng đầu + là gợi ý", () => {
    const ranked = codes.slice(0, 20);
    const r = nextPinned(null, { unitCodes: ["U05", "U02"], mode: "search", matched: 20, matchedCodes: ranked }, catalog);
    expect(r.pinned).toHaveLength(20);
    expect(r.pinned?.slice(0, 3)).toEqual(["U05", "U02", "U00"]);
    expect(r.applied?.suggested).toEqual(["U05", "U02"]);
  });
  it("bot không nhắc căn nào (unitCodes rỗng) nhưng có matchedCodes ⇒ vẫn ghim theo xếp hạng", () => {
    const r = nextPinned(["U09"], { unitCodes: [], mode: "search", matched: 3, matchedCodes: ["U03", "U01", "U02"] }, catalog);
    expect(r.pinned).toEqual(["U03", "U01", "U02"]);
    expect(r.applied?.suggested).toEqual([]);
  });
  it("matchedCodes lọc theo catalog; toàn mã lạ ⇒ giữ danh sách cũ", () => {
    expect(nextPinned(["U01"], { unitCodes: [], mode: "search", matchedCodes: ["ZZZ"] }, catalog).pinned).toEqual(["U01"]);
  });
  it("không có matchedCodes (tương thích cũ) ⇒ như trước: unitCodes ≤3", () => {
    const r = nextPinned(null, { unitCodes: ["U04", "U01", "U02", "U03"], mode: "search" }, catalog);
    expect(r.pinned).toEqual(["U04", "U01", "U02"]);
  });
  it("search 0 căn ⇒ giữ + note; focus ⇒ merge, không cắt còn 6", () => {
    const prev = codes.slice(0, 20);
    expect(nextPinned(prev, { unitCodes: [], mode: "search", matched: 0 }, catalog)).toMatchObject({ pinned: prev, note: "kept" });
    const f = nextPinned(prev, { unitCodes: ["U07"], mode: "focus" }, catalog);
    expect(f.pinned).toHaveLength(20);
    expect(f.pinned?.[0]).toBe("U07");
    expect(nextPinned(prev, null, catalog).pinned).toBe(prev);
  });
  it("applyUnitsEvent focus bỏ qua matchedCodes", () => {
    expect(applyUnitsEvent(["U01"], catalog, "focus", ["U02"], ["U05"])?.pinned).toEqual(["U01", "U02"]);
  });
});

describe("chip giả định", () => {
  it("nhãn Tạm tính theo khoá khách chưa nói", () => {
    expect(assumedLabel({ occupants: 2, motorbikes: 1, cars: 0 })).toBe("Tạm tính 2 người · 1 xe máy");
    expect(assumedLabel({ cars: 0 })).toBeNull();
    expect(assumedLabel(null)).toBeNull();
    expect(sanitizeAssumed({ occupants: -1, x: 1 })).toBeNull();
  });
});

describe("ResultsPanel: tiêu đề tổng + Xem thêm", () => {
  it("N căn khớp lấy từ matchedTotal; >12 căn chỉ hiện 12 đầu kèm nút Xem thêm; có chip Tạm tính", async () => {
    const { ResultsPanel, PAGE_SIZE } = await import("@/components/chat/ResultsPanel");
    const { toUnit } = await import("@/lib/tenant/adapters");
    const { allInCost, DEFAULT_HOUSEHOLD } = await import("@/lib/pricing/cost");
    const { emptyCriteria } = await import("@/lib/tenant/matchmaker");
    const mk = (i: number) =>
      toUnit({
        code: `VHOP-S1.02-${1000 + i}`, building: "S1.02", zoneName: "S1", floor: 10, door: "08", layout: "1PN", layoutLabel: "1PN", bedrooms: 1, bathrooms: 1,
        areaM2: 40, direction: "Đông", view: "Hồ", furnishing: "full", items: [], rent: 8_000_000, marketAvg: 9_000_000, managementFee: 400000,
        parkingFeeEstimate: 120000, utilityCostEstimate: 500000, status: "available", lock: "smart", photos: [], interest24h: 0, petFriendly: false,
        minMonths: 6, verifiedAt: "2026-10-01T08:00:00Z", holdHours: 48, activeViewingAt: null,
      } as never);
    const units = Array.from({ length: 20 }, (_, i) => mk(i));
    const results = units.map((unit) => ({ unit, cost: allInCost(unit, DEFAULT_HOUSEHOLD), reasons: [], score: 1 })) as never;
    const html = renderToStaticMarkup(
      createElement(ResultsPanel, { results, criteria: emptyCriteria(), onCriteria: () => {}, units, totalOpen: 40, phase: "results", matchedTotal: 33, assumed: { occupants: 2, motorbikes: 1 }, suggested: [units[4].code] }),
    );
    expect(PAGE_SIZE).toBe(12);
    expect(html).toContain("33 căn khớp yêu cầu");
    expect(html).toContain("Hiển thị 20 căn xếp hạng đầu");
    expect(html).toContain("Tạm tính 2 người · 1 xe máy");
    expect(html).toContain("Xem thêm 8 căn");
    expect((html.match(/Gợi ý #/g) ?? []).length).toBe(1);
    const shown = new Set(html.match(/VHOP-S1\.02-10\d\d/g));
    expect(shown.size).toBe(PAGE_SIZE);
  });
});
