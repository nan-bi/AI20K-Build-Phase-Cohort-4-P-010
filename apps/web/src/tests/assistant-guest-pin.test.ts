import { describe, expect, it } from "vitest";
import { CLIENT_ERROR, isFallbackError, streamChat, type AssistantEvent } from "@/lib/assistant/stream";
import { loginPrompt } from "@/lib/assistant/guest";
import { applyUnitsEvent, resolvePinned } from "@/lib/assistant/pin";

const collect = async (it: AsyncIterable<AssistantEvent>) => {
  const out: AssistantEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
};

describe("401 LOGIN_REQUIRED (fix2)", () => {
  it("parses to event error LOGIN_REQUIRED and is NOT a filter-fallback error", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ code: "LOGIN_REQUIRED", message: "x" }), { status: 401 })) as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "hi" }], { locale: "vi", fetchImpl }));
    expect(events).toEqual([{ type: "error", code: "LOGIN_REQUIRED", message: "login required" }]);
    expect(isFallbackError(CLIENT_ERROR.loginRequired)).toBe(false);
  });
  it("other 401 stays HTTP_401 (fallback)", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 401 })) as typeof fetch;
    const events = await collect(streamChat([{ role: "user", content: "hi" }], { locale: "vi", fetchImpl }));
    expect((events[0] as { code: string }).code).toBe("HTTP_401");
  });
});

describe("giới hạn lượt khách (fix2): server chốt, web không tự đếm", () => {
  it("ChatExperience không còn bộ đếm localStorage/chặn phía client (lỗi: người đã đăng nhập vẫn bị mời đăng nhập)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/chat/ChatExperience.tsx", "utf8");
    expect(src).not.toMatch(/guestQuotaExhausted|recordGuestTurn|guestTurnsUsed|vinstay\.guestChatTurns/);
    expect(src).toMatch(/LOGIN_REQUIRED/);
  });
  it("tin mời đăng nhập có CTA /login, vi và en", () => {
    expect(loginPrompt(false).cta).toEqual({ label: "Đăng nhập", href: "/login?next=/" });
    expect(loginPrompt(true).cta.label).toBe("Sign in");
  });
});

describe("event units ⇒ màn preview (fix2)", () => {
  const catalog = ["A", "B", "C", "D"];
  it("≥1 mã khớp ⇒ searched=true, tab results, ghim đúng thứ tự bot", () => {
    expect(applyUnitsEvent(["C", "A", "ZZZ", "C", "B"], catalog)).toEqual({ searched: true, tab: "results", pinned: ["C", "A", "B"], suggested: ["C", "A", "B"], focused: [] });
  });
  it("không mã nào khớp / rỗng ⇒ null (giữ layout hero)", () => {
    expect(applyUnitsEvent(["ZZZ"], catalog)).toBeNull();
    expect(applyUnitsEvent([], catalog)).toBeNull();
    expect(resolvePinned(undefined, catalog)).toEqual([]);
  });
});
