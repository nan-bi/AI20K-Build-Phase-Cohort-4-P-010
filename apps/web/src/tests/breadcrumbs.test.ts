import { describe, expect, it } from "vitest";
import { buildCrumbs } from "@/components/ui/Breadcrumbs";

const root = { href: "/admin/dashboard", label: "Quản trị nền tảng" };
const labels = {
  "/admin/dashboard": "Tổng quan",
  "/admin/contracts": "Hợp đồng",
  "/admin/contracts/parties": "Theo bên ký",
  "/admin/hosts": "Field Host",
};
const text = (path: string, registered?: Record<string, string>) =>
  buildCrumbs(path, { root, labels, registered }).map((c) => c.label);

describe("buildCrumbs", () => {
  it("trang chủ của cổng: chỉ có gốc, không lặp mục menu cùng đường dẫn (tránh trùng key)", () => {
    const crumbs = buildCrumbs("/admin/dashboard", { root, labels });
    expect(crumbs.map((c) => c.label)).toEqual(["Quản trị nền tảng"]);
  });

  it("mọi crumb trong một chuỗi có href khác nhau", () => {
    for (const path of ["/admin/dashboard", "/admin/hosts/9f1c", "/admin/contracts/parties/abc"]) {
      const hrefs = buildCrumbs(path, { root, labels }).map((c) => c.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("trang menu khác: gốc + mục menu", () => {
    expect(text("/admin/hosts")).toEqual(["Quản trị nền tảng", "Field Host"]);
  });

  it("trang con tĩnh dùng nhãn khai báo, mỗi crumb là link tích luỹ", () => {
    const crumbs = buildCrumbs("/admin/contracts/parties", { root, labels });
    expect(crumbs.map((c) => c.href)).toEqual(["/admin/dashboard", "/admin/contracts", "/admin/contracts/parties"]);
    expect(crumbs.map((c) => c.label)).toEqual(["Quản trị nền tảng", "Hợp đồng", "Theo bên ký"]);
  });

  it("đoạn cuối là id chưa có tên ⇒ 'Chi tiết'; có tên đã đăng ký ⇒ dùng tên thật", () => {
    expect(text("/admin/hosts/9f1c")).toEqual(["Quản trị nền tảng", "Field Host", "Chi tiết"]);
    expect(text("/admin/hosts/9f1c", { "/admin/hosts/9f1c": "Lê Quốc Bảo" })).toEqual(["Quản trị nền tảng", "Field Host", "Lê Quốc Bảo"]);
  });

  it("đoạn giữa không có trang/nhãn thì bỏ qua, không hiện slug thô", () => {
    expect(text("/admin/contracts/parties/abc")).toEqual(["Quản trị nền tảng", "Hợp đồng", "Theo bên ký", "Chi tiết"]);
    expect(text("/admin/unknown/abc")).toEqual(["Quản trị nền tảng", "Chi tiết"]);
  });
});
