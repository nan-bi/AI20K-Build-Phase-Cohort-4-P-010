import { describe, expect, it } from "vitest";
import { loginPathFor, portalForPath } from "@/lib/auth/portals";
import { parseSetCookie } from "@/lib/auth/setCookie";
import { errorMessage, unwrap } from "@/components/auth/authApi";

describe("portalForPath", () => {
  it("map đường dẫn sang cổng", () => {
    expect(portalForPath("/admin/dashboard")).toBe("admin");
    expect(portalForPath("/landlord/dashboard")).toBe("landlord");
    expect(portalForPath("/host/dispatch")).toBe("host");
    expect(portalForPath("/login")).toBeNull();
    expect(portalForPath("/")).toBeNull();
  });
  it("trang đăng nhập theo cổng", () => {
    expect(loginPathFor("landlord")).toBe("/login?tab=landlord");
    expect(loginPathFor("host")).toBe("/admin/login?tab=host");
    expect(loginPathFor("admin")).toBe("/admin/login");
  });
});

describe("parseSetCookie", () => {
  it("đọc cookie đặt", () => {
    expect(parseSetCookie("vs_access=abc; Max-Age=3600; Path=/; HttpOnly")).toEqual({ name: "vs_access", value: "abc", expired: false });
  });
  it("nhận diện cookie bị xoá", () => {
    expect(parseSetCookie("vs_access=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT")?.expired).toBe(true);
    expect(parseSetCookie("vs_access=x; Max-Age=0")?.expired).toBe(true);
  });
  it("bỏ qua chuỗi rác", () => {
    expect(parseSetCookie("garbage")).toBeNull();
  });
});

describe("unwrap", () => {
  it("mở envelope thành công", () => {
    expect(unwrap({ ok: true, status: 200 }, { success: true, data: { a: 1 } })).toEqual({ ok: true, status: 200, data: { a: 1 } });
  });
  it("lấy mã lỗi của backend", () => {
    expect(unwrap({ ok: false, status: 401 }, { success: false, code: "invalid_credentials" })).toMatchObject({ ok: false, code: "invalid_credentials" });
    expect(errorMessage("invalid_credentials")).toMatch(/không đúng/);
    expect(errorMessage("zzz")).toMatch(/Có lỗi/);
  });
});
