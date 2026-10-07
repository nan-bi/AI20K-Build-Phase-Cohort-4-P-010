import { describe, expect, it } from "vitest";
import { isFallbackError, parseSse, streamChat, type AssistantEvent } from "@/lib/assistant/stream";

const SSE =
  'event: delta\ndata: {"text":"Chào "}\n\n' +
  'event: delta\ndata: {"text":"bạn ✓"}\n\n' +
  'event: units\ndata: {"unitCodes":["VHOP-S1.02-0607"]}\n\n' +
  'event: done\ndata: {"model":"m","toolCalls":1,"ms":5}\n\n';

const bytesStream = (chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((x) => c.enqueue(x));
      c.close();
    },
  });

async function collect(it: AsyncIterable<AssistantEvent>) {
  const out: AssistantEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe("parseSse (A9)", () => {
  it("parses all events in one chunk", async () => {
    const events = await collect(parseSse(bytesStream([new TextEncoder().encode(SSE)])));
    expect(events.map((e) => e.type)).toEqual(["delta", "delta", "units", "done"]);
    expect(events[2]).toEqual({ type: "units", unitCodes: ["VHOP-S1.02-0607"], mode: "search" });
  });

  it("survives chunks cut at every byte, including mid UTF-8 character", async () => {
    const all = new TextEncoder().encode(SSE);
    const chunks = Array.from(all, (_, i) => all.slice(i, i + 1));
    const events = await collect(parseSse(bytesStream(chunks)));
    expect(events.filter((e) => e.type === "delta").map((e) => (e as { text: string }).text).join("")).toBe("Chào bạn ✓");
    expect(events).toHaveLength(4);
  });

  it("handles CRLF, comments and unknown events", async () => {
    const raw = ": ping\r\n\r\nevent: weird\r\ndata: {}\r\n\r\nevent: error\r\ndata: {\"code\":\"LLM_UNAVAILABLE\",\"message\":\"x\"}\r\n\r\n";
    const events = await collect(parseSse(bytesStream([new TextEncoder().encode(raw)])));
    expect(events).toEqual([{ type: "error", code: "LLM_UNAVAILABLE", message: "x" }]);
  });
});

describe("streamChat fallbacks (A9)", () => {
  const ok = (body: string) => (async () => new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } })) as unknown as typeof fetch;

  it("streams events and sends at most 20 latest turns", async () => {
    let sent: { messages: unknown[] } | null = null;
    const impl = (async (_u: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(SSE, { status: 200 });
    }) as unknown as typeof fetch;
    const turns = Array.from({ length: 30 }, (_, i) => ({ role: "user" as const, content: `m${i}` }));
    const events = await collect(streamChat(turns, { locale: "vi", fetchImpl: impl }));
    expect(events.at(-1)?.type).toBe("done");
    expect(sent!.messages).toHaveLength(20);
    expect((sent!.messages[19] as { content: string }).content).toBe("m29");
  });

  it("503 => AI_UPSTREAM_DOWN error event (fallback)", async () => {
    const impl = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "x" }], { locale: "vi", fetchImpl: impl }));
    expect(events).toEqual([{ type: "error", code: "AI_UPSTREAM_DOWN", message: "HTTP 503" }]);
    expect(isFallbackError("AI_UPSTREAM_DOWN")).toBe(true);
  });

  it("network failure => NETWORK error event", async () => {
    const impl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "x" }], { locale: "en", fetchImpl: impl }));
    expect(events[0]).toMatchObject({ type: "error", code: "NETWORK" });
  });

  it("no first delta within timeout => TIMEOUT error event", async () => {
    const impl = ((_u: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "x" }], { locale: "vi", fetchImpl: impl, timeoutMs: 20 }));
    expect(events).toEqual([{ type: "error", code: "TIMEOUT", message: "timeout" }]);
    expect(isFallbackError("TIMEOUT")).toBe(true);
  });

  it("LLM_UNAVAILABLE from engine passes through and counts as fallback", async () => {
    const events = await collect(streamChat([{ role: "user", content: "x" }], { locale: "vi", fetchImpl: ok('event: error\ndata: {"code":"LLM_UNAVAILABLE","message":"down"}\n\n') }));
    expect(events).toEqual([{ type: "error", code: "LLM_UNAVAILABLE", message: "down" }]);
    expect(isFallbackError("LLM_UNAVAILABLE")).toBe(true);
  });

  // F3 (R07): MỌI lỗi trước delta đầu ⇒ web rơi về bộ lọc cũ, kể cả khi mã không phải 503.
  it.each([400, 413, 429, 500, 502, 503])("HTTP %i trước delta đầu ⇒ event error + isFallbackError", async (status) => {
    const impl = (async () => new Response("{}", { status })) as unknown as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "x" }], { locale: "vi", fetchImpl: impl }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error" });
    expect(isFallbackError((events[0] as { code: string }).code)).toBe(true);
  });

  it.each(["TOOL_FAILED", "BAD_REQUEST", "UNKNOWN", "HTTP_429", "NETWORK", "TIMEOUT"])("event/mã lỗi %s trước delta đầu ⇒ fallback", (code) => {
    expect(isFallbackError(code)).toBe(true);
  });
});
