import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const USER = { id: "u1", email: "khach@example.com", fullName: "Khách", role: "tenant", portal: "tenant", isHostVerified: false, hostRoles: [] };

function sessionResponse(user: unknown) {
  return { ok: true, json: async () => ({ data: { user } }) } as unknown as Response;
}

describe("client session store (refreshSession)", () => {
  beforeEach(() => {
    vi.resetModules(); // store là biến module: mỗi test cần một bản mới
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("đọc lại phiên sau khi đăng nhập và trả về người dùng mới", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(sessionResponse(null)).mockResolvedValueOnce(sessionResponse(USER));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("@/lib/auth/client");

    expect((await refreshSession()).user).toBeNull(); // lúc mở trang: chưa đăng nhập
    const after = await refreshSession(); // sau khi đăng nhập
    expect(after).toEqual({ ready: true, user: USER });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lần đọc cũ về muộn không ghi đè lần đọc mới hơn", async () => {
    let releaseStale: (r: Response) => void = () => {};
    const stale = new Promise<Response>((resolve) => (releaseStale = resolve));
    const fetchMock = vi.fn().mockReturnValueOnce(stale).mockResolvedValueOnce(sessionResponse(USER));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("@/lib/auth/client");

    const first = refreshSession(); // lần đọc lúc mở trang (chậm)
    const second = await refreshSession(); // lần đọc sau đăng nhập (nhanh)
    expect(second.user).toEqual(USER);

    releaseStale(sessionResponse(null)); // lần đọc cũ về sau cùng, vẫn báo "chưa đăng nhập"
    const finalState = await first;
    expect(finalState.user).toEqual(USER);
  });

  it("backend không với tới được ⇒ coi như chưa đăng nhập, không ném lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { refreshSession } = await import("@/lib/auth/client");
    await expect(refreshSession()).resolves.toEqual({ ready: true, user: null });
  });
});
