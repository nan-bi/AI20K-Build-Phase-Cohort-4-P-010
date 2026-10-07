import { sanitizeAssumed, sanitizeContext, type AssumedDefaults, type SearchContext } from "./context";

/** Client SSE cho chatbot: POST /api/v1/assistant/chat → async iterator các sự kiện (01-CONTRACTS §5). */

export type AssistantEvent =
  | { type: "delta"; text: string }
  | { type: "units"; unitCodes: string[]; mode: "search" | "focus"; matched?: number; criteria?: SearchContext; matchedCodes?: string[]; assumed?: AssumedDefaults }
  | { type: "done"; model: string; toolCalls: number; ms: number }
  | { type: "error"; code: string; message: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Mã lỗi phía client (không đến từ ai-engine): relay 503, mạng đứt, quá 25s chưa có delta đầu. */
export const CLIENT_ERROR = { down: "AI_UPSTREAM_DOWN", timeout: "TIMEOUT", network: "NETWORK", loginRequired: "LOGIN_REQUIRED" } as const;

export const FIRST_DELTA_TIMEOUT_MS = 25_000;
export const MAX_TURNS = 20;
/** Số căn tối đa ghim vào preview (khớp ai-engine MAX_MATCHED_CODES). */
export const MAX_MATCHED = 20;

/**
 * Mọi lỗi xảy ra TRƯỚC delta đầu (HTTP ≠ 2xx gồm 400/413/429/500/502/503, mạng, timeout, event `error` của engine) ⇒ web rơi
 * về bộ lọc cũ cho lượt đó (F3). Lỗi SAU delta đầu do caller xử lý riêng (đã có câu trả lời dở).
 */
export const isFallbackError = (code: string) => code.length > 0 && code !== CLIENT_ERROR.loginRequired;

function toEvent(name: string, raw: string): AssistantEvent | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  switch (name) {
    case "delta":
      return typeof data.text === "string" ? { type: "delta", text: data.text } : null;
    case "units":
      if (!Array.isArray(data.unitCodes)) return null;
      return {
        type: "units",
        unitCodes: data.unitCodes.filter((c): c is string => typeof c === "string"),
        mode: data.mode === "focus" ? "focus" : "search",
        ...(typeof data.matched === "number" ? { matched: data.matched } : {}),
        ...(Array.isArray(data.matchedCodes) ? { matchedCodes: data.matchedCodes.filter((c): c is string => typeof c === "string").slice(0, MAX_MATCHED) } : {}),
        ...(sanitizeAssumed(data.assumed) ? { assumed: sanitizeAssumed(data.assumed)! } : {}),
        ...(data.criteria !== undefined ? { criteria: sanitizeContext(data.criteria) ?? undefined } : {}),
      };
    case "done":
      return { type: "done", model: String(data.model ?? ""), toolCalls: Number(data.toolCalls ?? 0), ms: Number(data.ms ?? 0) };
    case "error":
      return { type: "error", code: String(data.code ?? "UNKNOWN"), message: String(data.message ?? "") };
    default:
      return null;
  }
}

/** Parser SSE: chịu chunk cắt giữa dòng/giữa ký tự UTF-8, CRLF, nhiều `data:` trong một event. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<AssistantEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = function* (block: string): Generator<AssistantEvent> {
    let name = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) return;
    const event = toEvent(name, data.join("\n"));
    if (event) yield event;
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let at: number;
      while ((at = buffer.indexOf("\n\n")) >= 0) {
        yield* flush(buffer.slice(0, at));
        buffer = buffer.slice(at + 2);
      }
      if (done) break;
    }
    if (buffer.trim()) yield* flush(buffer);
  } finally {
    reader.releaseLock();
  }
}

interface StreamOptions {
  locale: "vi" | "en";
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Tiêu chí bot đang nhớ (từ event `units.criteria` gần nhất); gửi kèm mỗi request. */
  searchContext?: SearchContext | null;
}

/**
 * Gọi relay và trả các sự kiện. Mọi lỗi hạ tầng (503, mạng, timeout 25s chưa có delta đầu) được đổi thành
 * một event `error` với mã client (`AI_UPSTREAM_DOWN`/`TIMEOUT`/`NETWORK`) — caller không phải try/catch.
 */
export async function* streamChat(messages: ChatTurn[], { locale, signal, timeoutMs = FIRST_DELTA_TIMEOUT_MS, fetchImpl = fetch, searchContext }: StreamOptions): AsyncGenerator<AssistantEvent> {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  const fail = (code: string, message: string): AssistantEvent => ({ type: "error", code, message });

  try {
    let res: Response;
    try {
      res = await fetchImpl("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: messages.slice(-MAX_TURNS), locale, ...(searchContext ? { searchContext } : {}) }),
        signal: controller.signal,
      });
    } catch {
      yield timedOut ? fail(CLIENT_ERROR.timeout, "timeout") : fail(CLIENT_ERROR.network, "network");
      return;
    }
    if (!res.ok || !res.body) {
      if (res.status === 401) {
        const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
        if (body?.code === CLIENT_ERROR.loginRequired) {
          yield fail(CLIENT_ERROR.loginRequired, "login required");
          return;
        }
      }
      yield fail(res.status === 503 ? CLIENT_ERROR.down : `HTTP_${res.status}`, `HTTP ${res.status}`);
      return;
    }
    try {
      for await (const event of parseSse(res.body)) {
        if (event.type === "delta") clear();
        yield event;
      }
    } catch {
      yield timedOut ? fail(CLIENT_ERROR.timeout, "timeout") : fail(CLIENT_ERROR.network, "network");
    }
  } finally {
    clear();
    signal?.removeEventListener("abort", onAbort);
    controller.abort();
  }
}
