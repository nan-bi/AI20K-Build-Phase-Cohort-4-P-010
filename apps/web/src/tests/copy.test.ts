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

  const HOLD_REGEX =
    /(giữ chỗ|giữ căn|khoá căn|khóa căn|holding)[^\n]{0,20}24 ?(giờ|h)\b|24 ?(giờ|h)[^\n]{0,20}(giữ chỗ|giữ căn)/i;

  it("(1) Không còn chuỗi '24h/24 giờ' đi kèm giữ chỗ/khoá căn trong src/components và src/lib", () => {
    const files = [...readDirRecursive(componentsDir), ...readDirRecursive(libDir)];
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        // Bỏ qua chú thích liên quan tới WP9 hoặc giải thích lịch sử nếu có
        if (line.includes("interest24h") || line.includes("Khoá cửa 24h")) return;
        if (HOLD_REGEX.test(line)) {
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
      expect.fail(`Tìm thấy ${violations.length} vị trí còn chứa chuỗi 24h giữ chỗ:\n${details}`);
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
});
