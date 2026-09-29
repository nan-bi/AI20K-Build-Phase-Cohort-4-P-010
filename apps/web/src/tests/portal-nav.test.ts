import { describe, it, expect } from "vitest";
import { isNavActive } from "@/components/portal/PortalShell";
import { hostNavItems } from "@/components/portal/HostShell";

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

describe("hostNavItems theo vai", () => {
  it("chỉ có vai sale: hiển thị Lịch & yêu cầu, ẩn Thẩm định ký gửi", () => {
    const items = hostNavItems(["sale"], { pending: 2, awaitingInspect: 1 });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/host/dispatch");
    expect(hrefs).not.toContain("/host/inspections");
    expect(hrefs).toContain("/host/earnings");
    const dispatchItem = items.find((i) => i.href === "/host/dispatch");
    expect(dispatchItem?.badge).toBe(2);
  });

  it("chỉ có vai inspector: hiển thị Thẩm định ký gửi, ẩn Lịch & yêu cầu", () => {
    const items = hostNavItems(["inspector"], { pending: 3, awaitingInspect: 5 });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).not.toContain("/host/dispatch");
    expect(hrefs).toContain("/host/inspections");
    expect(hrefs).toContain("/host/earnings");
    const inspectItem = items.find((i) => i.href === "/host/inspections");
    expect(inspectItem?.badge).toBe(5);
  });

  it("có cả hai vai sale và inspector: hiển thị đầy đủ cả 2 mục điều hướng", () => {
    const items = hostNavItems(["sale", "inspector"], { pending: 1, awaitingInspect: 0 });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/host/dispatch");
    expect(hrefs).toContain("/host/inspections");
    expect(hrefs).toContain("/host/earnings");
    expect(hrefs).toContain("/host/handbook");
    expect(hrefs).toContain("/host/account");
    expect(items.length).toBe(5);
  });
});
