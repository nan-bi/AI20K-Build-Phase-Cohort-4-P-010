import { describe, expect, it } from "vitest";
import { authenticate, encodeRoleCookie, loginUrl, parseRoleCookie, postLoginTarget, requiredRole } from "@/lib/mock/auth";

describe("authenticate", () => {
  it("đăng nhập đúng cho cả 4 vai trò", () => {
    expect(authenticate("minhanh@vinstay.demo", "demo1234", "public")).toEqual({ ok: true, role: "tenant" });
    expect(authenticate("0912345678", "demo1234", "public")).toEqual({ ok: true, role: "tenant" });
    expect(authenticate("hung.nguyen@vinstay.demo", "demo1234", "public")).toEqual({ ok: true, role: "landlord" });
    expect(authenticate("0934556201", "demo1234", "host")).toEqual({ ok: true, role: "host" });
    expect(authenticate("ops@vinstay.vn", "admin1234", "admin")).toEqual({ ok: true, role: "admin" });
  });

  it("sai mật khẩu ⇒ invalid_credentials", () => {
    expect(authenticate("minhanh@vinstay.demo", "sai-mat-khau", "public")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(authenticate("ops@vinstay.vn", "sai", "admin")).toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("đúng tài khoản nhưng sai cổng ⇒ wrong_portal", () => {
    expect(authenticate("0934556201", "demo1234", "public")).toEqual({ ok: false, error: "wrong_portal" });
    expect(authenticate("ops@vinstay.vn", "admin1234", "public")).toEqual({ ok: false, error: "wrong_portal" });
    expect(authenticate("minhanh@vinstay.demo", "demo1234", "host")).toEqual({ ok: false, error: "wrong_portal" });
  });

  it("rỗng ⇒ empty", () => {
    expect(authenticate("", "demo1234", "public")).toEqual({ ok: false, error: "empty" });
    expect(authenticate("minhanh@vinstay.demo", "", "public")).toEqual({ ok: false, error: "empty" });
  });

  it("không phân biệt hoa thường và khoảng trắng ở định danh", () => {
    expect(authenticate("  MinhAnh@VinStay.Demo  ", "demo1234", "public")).toEqual({ ok: true, role: "tenant" });
    expect(authenticate("OPS@VINSTAY.VN", "admin1234", "admin")).toEqual({ ok: true, role: "admin" });
  });
});

describe("requiredRole", () => {
  it("trang đăng nhập cổng nội bộ là công khai", () => {
    expect(requiredRole("/admin/login")).toBeNull();
    expect(requiredRole("/host/login")).toBeNull();
  });
  it("trang công khai chung", () => {
    expect(requiredRole("/login")).toBeNull();
  });
  it("trang cần vai trò", () => {
    expect(requiredRole("/account/bookings")).toBe("tenant");
    expect(requiredRole("/admin/dashboard")).toBe("admin");
    expect(requiredRole("/landlord/units")).toBe("landlord");
    expect(requiredRole("/host/dispatch")).toBe("host");
    expect(requiredRole("/booking")).toBe("tenant");
    expect(requiredRole("/booking/VS-4F7K2")).toBe("tenant");
  });
});

describe("encodeRoleCookie & parseRoleCookie (SPEC-P01 §4)", () => {
  it("mã hoá và giải mã cookie vai trò có phiên bản v2", () => {
    expect(encodeRoleCookie("host")).toBe("v2.host");
    expect(encodeRoleCookie("landlord")).toBe("v2.landlord");
    expect(parseRoleCookie("v2.landlord")).toBe("landlord");
    expect(parseRoleCookie("landlord")).toBeNull();
    expect(parseRoleCookie("v1.admin")).toBeNull();
    expect(parseRoleCookie(undefined)).toBeNull();
    expect(parseRoleCookie(null)).toBeNull();
    expect(parseRoleCookie("v2.")).toBeNull();
    expect(parseRoleCookie("v2.xyz")).toBeNull();
  });
});

describe("loginUrl", () => {
  it("đưa về đúng cổng cho từng vai trò", () => {
    expect(loginUrl("admin")).toBe("/admin/login");
    expect(loginUrl("host")).toBe("/admin/login");
    expect(loginUrl("tenant")).toBe("/login");
    expect(loginUrl("landlord")).toBe("/login");
  });
  it("giữ next khi có", () => {
    expect(loginUrl("admin", "/admin/settings")).toBe("/admin/login?next=%2Fadmin%2Fsettings");
    expect(loginUrl("tenant", "/account")).toBe("/login?next=%2Faccount");
  });
});

describe("postLoginTarget (SPEC-P03 §4, §7)", () => {
  it("đưa về đúng trang sau khi đăng nhập", () => {
    expect(postLoginTarget("tenant", "/booking/VS-1")).toBe("/booking/VS-1");
    expect(postLoginTarget("tenant", "/units")).toBe("/units");
    expect(postLoginTarget("landlord", "/booking/VS-1")).toBe("/landlord/dashboard");
    expect(postLoginTarget("tenant", "//evil.com")).toBe("/");
  });
});

