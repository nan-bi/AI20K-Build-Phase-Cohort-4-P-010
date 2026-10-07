import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toUnit } from "@/lib/tenant/adapters";
import type { TenantUnit } from "@/lib/tenant/types";

// UnitDetail kéo hook phiên/điều hướng/catalog và các khối nặng: giả lập để render được trong Node.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: (p: { href: string; children?: unknown }) => createElement("a", { href: p.href }, p.children as never) }));
vi.mock("@/lib/auth/client", () => ({ useSession: () => ({ user: null, ready: true }), refreshSession: async () => ({ user: null }) }));
vi.mock("@/lib/tenant/catalog", () => ({ useCatalog: () => ({ units: [], available: [], loading: false, error: null, reload: () => {} }), similarUnits: () => [] }));
vi.mock("@/components/booking/BookingSheet", () => ({ BookingSheet: () => null }));
vi.mock("@/components/unit/Gallery", () => ({ Gallery: () => null }));
vi.mock("@/components/unit/LocationMap", () => ({ LocationMap: () => null }));
vi.mock("@/components/unit/FavoriteButton", () => ({ FavoriteButton: () => null }));
vi.mock("@/components/ui/Toast", () => ({ toast: () => {} }));

const dto: TenantUnit = {
  code: "VHOP-S1.02-1208",
  building: "S1.02",
  zoneName: "The Sapphire 1",
  floor: 12,
  door: "08",
  layout: "2PN",
  layoutLabel: "2PN",
  bedrooms: 2,
  bathrooms: 2,
  areaM2: 62,
  direction: "Đông Nam",
  view: "Hồ điều hòa",
  furnishing: "full",
  items: ["ac"],
  rent: 9000000,
  marketAvg: 9500000,
  managementFee: 500000,
  parkingFeeEstimate: 120000,
  utilityCostEstimate: 500000,
  status: "available",
  lock: "smart",
  photos: [],
  interest24h: 0,
  petFriendly: false,
  minMonths: 6,
  verifiedAt: "2026-10-01T08:00:00Z",
  title: "2PN góc view hồ",
  description: "Nội thất gỗ mới",
  holdHours: 48,
  activeViewingAt: null,
  securityDeposit: 13500000,
  holdingDeposit: 3000000,
  highlights: ["View hồ", "Nội thất gỗ mới", "Gần công viên"],
  inventory: [
    { code: "1", group: "I", groupLabel: "Phòng khách & sinh hoạt chung", name: "Sofa", qty: 1, spec: "Da, 3 chỗ", conditionPct: 90 },
    { code: "2", group: "I", groupLabel: "Phòng khách & sinh hoạt chung", name: "Ghế đơn", qty: 2, spec: null, conditionPct: null },
    { code: "13", group: "III", groupLabel: "Phòng ngủ", name: "Giường", qty: 1, spec: "1m8", conditionPct: 55 },
  ],
};

async function render(over: Partial<TenantUnit> = {}): Promise<string> {
  const { UnitDetail } = await import("@/components/unit/UnitDetail");
  return renderToStaticMarkup(createElement(UnitDetail, { unit: toUnit({ ...dto, ...over }), autoOpenBooking: false }));
}

describe("W3 UnitDetail: không còn Hộ chiếu bàn giao / Lúc nhận nhà", () => {
  it("render đầy đủ không chứa chuỗi cũ", async () => {
    const html = await render();
    expect(html).not.toContain("Hộ chiếu bàn giao");
    expect(html).not.toContain("Lúc nhận nhà");
    expect(html).not.toContain("Tương đương 1 tháng");
    expect(html).toContain("Nội thất chi tiết");
  });

  it("fix4: dòng nội thất hiện độ mới và ảnh minh hoạ /inventory/<code>.jpg; null ⇒ không chip", async () => {
    const html = await render();
    expect(html).toContain("Mới ~90%");
    expect(html).toContain("Mới ~55%");
    expect(html).not.toContain("Mới ~null");
    expect(html).toContain("/inventory/1.jpg");
    expect(html).toContain("/inventory/13.jpg");
  });

  it("source UnitDetail/UnitSections không import PASSPORT_ITEMS và không dùng RATES.holdingDeposit", () => {
    for (const f of ["UnitDetail.tsx", "UnitSections.tsx"]) {
      const src = readFileSync(resolve(__dirname, "../components/unit", f), "utf8");
      expect(src, f).not.toContain("PASSPORT_ITEMS");
      expect(src, f).not.toContain("RATES.holdingDeposit");
      expect(src, f).not.toContain("Tương đương 1 tháng");
    }
  });

  it("hiện WC, hướng, chip highlights và cọc lấy từ API (không phải hằng 2.000.000)", async () => {
    const html = await render();
    expect(html).toContain("2 WC");
    expect(html).toContain("Đông Nam");
    for (const h of dto.highlights) expect(html).toContain(h);
    expect(html).toContain("13.500.000đ, giữ nguyên suốt kỳ thuê");
    expect(html).toContain("3.000.000đ, Căn được giữ riêng");
    expect(html).toContain("Chỉ cọc 3.000.000đ khi bạn ưng ý");
    expect(html).not.toContain("2.000.000đ, Căn được giữ");
    expect(html).not.toContain("Chỉ cọc 2.000.000đ");
  });

  it("hướng null ⇒ ẩn ô Hướng, không ghi Chưa rõ", async () => {
    const html = await render({ direction: null });
    expect(html).not.toContain("Hướng");
    expect(html).not.toContain("Chưa rõ");
    expect(html).not.toContain("Chưa cập nhật");
  });
});

describe("W4 inventory", () => {
  it("rỗng ⇒ câu trạng thái rỗng, KHÔNG hiện danh sách mẫu", async () => {
    const html = await render({ inventory: [] });
    expect(html).toContain("Danh mục nội thất sẽ cập nhật sau thẩm định.");
    expect(html).not.toContain("Sofa");
  });

  it("có dữ liệu ⇒ nhóm theo groupLabel; ×qty khi > 1; spec chữ nhỏ", async () => {
    const html = await render();
    expect(html).not.toContain("Danh mục nội thất sẽ cập nhật sau thẩm định.");
    const sec = html.slice(html.indexOf('id="inventory"'));
    expect(sec.match(/Phòng khách &amp; sinh hoạt chung/g)).toHaveLength(1); // 2 dòng cùng 1 nhóm
    expect(sec).toContain("×2");
    expect(sec).not.toContain("×1");
    expect(sec).toContain("Da, 3 chỗ");
    expect(sec.indexOf("Phòng khách")).toBeLessThan(sec.indexOf("Phòng ngủ"));
  });

  it("không lộ condition/compensation/photoIds (B6)", async () => {
    const html = await render();
    for (const k of ["condition", "compensation", "photoIds"]) expect(html).not.toContain(k);
  });
});
