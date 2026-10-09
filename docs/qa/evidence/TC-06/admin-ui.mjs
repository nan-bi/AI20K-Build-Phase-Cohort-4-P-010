// Duyệt Cổng Admin CHỈ ĐỌC: không bấm nút ghi. Dùng Edge cài sẵn (channel msedge).
// Không có ADMIN_EMAIL/ADMIN_PASSWORD ⇒ chỉ kiểm hành vi khi chưa đăng nhập.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const API = process.env.API || "http://localhost:4000";
const OUT = path.resolve(process.argv[2] || "shots");
fs.mkdirSync(OUT, { recursive: true });

const STATIC = [
  "/admin/dashboard", "/admin/inventory", "/admin/bookings", "/admin/contracts",
  "/admin/contracts/parties", "/admin/contracts/templates", "/admin/hosts",
  "/admin/commission", "/admin/settings",
];
// Trang động: lấy link đầu tiên khớp mẫu trên trang danh sách.
const DYNAMIC = [
  ["/admin/inventory", /^\/admin\/inventory\/[^/]+$/],
  ["/admin/hosts", /^\/admin\/hosts\/[^/]+$/],
  ["/admin/contracts", /^\/admin\/contracts\/(?!parties|templates)[^/]+$/],
  ["/admin/contracts/parties", /^\/admin\/contracts\/parties\/[^/]+$/],
  ["/admin/contracts/templates", /^\/admin\/contracts\/templates\/[^/]+$/],
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
const page = await ctx.newPage();
const results = [];
let current = null;
page.on("console", (m) => { if (m.type() === "error" && current) current.consoleErrors.push(m.text().slice(0, 200)); });
page.on("response", (r) => {
  if (current && r.url().includes("/api/v1/") && r.status() >= 400) current.apiErrors.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
});
page.on("request", (r) => {
  if (current && r.url().includes("/api/v1/") && r.method() !== "GET") current.writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
});

async function visit(route, label = route) {
  current = { route: label, consoleErrors: [], apiErrors: [], writes: [] };
  const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ status: () => "ERR " + e.message }));
  await page.waitForTimeout(Number(process.env.DELAY || 1500));
  current.status = resp?.status?.();
  current.finalUrl = page.url().replace(BASE, "");
  current.h1 = (await page.locator("h1").first().textContent({ timeout: 2000 }).catch(() => ""))?.trim();
  current.errorText = await page.getByText(/Không tải được|Lỗi|Đã xảy ra lỗi|Something went wrong/i).first().textContent({ timeout: 500 }).catch(() => null);
  const file = label.replace(/^\//, "").replace(/[\/\[\]]/g, "_") + ".png";
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  current.shot = file;
  results.push(current);
  return current;
}

// Pha 1: chưa đăng nhập.
for (const r of ["/admin/dashboard", "/admin/hosts"]) await visit(r, "anon" + r);
const anonApi = await ctx.request.get(API + "/api/v1/admin/bi-funnel");
const anonApiFh = await ctx.request.get(API + "/api/v1/admin/field-hosts");

// Pha 2: đăng nhập admin nếu có thông tin.
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
let loggedIn = false;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  await page.goto(BASE + "/admin/login?tab=admin", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 30000 }).then(() => (loggedIn = true)).catch(() => {});
  if (loggedIn) {
    for (const r of STATIC) await visit(r);
    for (const [list, re] of DYNAMIC) {
      await page.goto(BASE + list, { waitUntil: "networkidle" });
      await page.waitForTimeout(Number(process.env.DELAY || 1500));
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
      const href = hrefs.find((h) => h && re.test(h.split("?")[0]));
      if (href) await visit(href, list + "/[detail]");
      else results.push({ route: list + "/[detail]", note: "không tìm thấy link chi tiết trên trang danh sách" });
    }
  }
}

await browser.close();
const summary = {
  anonApi: { biFunnel: anonApi.status(), fieldHosts: anonApiFh.status() },
  loggedIn, credentialsGiven: Boolean(ADMIN_EMAIL && ADMIN_PASSWORD), results,
};
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
