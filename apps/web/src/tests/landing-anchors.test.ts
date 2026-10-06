import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_NAV } from "@/lib/nav/siteNav";

const SRC = join(__dirname, "..");
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Ngoại lệ có sẵn trước hồ sơ 17: id camelCase của form thẩm định (host/inspection, code cuộn tới lỗi
// theo tên trường). Ngoài phạm vi hồ sơ 17 nên liệt kê tường minh — xem "Câu hỏi mở" trong R01.
const LEGACY_IDS = new Set(["insp-netAreaM2", "insp-listingPhotoIds", "insp-doorPin"]);

function listTsx(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listTsx(full));
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const files = listTsx(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));

function collect(re: RegExp): { path: string; value: string }[] {
  const found: { path: string; value: string }[] = [];
  for (const f of files) for (const m of f.text.matchAll(re)) found.push({ path: f.path.replace(SRC, "src"), value: m[1] });
  return found;
}

describe("anchor tiếng Anh kebab-case (B2)", () => {
  it("mọi id=\"…\" literal hợp lệ", () => {
    const bad = collect(/\bid="([^"{}]+)"/g).filter((x) => !SLUG.test(x.value) && !LEGACY_IDS.has(x.value));
    expect(bad).toEqual([]);
  });
  it("mọi href=\"#…\" / href=\"/#…\" literal hợp lệ", () => {
    const bad = collect(/href="\/?#([^"{}]*)"/g).filter((x) => !SLUG.test(x.value));
    expect(bad).toEqual([]);
  });
  it("mọi /#x trong SITE_NAV có id=\"x\" trong Landing.tsx", () => {
    const landing = files.find((f) => f.path.endsWith("components/landing/Landing.tsx"))!.text;
    for (const item of SITE_NAV) {
      if (!item.href.startsWith("/#")) continue;
      expect(landing, item.href).toContain(`id="${item.href.slice(2)}"`);
    }
  });
});

// Slug tiếng Việt không dấu của bảng đổi tên 01-CONTRACTS §2 (cột "Cũ") — regex kebab-case cho qua nên phải cấm riêng.
const OLD_SLUGS = [
  "quy-trinh", "danh-cho-chu-nha", "tin-noi-bat", "bang-gia", "ve-chung-toi", "ve-vinstay",
  "can-ho", "vi-sao-vinstay", "ung-dung-di-dong", "cam-nang", "bat-dau", "ai-tro-ly",
];

describe("cấm slug cũ và anchor treo (F1)", () => {
  it("không id/href literal nào dùng slug cũ, SITE_NAV cũng không", () => {
    const used = [
      ...collect(/\bid=["']([^"'{}]+)["']/g),
      ...collect(/href=["']\/?#([^"'{}]*)["']/g),
    ].filter((x) => OLD_SLUGS.includes(x.value));
    expect(used).toEqual([]);
    const inNav = SITE_NAV.filter((item) => OLD_SLUGS.some((slug) => item.href.endsWith(`#${slug}`)));
    expect(inNav).toEqual([]);
  });
  it("mọi href=\"#x\" / \"/#x\" literal đều có id=\"x\" trong src (trừ #top)", () => {
    const ids = new Set(collect(/\bid=["']([^"'{}]+)["']/g).map((x) => x.value));
    const dangling = collect(/href=["']\/?#([^"'{}]*)["']/g).filter((x) => x.value !== "top" && !ids.has(x.value));
    expect(dangling).toEqual([]);
  });
  it("cấm href=\"#assistant\" thuần — mở trợ lý chỉ qua focusAssistant() (B3)", () => {
    expect(collect(/(href=(?:["']|\{["'])\/?#assistant["'])/g)).toEqual([]);
  });
});

describe("điểm vào trợ lý duy nhất (B3)", () => {
  it("không còn #ai-tro-ly; href=\"#top\" chỉ ở nút \"Lên đầu trang\" của footer", () => {
    expect(collect(/(ai-tro-ly)/g)).toEqual([]);
    const tops = collect(/(<a\b[^>]*href="#top"[^>]*>[^<]*(?:<[^>]*>[^<]*)*?<\/a>)/g);
    // Mỗi chỗ trỏ #top phải là nút có class backTop (Lên đầu trang) và nằm trong Landing.tsx.
    const bad = tops.filter((x) => !x.path.endsWith("components/landing/Landing.tsx") || !x.value.includes("styles.backTop"));
    expect(bad).toEqual([]);
    expect(collect(/(href="\/?#top")/g).length).toBe(1);
  });
});
