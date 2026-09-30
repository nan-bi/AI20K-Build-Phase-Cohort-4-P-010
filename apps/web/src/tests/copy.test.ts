import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readDirRecursive(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readDirRecursive(fullPath));
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("WP8 — Chặn tái phát chuỗi 24h và kiểm tra vùng cấm", () => {
  const srcDir = path.resolve(__dirname, "..");
  const componentsDir = path.join(srcDir, "components");
  const libDir = path.join(srcDir, "lib");

  it("(a) Không file nào trong src/components và src/lib chứa HOLD_DAYS hoặc HOLD_MS", () => {
    const files = [...readDirRecursive(componentsDir), ...readDirRecursive(libDir)];
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (/\b(HOLD_DAYS|HOLD_MS)\b/.test(line)) {
          violations.push({
            file: path.relative(srcDir, file),
            line: idx + 1,
            text: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join("\n");
      expect.fail(`Tìm thấy ${violations.length} vị trí còn chứa HOLD_DAYS hoặc HOLD_MS:\n${details}`);
    }
  });

  it("(b) Không dòng nào chứa 'giữ'/'khoá'/'khóa' và '7 ngày' trong cùng dòng trong src/", () => {
    const files = readDirRecursive(srcDir).filter((f) => !f.endsWith("copy.test.ts"));
    const HOLD_7D_REGEX = /(giữ|khoá|khóa)[^\n]*7\s*ngày|7\s*ngày[^\n]*(giữ|khoá|khóa)/i;
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (line.includes("trước 7 ngày") || line.includes("07 ngày làm việc")) return;
        if (HOLD_7D_REGEX.test(line)) {
          violations.push({
            file: path.relative(srcDir, file),
            line: idx + 1,
            text: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join("\n");
      expect.fail(`Tìm thấy ${violations.length} vị trí còn chứa giữ/khoá 7 ngày:\n${details}`);
    }
  });

  it("(c) HOUSE_RULES có đúng 6 mục và đủ 6 id chuẩn", async () => {
    const mod = await import("@/lib/mock/house-rules");
    expect(mod.HOUSE_RULES).toBeDefined();
    expect(mod.HOUSE_RULES.length).toBe(6);
    const expectedIds = ["no_sublease", "structure", "ev_charging", "fire_cooking", "quiet_pets", "bql_fines"];
    expect(mod.HOUSE_RULES.map((r) => r.id)).toEqual(expectedIds);
  });

  it("(d) Mỗi body trong HOUSE_RULES không chứa '7 ngày' và không rỗng", async () => {
    const mod = await import("@/lib/mock/house-rules");
    for (const r of mod.HOUSE_RULES) {
      expect(r.body).toBeTruthy();
      expect(r.body.trim().length).toBeGreaterThan(0);
      expect(r.body).not.toContain("7 ngày");
    }
  });

  it("(2) Vùng cấm: src/components/host/** tuyệt đối không render <VietQR", () => {
    const hostDir = path.join(componentsDir, "host");
    const hostFiles = readDirRecursive(hostDir);
    const violations: string[] = [];

    for (const file of hostFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("<VietQR")) {
        violations.push(path.relative(srcDir, file));
      }
    }

    expect(violations, "Tìm thấy <VietQR trong components/host/").toEqual([]);
  });

  it("(3) Hồ sơ 10: Chặn tái phát Đã kín, Ký thỏa thuận cọc, Ký Thỏa thuận, tenantSignAgreement trong src/", () => {
    const files = readDirRecursive(srcDir).filter((f) => !f.endsWith("copy.test.ts"));
    const forbidden = ["Đã kín", "Ký thỏa thuận cọc", "Ký Thỏa thuận", "tenantSignAgreement"];
    const violations: { file: string; line: number; text: string; term: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        for (const term of forbidden) {
          if (line.includes(term)) {
            violations.push({
              file: path.relative(srcDir, file),
              line: idx + 1,
              text: line.trim(),
              term,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:${v.line} (${v.term}) -> ${v.text}`).join("\n");
      expect.fail(`Tìm thấy ${violations.length} vị trí vi phạm từ ngữ cấm hồ sơ 10:\n${details}`);
    }
  });
});

