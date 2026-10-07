import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DIRECTIONS, defaultBathrooms } from "@/lib/units/facts";
import {
  detectListingTextViolation,
  serverFieldToKey,
  validateListing,
  type ListingTextReason,
} from "@/lib/units/listing-text";
import { LISTING_BYPASS, LISTING_OK } from "../../../../backend/src/modules/property/listing-text.cases";
// Bản server (cùng bảng mẫu P1-3): import thẳng để so khớp hành vi, không chép.
import { detectListingTextViolation as serverDetect } from "../../../../backend/src/modules/property/listing-text";

/** Bảng mẫu P1-3 (SPEC-P01 §6) + vài ca bổ sung. */
const VIOLATIONS: [string, ListingTextReason][] = [
  ["0979841233", "phone"],
  ["0979 841 233", "phone"],
  ["+84 979 841 233", "phone"],
  ["zalo.me/x", "url"],
  ["8tr5", "money"],
  ["7 triệu", "money"],
  ["500k", "money"],
  ["giá 8.000.000", "money"],
  ["https://example.com", "url"],
  ["3 m", "money"],
];
const VALID = ["Tầng 12", "45m²", "45 m2", "2PN 2WC", "View hồ", "Năm 2024", "1 WC", "Căn góc thoáng mát"];

describe("W1b chống lách (F1): bảng mẫu mở rộng, client = server", () => {
  it.each(LISTING_BYPASS)("chặn %s ⇒ %s", (text, reason) => {
    expect(detectListingTextViolation(text)).toBe(reason);
    expect(serverDetect(text)).toBe(reason);
  });
  it.each(LISTING_OK)("cho qua %s", (text) => {
    expect(detectListingTextViolation(text)).toBeNull();
    expect(serverDetect(text)).toBeNull();
  });
});

describe("W1 validator text client = server", () => {
  it.each(VIOLATIONS)("vi phạm %s ⇒ %s", (text, reason) => {
    expect(detectListingTextViolation(text)).toBe(reason);
    expect(serverDetect(text)).toBe(reason);
  });

  it.each(VALID)("hợp lệ %s", (text) => {
    expect(detectListingTextViolation(text)).toBeNull();
    expect(serverDetect(text)).toBeNull();
  });

  it("client và server cho cùng kết quả trên toàn bộ ngữ liệu (kể cả ca biên)", () => {
    const extra = ["", "  ", "Liên hệ em 09 7984 1233", "8,5tr", "1.000.000đ", "99999", "100000", "100.000", "www.abc.vn", "t.me/abc", "FB.COM/x", "Đ", "2tr đ", "15m", "15m2", "15m²", "ZALO.ME/abc", "tòa S1.02 tầng 12", "0123456789", "0912345678"];
    for (const t of [...VIOLATIONS.map((v) => v[0]), ...VALID, ...extra]) {
      expect(detectListingTextViolation(t), `"${t}"`).toBe(serverDetect(t));
    }
  });

  it("DIRECTIONS bản web khớp bản backend (8 giá trị)", () => {
    const src = readFileSync(resolve(__dirname, "../../../../backend/src/modules/property/unit-facts.ts"), "utf8");
    const body = /DIRECTIONS\s*=\s*\[([^\]]*)\]/.exec(src)?.[1] ?? "";
    const server = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(server).toHaveLength(8);
    expect([...DIRECTIONS]).toEqual(server);
  });

  it("validateListing: tô lỗi đúng ô, giới hạn độ dài, ô sạch không lỗi", () => {
    expect(validateListing({ title: "2PN góc view hồ", highlights: ["View hồ", "", ""], description: "Nội thất gỗ mới" })).toEqual({});
    const e = validateListing({ title: "Gọi 0979841233", highlights: ["", "Giá 8tr5", ""], description: "x".repeat(601) });
    expect(Object.keys(e).sort()).toEqual(["description", "highlights.1", "title"]);
    expect(validateListing({ title: "a".repeat(81), highlights: [], description: "" }).title).toMatch(/80/);
    expect(validateListing({ title: "", highlights: ["h".repeat(61), "", ""], description: "" })["highlights.0"]).toMatch(/60/);
  });

  it("serverFieldToKey: field của LISTING_TEXT_FORBIDDEN ⇒ đúng ô (highlights ⇒ ô vi phạm đầu tiên)", () => {
    expect(serverFieldToKey("title", [])).toBe("title");
    expect(serverFieldToKey("description", [])).toBe("description");
    expect(serverFieldToKey("highlights", ["OK", "Gọi 0979841233", ""])).toBe("highlights.1");
    expect(serverFieldToKey("lạ", [])).toBeNull();
  });

  it("số WC mặc định theo layout", () => {
    expect([defaultBathrooms("Studio"), defaultBathrooms("1PN"), defaultBathrooms("2PN"), defaultBathrooms("3PN")]).toEqual([1, 1, 2, 2]);
  });
});
