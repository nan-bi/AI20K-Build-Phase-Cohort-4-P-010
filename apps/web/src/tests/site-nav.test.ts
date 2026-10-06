import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_NAV, TENANT_MENU, activeNavKey } from "@/lib/nav/siteNav";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("activeNavKey (bảng chân lý 01 §1.1)", () => {
  const cases: [string, string | null, string | null][] = [
    ["/", null, "home"],
    ["/", "for-owners", "home"],
    ["/", "how-it-works", "how"],
    ["/", "featured", "home"],
    ["/units", "how-it-works", "units"],
    ["/units/VHOP-S1.02-12A08", null, "units"],
    ["/unitsx", null, null],
    ["/account", null, null],
    ["/account/saved", null, null],
    ["/booking", null, null],
    ["/booking/abc", null, null],
  ];
  it.each(cases)("%s + %s => %s", (pathname, section, expected) => {
    expect(activeNavKey(pathname, section)).toBe(expected);
  });
});

describe("SITE_NAV", () => {
  it("có đúng 3 mục, href hợp lệ", () => {
    expect(SITE_NAV).toHaveLength(3);
    for (const item of SITE_NAV) {
      const ok = item.href === "/" || item.href === "/units" || (item.href.startsWith("/#") && SLUG.test(item.href.slice(2)));
      expect(ok, item.href).toBe(true);
    }
  });
  it("không chứa lối khu tài khoản / chủ nhà; TENANT_MENU có /booking", () => {
    const hrefs = SITE_NAV.map((i) => i.href);
    expect(hrefs).not.toContain("/booking");
    expect(hrefs.some((h) => h.startsWith("/account"))).toBe(false);
    expect(hrefs.some((h) => h.includes("for-owners"))).toBe(false);
    expect(TENANT_MENU.map((i) => i.href)).toContain("/booking");
  });
});

describe("SiteNav.tsx (B1 — link chỉ từ SITE_NAV)", () => {
  it("không chứa literal `href: \"/` (không có mảng link riêng)", () => {
    const source = readFileSync(path.join(process.cwd(), "src/components/nav/SiteNav.tsx"), "utf8");
    expect(source).not.toMatch(/href:\s*"\//);
  });
});
