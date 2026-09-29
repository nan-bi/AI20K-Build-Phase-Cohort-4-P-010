import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  INVENTORY_CATALOG,
  blankInventory,
  passportSummary,
} from "@/lib/mock/inventory";
import { PASSPORT_ITEMS } from "@/lib/mock/types";

const ROOT_REPO = path.resolve(process.cwd(), "../..");
const LEASE_PATH = path.join(
  ROOT_REPO,
  "legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md"
);

describe("Inventory Catalog - SPEC-P01 §7 & SPEC-P03 / inventory.test.ts", () => {
  it("(1) INVENTORY_CATALOG.length === 32, code 1..32 liên tục, đủ 8 nhóm", () => {
    expect(INVENTORY_CATALOG).toHaveLength(32);

    const codes = INVENTORY_CATALOG.map((item) => item.code);
    const expectedCodes = Array.from({ length: 32 }, (_, i) => String(i + 1));
    expect(codes).toEqual(expectedCodes);

    const groups = new Set(INVENTORY_CATALOG.map((item) => item.group));
    expect(groups).toEqual(
      new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII"])
    );
  });

  it("(2) mọi name xuất hiện nguyên văn trong legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md", () => {
    expect(fs.existsSync(LEASE_PATH)).toBe(true);
    const leaseContent = fs.readFileSync(LEASE_PATH, "utf8");

    for (const item of INVENTORY_CATALOG) {
      expect(
        leaseContent.includes(item.name),
        `Hạng mục "${item.name}" (code: ${item.code}) không xuất hiện nguyên văn trong legal/06`
      ).toBe(true);
    }
  });

  it("(3) mỗi PASSPORT_ITEMS có >= 1 dòng catalog trỏ tới", () => {
    const coveredPassportItems = new Set(
      INVENTORY_CATALOG.map((item) => item.passport)
    );

    for (const p of PASSPORT_ITEMS) {
      expect(
        coveredPassportItems.has(p),
        `PassportItem "${p}" không có dòng nào trong catalog trỏ tới`
      ).toBe(true);
    }
  });

  it("(4) passportSummary tính trung bình đúng", () => {
    const blank = blankInventory();
    expect(blank).toHaveLength(32);

    // Khi tất cả present = false, avg phải là null và count = 0
    const emptySummary = passportSummary(blank);
    expect(emptySummary).toHaveLength(PASSPORT_ITEMS.length);
    for (const s of emptySummary) {
      expect(s.avg).toBeNull();
      expect(s.count).toBe(0);
    }

    // Đánh dấu 2 dòng của Sofa & bàn ghế (code 1 và code 2) với condition 80 và 100
    const sample = blank.map((line) => {
      if (line.code === "1") {
        return { ...line, present: true, condition: 80, photoAt: "2026-09-29T00:00:00Z" };
      }
      if (line.code === "2") {
        return { ...line, present: true, condition: 100, photoAt: "2026-09-29T00:00:00Z" };
      }
      return line;
    });

    const summary = passportSummary(sample);
    const sofaSummary = summary.find((s) => s.item === "Sofa & bàn ghế")!;
    expect(sofaSummary.count).toBe(2);
    expect(sofaSummary.avg).toBe(90); // (80 + 100) / 2
  });
});
