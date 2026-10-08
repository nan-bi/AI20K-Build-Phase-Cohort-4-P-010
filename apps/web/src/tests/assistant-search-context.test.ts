import { describe, expect, it } from "vitest";
import { parseSse, streamChat, type AssistantEvent } from "@/lib/assistant/stream";
import { nextPinned } from "@/lib/assistant/pin";
import { contextChips, sanitizeContext } from "@/lib/assistant/context";

const sse = (raw: string) => new ReadableStream<Uint8Array>({ start: (c) => { c.enqueue(new TextEncoder().encode(raw)); c.close(); } });
const collect = async (it: AsyncIterable<AssistantEvent>) => {
  const out: AssistantEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
};
const catalog = ["A", "B", "C", "D"];

describe("stream: criteria + matched", () => {
  it("parse criteria (lọc khoá/kiểu lạ) và matched; focus không có criteria", async () => {
    const raw =
      'event: units\ndata: {"unitCodes":[],"mode":"search","matched":0,"criteria":{"max_all_in_budget":6000000,"must_have":["bàn ghế"],"evil":1,"occupants":"x"}}\n\n' +
      'event: units\ndata: {"unitCodes":["A"],"mode":"focus"}\n\n';
    const ev = await collect(parseSse(sse(raw)));
    expect(ev[0]).toEqual({ type: "units", unitCodes: [], mode: "search", matched: 0, criteria: { max_all_in_budget: 6000000, must_have: ["bàn ghế"] } });
    expect(ev[1]).toEqual({ type: "units", unitCodes: ["A"], mode: "focus" });
    expect(Object.keys(ev[1])).not.toContain("criteria");
  });
  it("gửi searchContext trong body khi có, không gửi khi null", async () => {
    const bodies: string[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(sse('event: done\ndata: {"model":"m","toolCalls":0,"ms":1}\n\n'), { status: 200 });
    }) as unknown as typeof fetch;
    const turns = [{ role: "user" as const, content: "hi" }];
    await collect(streamChat(turns, { locale: "vi", fetchImpl, searchContext: { max_all_in_budget: 6000000, occupants: 1 } }));
    await collect(streamChat(turns, { locale: "vi", fetchImpl, searchContext: null }));
    expect(JSON.parse(bodies[0]).searchContext).toEqual({ max_all_in_budget: 6000000, occupants: 1 });
    expect(JSON.parse(bodies[1])).not.toHaveProperty("searchContext");
  });
});

describe("nextPinned: thu hẹp dần, không bao giờ tự xoá", () => {
  const prev = ["A", "B", "C"];
  it("event có mã ⇒ thay bằng tập thu hẹp", () => {
    const r = nextPinned(prev, { unitCodes: ["B"], mode: "search", matched: 1 }, catalog);
    expect(r.pinned).toEqual(["B"]);
    expect(r.note).toBeNull();
    expect(r.applied?.searched).toBe(true);
  });
  it("search 0 căn (unitCodes rỗng, matched 0) ⇒ GIỮ danh sách cũ + note", () => {
    const r = nextPinned(prev, { unitCodes: [], mode: "search", matched: 0 }, catalog);
    expect(r.pinned).toEqual(prev);
    expect(r.note).toBe("kept");
    expect(r.applied).toBeNull();
  });
  it("0 căn nhưng chưa có danh sách cũ ⇒ không note", () => {
    expect(nextPinned(null, { unitCodes: [], mode: "search", matched: 0 }, catalog)).toMatchObject({ pinned: null, note: null });
  });
  it("lượt không có event ⇒ giữ nguyên", () => {
    expect(nextPinned(prev, null, catalog)).toMatchObject({ pinned: prev, note: null });
  });
  it("mã không có trong catalog ⇒ giữ nguyên, không xoá", () => {
    expect(nextPinned(prev, { unitCodes: ["ZZZ"], mode: "search" }, catalog).pinned).toEqual(prev);
  });
  it("focus giữ merge như cũ: căn nhắc lên đầu, phần còn lại giữ", () => {
    expect(nextPinned(prev, { unitCodes: ["C"], mode: "focus" }, catalog).pinned).toEqual(["C", "A", "B"]);
  });
});

describe("context chips / sanitize", () => {
  it("chip ngân sách, người, không xe, must_have", () => {
    const labels = contextChips({ max_all_in_budget: 6_000_000, occupants: 1, motorbikes: 0, cars: 0, must_have: ["bàn ghế"] }).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["1 người ở", "Không xe", "Có bàn ghế"]));
    expect(labels.some((l) => l.startsWith("All-in"))).toBe(true);
  });
  it("null/rỗng ⇒ không chip; sanitize bỏ sai kiểu", () => {
    expect(contextChips(null)).toEqual([]);
    expect(sanitizeContext({ layout: "9pn", occupants: -1 })).toBeNull();
  });
});

describe("ChatExperience: các đường xoá preview", () => {
  it("setPinned(null) chỉ ở runFilter-thành-công, onCriteria và reset; gửi searchContext", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/chat/ChatExperience.tsx", "utf8");
    expect((src.match(/setPinned\(null\)/g) ?? []).length).toBe(3);
    expect(src).not.toMatch(/setPinned\(\[\]\)/);
    expect(src).toMatch(/streamChat\(history, \{[^}]*searchContext/);
  });
});
