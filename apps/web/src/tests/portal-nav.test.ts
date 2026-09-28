import { describe, it, expect } from "vitest";
import { isNavActive } from "@/components/portal/PortalShell";

describe("isNavActive", () => {
  it("khớp chính xác href", () => {
    expect(isNavActive("/host/dispatch", { href: "/host/dispatch" })).toBe(true);
  });

  it("không khớp khi href chỉ là tiền tố chuỗi (dispatchx)", () => {
    expect(isNavActive("/host/dispatchx", { href: "/host/dispatch" })).toBe(false);
  });

  it("khớp đường dẫn con (subpath /admin/inventory/abc)", () => {
    expect(isNavActive("/admin/inventory/abc", { href: "/admin/inventory" })).toBe(true);
  });

  it("khớp tiền tố trong match (subpath /host/viewing/bk-101)", () => {
    expect(
      isNavActive("/host/viewing/bk-101", {
        href: "/host/dispatch",
        match: ["/host/viewing"],
      }),
    ).toBe(true);
  });

  it("không khớp tiền tố trong match khi chỉ là tiền tố chuỗi (viewingx)", () => {
    expect(
      isNavActive("/host/viewingx", {
        href: "/host/dispatch",
        match: ["/host/viewing"],
      }),
    ).toBe(false);
  });

  it("không khớp tiền tố không liên quan (/host/earnings)", () => {
    expect(
      isNavActive("/host/earnings", {
        href: "/host/dispatch",
        match: ["/host/viewing"],
      }),
    ).toBe(false);
  });
});
