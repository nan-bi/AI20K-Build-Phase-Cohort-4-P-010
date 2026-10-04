"use client";

import { UnitCard } from "@/components/unit/UnitCard";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { allInCost, DEFAULT_HOUSEHOLD, isBargain } from "@/lib/mock/cost";
import { vndShort } from "@/lib/mock/format";
import { ZONES } from "@/lib/mock/units";
import { useCatalog } from "@/lib/tenant/catalog";
import styles from "./Landing.module.css";

/** "Căn hời tuần này": các căn đang trống và rẻ hơn giá TB toà ≥10%, lấy từ catalog thật. */
export function LiveBargains() {
  const { available, loading, error } = useCatalog();
  if (loading) return <p className="muted">Đang tải căn hời từ hệ thống...</p>;
  if (error) return <p className="muted">{error}</p>;
  const bargains = available.filter(isBargain).slice(0, 4);
  if (bargains.length === 0) return <p className="muted">Tuần này chưa có căn hời mới, bạn xem tất cả căn đang mở nhé.</p>;
  return (
    <div className={styles.cards}>
      {bargains.map((u) => (
        <UnitCard key={u.id} unit={u} cost={allInCost(u, DEFAULT_HOUSEHOLD)} />
      ))}
    </div>
  );
}

/** Số căn đang mở và khoảng giá thuê theo từng phân khu (đếm trên DB thật). */
export function LiveZones() {
  const { available, loading } = useCatalog();
  return (
    <ul className={styles.zones}>
      {ZONES.map((z) => {
        const list = available.filter((u) => u.zoneId === z.id);
        const lo = list.length ? Math.min(...list.map((u) => u.rent)) : 0;
        const hi = list.length ? Math.max(...list.map((u) => u.rent)) : 0;
        return (
          <li key={z.id}>
            <div>
              <strong>{z.name}</strong>
              <p className="muted small">Toà {z.buildings.join(", ")}</p>
            </div>
            <div className={styles.zoneRight}>
              <span className="tnum">
                {loading ? "…" : list.length === 0 ? "Chưa có căn trống" : `${list.length} căn · ${vndShort(lo)}–${vndShort(hi)}`}
              </span>
              <span className="muted small">Field Host nội khu có thẻ thang máy</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Ảnh minh hoạ dấu Verified: lấy một căn thật có ảnh trong catalog. */
export function LiveVerifiedPhoto() {
  const { units } = useCatalog();
  const unit = units.find((u) => u.photos.length > 0);
  if (!unit) return <div className={`skeleton ${styles.photoFrame}`} aria-hidden />;
  return (
    <VerifiedPhoto
      unit={unit}
      index={Math.min(5, unit.photos.length)}
      sizes="(max-width: 900px) 100vw, 600px"
      stamp="full"
      className={styles.photoFrame}
    />
  );
}
