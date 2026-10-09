// Gõ câu hỏi vào ô chat trang chủ như người dùng thật (khách chưa đăng nhập). Chỉ đọc, không đặt lịch.
// node chat-ui.mjs <outDir> "<câu 1>" "<câu 2>" ...  (mỗi câu một trang mới)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = path.resolve(process.argv[2]);
const QUESTIONS = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
for (const [i, q] of QUESTIONS.entries()) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  if (process.env.TENANT_EMAIL) {
    const lr = await ctx.request.post(BASE + "/api/v1/auth/login", { data: { email: process.env.TENANT_EMAIL, password: process.env.TENANT_PASSWORD, portal: "tenant" } });
    if (lr.status() !== 200) throw new Error("login " + lr.status());
  }
  const page = await ctx.newPage();
  const net = [];
  page.on("response", (r) => { if (r.url().includes("/api/v1/")) net.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  const box = page.locator("textarea").first();
  await box.fill(q);
  await box.press("Enter");
  await page.waitForTimeout(Number(process.env.WAIT || 10000));
  const text = (await page.locator("main").innerText().catch(() => page.locator("body").innerText())).replace(/\s+\n/g, "\n");
  const at = text.lastIndexOf(q);
  const answer = (at >= 0 ? text.slice(at + q.length) : text).trim().slice(0, 900);
  const file = `q${i + 1}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  results.push({ q, answer, emptyState: /Không có căn nào vừa với bộ lọc này/.test(text), net, shot: file });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
