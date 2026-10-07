/**
 * DỮ LIỆU DEMO sinh để minh hoạ (hồ sơ 18, fix4): bộ nội thất định danh cho căn seed từ Excel không qua thẩm định.
 * Căn thật sẽ ghi đè bằng thẩm định thật (niêm yết ghi `unit_inventory_items`). Chủ tịch duyệt 2026-10-07.
 *
 * Thuần + định danh: cùng `unitCode` ⇒ cùng bộ (hash FNV-1a ⇒ PRNG mulberry32). Idempotent: ghi theo unitId, xoá dòng cũ rồi tạo lại.
 * Chỉ dòng `present`; spec không SĐT/giá/link; `condition` = độ mới % (nguyên 30–98).
 */
import { Furnishing, LayoutType, PrismaClient } from '@prisma/client';
import { INSPECTION_CATALOG } from '../inspection/inspection.catalog';

export interface SeedRow {
  code: string;
  groupCode: string;
  name: string;
  qty: number;
  spec: string | null;
  condition: number;
}

export function hashCode(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Món cốt lõi của căn BASIC: giường, tủ quần áo, điều hòa, nóng lạnh, bếp/hút mùi, khoá, thẻ. */
const CORE = ['13', '15', '23', '24', '17', '6', '7', '28', '29'];

/** Pool spec theo mã catalog (3–5 lựa chọn; mã không có pool ⇒ spec null). */
export const SPEC_POOL: Record<string, string[]> = {
  '1': ['Da, màu xám', 'Nỉ, màu be', 'Da, màu nâu', 'Vải bố, màu ghi sáng', 'Nỉ, màu xanh rêu'],
  '2': ['Mặt kính, chân kim loại', 'Mặt đá, chân gỗ', 'Gỗ công nghiệp, màu óc chó', 'Gỗ sồi tự nhiên'],
  '3': ['Gỗ công nghiệp, màu trắng', 'Gỗ óc chó, có ngăn kéo', 'Kệ treo tường, gỗ sồi', 'Gỗ công nghiệp, màu xám'],
  '4': ['Samsung 43 inch', 'LG 50 inch', 'Sony 43 inch', 'TCL 55 inch', 'Xiaomi 43 inch'],
  '5': ['Rèm 2 lớp, màu be', 'Rèm 2 lớp, màu xám', 'Rèm cuốn', 'Rèm lá'],
  '6': ['Bếp từ đôi Sunhouse', 'Bếp từ đôi Bosch', 'Bếp hồng ngoại đôi Kangaroo', 'Bếp từ đơn Panasonic', 'Bếp từ đôi Elmich'],
  '7': ['Hút mùi kính cong Sunhouse', 'Hút mùi Bosch', 'Hút mùi âm tủ Kangaroo', 'Hút mùi Elica'],
  '8': ['Tủ lạnh 2 cánh 180 lít', 'Tủ lạnh Samsung 208 lít', 'Tủ lạnh Panasonic 255 lít', 'Tủ lạnh mini 90 lít'],
  '9': ['Tủ bếp gỗ công nghiệp, màu trắng', 'Tủ bếp acrylic, màu xám', 'Tủ bếp gỗ sồi, tay nắm ẩn'],
  '10': ['Mặt đá nhân tạo, ốp kính cường lực', 'Mặt đá granite, ốp gạch men', 'Mặt đá thạch anh, ốp kính'],
  '11': ['Chậu inox 1 hố', 'Chậu inox 2 hố', 'Chậu đá, vòi rút'],
  '12': ['Bàn ăn 4 ghế, mặt gỗ', 'Bàn ăn 4 ghế, mặt kính', 'Bàn ăn 6 ghế, mặt đá', 'Bàn bar 2 ghế cao'],
  '13': ['Giường 1m6, có táp đầu giường', 'Giường 1m8, có táp đầu giường', 'Giường gỗ 1m6', 'Giường bọc nỉ 1m8'],
  '14': ['Đệm lò xo 1m6, có tấm bảo vệ', 'Đệm foam 1m8', 'Đệm cao su 1m6', 'Đệm bông ép 1m6'],
  '15': ['Tủ 2 cánh, gỗ công nghiệp', 'Tủ 3 cánh, cánh trượt', 'Tủ âm tường, 4 cánh', 'Tủ 2 cánh, màu trắng'],
  '16': ['Rèm chắn sáng 2 lớp, màu xám', 'Rèm cản sáng 100%, màu be', 'Rèm roman chắn sáng'],
  '17': ['Ariston 20 lít', 'Panasonic 15 lít', 'Ferroli 30 lít', 'Picenza 20 lít'],
  '18': ['Bồn cầu 1 khối, có vòi xịt', 'Bồn cầu TOTO, có vòi xịt', 'Bồn cầu Viglacera, có vòi xịt', 'Bồn cầu Inax, nắp êm'],
  '19': ['Lavabo đặt bàn, vòi nóng lạnh', 'Lavabo treo tường', 'Lavabo âm bàn, tủ gương', 'Lavabo Inax, vòi Caesar'],
  '20': ['Vách kính 8mm, sen cây Inax', 'Vách kính 10mm, sen cây Caesar', 'Vách kính, sen cây Grohe', 'Vách kính, sen tắm Viglacera'],
  '21': ['Máy giặt Electrolux 8kg', 'Máy giặt LG 9kg', 'Máy giặt Samsung 8.5kg', 'Máy giặt kèm sấy Panasonic 9kg', 'Máy giặt Toshiba 8kg'],
  '22': ['Giàn phơi điều khiển điện', 'Giàn phơi treo trần', 'Giàn phơi gắn tường'],
  '23': ['Daikin 12.000 BTU', 'Panasonic 18.000 BTU', 'LG Inverter 12.000 BTU', 'Mitsubishi 12.000 BTU', 'Casper 12.000 BTU'],
  '24': ['Daikin 9.000 BTU', 'Panasonic 9.000 BTU', 'LG Inverter 9.000 BTU', 'Casper 9.000 BTU', 'Midea 12.000 BTU'],
  '25': ['Sàn gỗ công nghiệp', 'Gạch men 60x60', 'Sàn gỗ kỹ thuật', 'Gạch vân đá 80x80'],
  '26': ['Sơn trắng', 'Sơn kem', 'Sơn ghi sáng, trần thạch cao'],
  '27': ['Đèn LED âm trần, công tắc Panasonic', 'Đèn LED âm trần, công tắc Schneider', 'Đèn LED ốp trần, có đèn thả bàn ăn'],
  '28': ['Khoá điện tử mã số', 'Khoá điện tử vân tay và mã số', 'Khoá điện tử mã số, có chìa cơ dự phòng'],
  '29': ['Thẻ cư dân thang máy', 'Thẻ cư dân, kèm móc khoá'],
  '30': ['Remote điều hòa Daikin', 'Remote điều hòa Panasonic', 'Remote điều hòa LG', 'Remote điều hòa Casper'],
  '31': ['Remote Tivi', 'Remote giọng nói', 'Remote Tivi thông minh'],
  '32': ['Chìa cửa chính và chìa phòng', 'Chìa cửa chính, chìa phòng ngủ', 'Chìa cơ cửa chính dự phòng'],
};

function bedrooms(layout: LayoutType): number {
  switch (layout) {
    case LayoutType.TWO_BED_ONE_BATH:
    case LayoutType.TWO_BED_TWO_BATH:
      return 2;
    case LayoutType.THREE_BED:
      return 3;
    default:
      return 1; // STUDIO / 1PN+
  }
}

function bathrooms(layout: LayoutType): number {
  return layout === LayoutType.TWO_BED_TWO_BATH || layout === LayoutType.THREE_BED ? 2 : 1;
}

function qtyOf(code: string, layout: LayoutType, r: () => number): number {
  const bed = bedrooms(layout);
  switch (code) {
    case '13': case '14': case '15': case '16': case '24': case '30':
      return bed;
    case '18': case '19': case '20':
      return bathrooms(layout);
    case '12':
      return r() < 0.5 ? 4 : 6;
    case '29':
      return 2 + Math.floor(r() * 2);
    case '32':
      return 2 + Math.floor(r() * 3);
    case '31':
      return 1;
    default:
      return 1;
  }
}

function conditionOf(r: () => number): number {
  const u = r();
  if (u < 0.1) return 30 + Math.floor(r() * 21); // vài món cũ 30–50
  if (u < 0.9) return 60 + Math.floor(r() * 36); // 60–95
  return 90 + Math.floor(r() * 9); // 90–98
}

export function generateInventory(unitCode: string, furnishing: Furnishing, layout: LayoutType): SeedRow[] {
  if (furnishing === Furnishing.EMPTY) return [];
  const r = rng(hashCode(unitCode));
  const all = INSPECTION_CATALOG.map((c) => c.code);
  const total = all.length;
  const target =
    furnishing === Furnishing.FULL
      ? Math.round(total * (0.85 + 0.15 * r()))
      : Math.max(CORE.length, Math.round(total * (0.35 + 0.2 * r())));
  const rest = all.filter((c) => !CORE.includes(c));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const chosen = new Set([...CORE, ...rest].slice(0, target));
  const rows: SeedRow[] = [];
  for (const c of INSPECTION_CATALOG) {
    // Rút số ngẫu nhiên theo thứ tự cố định cho MỌI món để một món vắng không làm lệch món sau.
    const qty = qtyOf(c.code, layout, r);
    const pool = SPEC_POOL[c.code];
    const spec = pool ? pool[Math.floor(r() * pool.length)] : null;
    const condition = conditionOf(r);
    if (!chosen.has(c.code)) continue;
    rows.push({ code: c.code, groupCode: c.group, name: c.name, qty, spec, condition });
  }
  return rows;
}

export interface SeedSummaryRow {
  unitCode: string;
  furnishing: string;
  items: number;
  avgCondition: number | null;
  skipped?: boolean;
}

export interface SeedOptions {
  apply: boolean;
  overwrite: boolean; // false ⇒ --keep-existing: bỏ qua căn đã có dòng
}

export async function seedUnitInventory(
  prisma: Pick<PrismaClient, 'unit' | 'unitInventoryItem' | '$transaction'>,
  opts: SeedOptions,
): Promise<{ units: number; rows: number; summary: SeedSummaryRow[] }> {
  const units: any[] = await (prisma.unit as any).findMany({
    select: {
      id: true,
      unitCode: true,
      furnishing: true,
      layoutType: true,
      inventoryItems: { select: { id: true }, take: 1 },
    },
    orderBy: { unitCode: 'asc' },
  });
  const summary: SeedSummaryRow[] = [];
  let unitCount = 0;
  let rowCount = 0;
  for (const u of units) {
    if (!opts.overwrite && u.inventoryItems?.length) {
      summary.push({ unitCode: u.unitCode, furnishing: u.furnishing, items: 0, avgCondition: null, skipped: true });
      continue;
    }
    const rows = generateInventory(u.unitCode, u.furnishing, u.layoutType);
    const avg = rows.length ? Math.round(rows.reduce((s, x) => s + x.condition, 0) / rows.length) : null;
    summary.push({ unitCode: u.unitCode, furnishing: u.furnishing, items: rows.length, avgCondition: avg });
    unitCount++;
    rowCount += rows.length;
    if (!opts.apply) continue;
    await prisma.$transaction(async (tx: any) => {
      await tx.unitInventoryItem.deleteMany({ where: { unitId: u.id } });
      if (rows.length) {
        await tx.unitInventoryItem.createMany({ data: rows.map((x) => ({ unitId: u.id, ...x })) });
      }
    });
  }
  return { units: unitCount, rows: rowCount, summary };
}
