import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryDef } from "@/lib/landlord/queries";
import { invalidateLandlordData, prefetchLandlord, setLandlordCacheOwner, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";

const ok = <T>(data: T) => Promise.resolve({ ok: true, status: 200, data });
const def = <T>(key: string, data: T): QueryDef<T> & { fetch: ReturnType<typeof vi.fn> } => ({ key, fetch: vi.fn(() => ok(data)) });

/** Render phía server chạy initializer của useState nên cho biết hook trả gì ở lần render ĐẦU (trước mọi effect/mạng). */
function firstRender<T>(q: QueryDef<T>): string {
  function Probe() {
    const { state } = useLandlordQuery(q);
    return createElement("p", null, state.status === "ready" ? `ready:${JSON.stringify(state.data)}` : state.status);
  }
  return renderToString(createElement(Probe));
}

describe("cache dữ liệu cổng Chủ nhà (stale-while-revalidate)", () => {
  beforeEach(() => {
    invalidateLandlordData();
  });

  it("chưa có cache → lần render đầu là loading", () => {
    expect(firstRender(def("t:none", 1))).toContain("loading");
  });

  it("đã tải trước → lần render đầu có dữ liệu NGAY (bấm vào là thấy, không chờ API)", async () => {
    const q = def("t:prefetched", [7]);
    prefetchLandlord(q);
    await vi.waitFor(() => expect(firstRender(q)).toContain("ready:[7]"));
  });

  it("tải trước cùng key nhiều lần chỉ gọi API một lần (dedupe) và không gọi lại khi đã có cache", async () => {
    const q = def("t:dedupe", 1);
    prefetchLandlord(q);
    prefetchLandlord(q);
    await vi.waitFor(() => expect(firstRender(q)).toContain("ready:1"));
    prefetchLandlord(q);
    expect(q.fetch).toHaveBeenCalledTimes(1);
  });

  it("request lỗi không được ghi vào cache", async () => {
    const q: QueryDef<number> = { key: "t:fail", fetch: () => Promise.resolve({ ok: false, status: 500, data: 0 as never, message: "lỗi" }) };
    prefetchLandlord(q);
    await new Promise((r) => setTimeout(r, 10));
    expect(firstRender(q)).toContain("loading");
  });

  it("đổi tài khoản trong cùng tab → bỏ cache của người trước; cùng tài khoản thì giữ", async () => {
    setLandlordCacheOwner("user-a");
    const q = def("t:owner", 1);
    prefetchLandlord(q);
    await vi.waitFor(() => expect(firstRender(q)).toContain("ready:1"));

    setLandlordCacheOwner("user-a");
    expect(firstRender(q)).toContain("ready:1");

    setLandlordCacheOwner("user-b");
    expect(firstRender(q)).toContain("loading");
  });

  it("invalidate (sau khi ký gửi/thoát ủy quyền) xóa cache để lần sau lấy dữ liệu mới", async () => {
    const q = def("t:invalidate", 1);
    prefetchLandlord(q);
    await vi.waitFor(() => expect(firstRender(q)).toContain("ready:1"));
    invalidateLandlordData();
    expect(firstRender(q)).toContain("loading");
  });

  it("tải trước nhiều căn chỉ chạy tối đa 2 request cùng lúc (không dồn cả loạt vào DB)", async () => {
    let active = 0;
    let peak = 0;
    const mk = (i: number): QueryDef<number> => ({
      key: `t:conc${i}`,
      fetch: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 15));
        active -= 1;
        return { ok: true, status: 200, data: i };
      },
    });
    const defs = Array.from({ length: 6 }, (_, i) => mk(i));
    defs.forEach((d) => prefetchLandlord(d));
    await vi.waitFor(() => expect(firstRender(defs[5])).toContain("ready:5"), { timeout: 2000 });
    expect(peak).toBe(2);
  });
});
