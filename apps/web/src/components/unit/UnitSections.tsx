import { Bath, BedDouble, Compass, Layers, Ruler, Sofa } from "lucide-react";
import { vnd } from "@/lib/format";
import { FURNISHING_LABEL } from "@/lib/units";
import type { UnitWithExtras } from "@/lib/tenant/adapters";
import type { UnitInventoryLine } from "@/lib/tenant/types";
import { InventoryRow } from "./InventoryRow";

/** Các phần trang căn thuần trình bày (không hook) — tách khỏi UnitDetail để test render được. */

export const EMPTY_INVENTORY_TEXT = "Danh mục nội thất sẽ cập nhật sau thẩm định.";

export function unitStats(unit: UnitWithExtras) {
  return [
    { icon: Ruler, label: "Diện tích", value: `${unit.areaM2} m²` },
    { icon: BedDouble, label: "Phòng ngủ", value: unit.layoutLabel },
    { icon: Bath, label: "WC", value: `${unit.bathrooms} WC` },
    // Hướng chưa rõ (null) ⇒ ẩn ô, không ghi "Chưa rõ".
    ...(unit.directionRaw ? [{ icon: Compass, label: "Hướng", value: unit.directionRaw }] : []),
    { icon: Layers, label: "Tầng", value: `Tầng ${unit.floor}` },
    { icon: Sofa, label: "Nội thất", value: FURNISHING_LABEL[unit.furnishing] },
  ];
}

export function UnitStatsGrid({ unit }: { unit: UnitWithExtras }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {unitStats(unit).map(({ icon: Icon, label, value }) => (
        <li key={label} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border/50 text-center">
          <Icon size={24} className="text-foreground/70" strokeWidth={1.5} />
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <strong className="text-sm text-foreground">{value}</strong>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tối đa 3 chip điểm nổi bật dưới tiêu đề; rỗng ⇒ không hiện gì. */
export function UnitHighlights({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Điểm nổi bật">
      {highlights.slice(0, 3).map((h) => (
        <li key={h} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-sm font-medium text-foreground">
          {h}
        </li>
      ))}
    </ul>
  );
}

/** Gom theo `groupLabel`, giữ thứ tự xuất hiện đầu tiên của nhóm và của dòng. */
export function groupInventory(lines: UnitInventoryLine[]): { label: string; lines: UnitInventoryLine[] }[] {
  const order: string[] = [];
  const map = new Map<string, UnitInventoryLine[]>();
  for (const l of lines) {
    if (!map.has(l.groupLabel)) {
      map.set(l.groupLabel, []);
      order.push(l.groupLabel);
    }
    map.get(l.groupLabel)!.push(l);
  }
  return order.map((label) => ({ label, lines: map.get(label)! }));
}

export function UnitInventorySection({ inventory }: { inventory: UnitInventoryLine[] }) {
  const groups = groupInventory(inventory);
  return (
    <section className="space-y-6" aria-labelledby="inventory">
      <h2 id="inventory" className="text-2xl font-bold tracking-tight text-foreground">Nội thất chi tiết</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_INVENTORY_TEXT}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-foreground">{g.label}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {g.lines.map((l, i) => (
                  <InventoryRow key={`${l.code}-${i}`} line={l} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Hai dòng cọc của "Điều khoản thuê": số tiền đọc từ API căn, không dùng hằng cứng. */
export function DepositTerms({ unit, holdHours }: { unit: UnitWithExtras; holdHours: number }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <dt className="font-semibold text-foreground">Tiền cọc bảo đảm</dt>
        <dd className="text-muted-foreground text-sm leading-relaxed">{vnd(unit.securityDeposit)}đ, giữ nguyên suốt kỳ thuê và hoàn lại khi hết hạn nếu không có khoản khấu trừ hợp lệ</dd>
      </div>
      <div className="flex flex-col gap-1.5">
        <dt className="font-semibold text-foreground">Cọc giữ chỗ</dt>
        <dd className="text-muted-foreground text-sm leading-relaxed">{vnd(unit.holdingDeposit)}đ, Căn được giữ riêng cho bạn {holdHours} giờ kể từ khi ngân hàng báo có, chuyển 100% vào tiền cọc bảo đảm, không trừ vào tiền thuê tháng đầu</dd>
      </div>
    </>
  );
}
