"use client";

import { UnitCard } from "@/components/unit/UnitCard";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { allInCost, DEFAULT_HOUSEHOLD, isBargain } from "@/lib/pricing/cost";
import { vndShort } from "@/lib/format";
import { useCatalog } from "@/lib/tenant/catalog";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, RotateCw } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import styles from "./Landing.module.css";

/** "Căn hời tuần này": các căn đang trống và rẻ hơn giá TB toà ≥10%, lấy từ catalog thật. */
export function LiveBargains() {
  const { available, loading, error } = useCatalog();
  if (loading) return <p className="text-muted-foreground animate-pulse">Đang tải căn hời từ hệ thống...</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  const bargains = available.filter(isBargain).slice(0, 4);

  if (bargains.length === 0) {
    return <p className="text-muted-foreground">Tuần này chưa có căn hời mới, bạn xem tất cả căn đang mở nhé.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {bargains.map((u) => (
        <UnitCard key={u.id} unit={u} cost={allInCost(u, DEFAULT_HOUSEHOLD)} />
      ))}
    </div>
  );
}

/** Số căn đang mở và khoảng giá thuê theo từng phân khu (đếm trên DB thật). */
export function LiveZones() {
  const { available, loading, error } = useCatalog();
  const grouped = new Map<string, typeof available>();

  for (const unit of available) {
    const name = unit.zoneName || "Phân khu chưa cập nhật";
    grouped.set(name, [...(grouped.get(name) ?? []), unit]);
  }

  return (
    <ul className="flex flex-col border border-border rounded-xl bg-card overflow-hidden">
      {loading && <li className="p-4"><p className="text-muted-foreground animate-pulse">Đang tải phân khu từ hệ thống...</p></li>}
      {error && <li className="p-4"><p className="text-destructive" role="alert">Không tải được danh sách phân khu: {error}</p></li>}

      {[...grouped.entries()].map(([name, list], index) => {
        const lo = list.length ? Math.min(...list.map((u) => u.rent)) : 0;
        const hi = list.length ? Math.max(...list.map((u) => u.rent)) : 0;
        return (
          <li key={name} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 ${index > 0 ? 'border-t border-border' : ''}`}>
            <div>
              <strong className="text-foreground font-semibold">{name}</strong>
              <p className="text-sm text-muted-foreground mt-1">Toà {[...new Set(list.map((unit) => unit.building))].join(", ")}</p>
            </div>
            <div className="flex flex-col sm:items-end">
              <span className="font-mono text-foreground font-medium">
                {loading ? "…" : `${list.length} căn · ${vndShort(lo)}–${vndShort(hi)}`}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Field Host nội khu có thẻ thang máy</span>
            </div>
          </li>
        );
      })}

      {!loading && !error && grouped.size === 0 && <li className="p-4"><p className="text-muted-foreground">Hiện không có căn trống trong danh mục.</p></li>}
    </ul>
  );
}

/** Ảnh minh hoạ dấu Verified: lấy một căn thật có ảnh trong catalog. */
export function LiveVerifiedPhoto() {
  const { units, loading, error } = useCatalog();
  const unit = units.find((u) => u.photos.length > 0);

  if (loading) return <div className="animate-pulse bg-muted rounded-2xl w-full h-[400px]" aria-hidden="true" />;
  if (error) return <Card className="flex items-center justify-center p-6 h-[400px]" role="alert"><p className="text-destructive">Không tải được ảnh căn hộ: {error}</p></Card>;
  if (!unit) return <Card className="flex items-center justify-center p-6 h-[400px] text-muted-foreground text-center">Chưa có ảnh căn hộ đã xác minh trong danh mục hiện tại.</Card>;

  return (
    <VerifiedPhoto
      unit={unit}
      index={Math.min(5, unit.photos.length)}
      sizes="(max-width: 900px) 100vw, 600px"
      stamp="full"
      className="rounded-2xl overflow-hidden w-full h-[400px] object-cover"
    />
  );
}

/** Khu vực, số căn và giá luôn được suy ra từ căn hộ đang mở trong API. */
export function LiveBentoAreas() {
  const { available, loading, error, reload } = useCatalog();
  const grouped = new Map<string, typeof available>();
  for (const unit of available) {
    const name = unit.zoneName || "Phân khu chưa cập nhật";
    grouped.set(name, [...(grouped.get(name) ?? []), unit]);
  }
  const areas = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);

  if (loading) {
    return <div className={`${styles.areaGrid} ${styles.areaGridMosaic}`} aria-label="Đang tải phân khu">
      {[0, 1, 2].map((item) => <div key={item} className={`${styles.areaCard} ${styles.areaSkeleton}`} />)}
    </div>;
  }
  if (error) {
    return <div className={styles.liveNotice} role="alert">
      <span>Không tải được phân khu từ danh mục căn.</span>
      <button type="button" onClick={() => void reload()}><RotateCw size={15} /> Thử lại</button>
    </div>;
  }
  if (areas.length === 0) {
    return <div className={styles.liveNotice}><span>Danh mục hiện chưa có căn trống để hiển thị khu vực.</span><Link href="/units">Mở danh mục căn</Link></div>;
  }

  return <div className={`${styles.areaGrid} ${areas.length >= 5 ? styles.areaGridMosaic : styles.areaGridCompact}`}>
    {areas.map(([name, units], index) => {
      const photoUnit = units.find((unit) => unit.photos.length > 0);
      const minRent = Math.min(...units.map((unit) => unit.rent));
      return <Link key={name} href="/units" className={`${styles.areaCard} ${areas.length >= 5 && index === 0 ? styles.areaCardLarge : ""}`}>
        {photoUnit ? <VerifiedPhoto unit={photoUnit} index={1} sizes="(max-width: 700px) 100vw, 50vw" className={styles.areaPhoto} /> :
          <div className={styles.areaFallback} aria-hidden="true"><Building2 size={34} /></div>}
        <span className={styles.areaShade} />
        <span className={styles.areaMeta}><MapPin size={14} /> VinHomes Ocean Park 1</span>
        <span className={styles.areaName}>{name}</span>
        <span className={styles.areaStats}>{units.length} căn đang mở <i /> từ {vndShort(minRent)}/tháng</span>
      </Link>;
    })}
  </div>;
}

/** Bộ sưu tập căn thật, lọc theo layout có trong danh mục hiện tại. */
export function FeaturedListings() {
  const { available, loading, error, reload } = useCatalog();
  const [layout, setLayout] = useState<string>("Tất cả");
  const layouts = ["Tất cả", "Studio", "1PN", "2PN", "3PN"];
  const filtered = available
    .filter((unit) => layout === "Tất cả" || unit.layout === layout)
    .slice(0, 6);

  return <>
    <div className={styles.listingControls}>
      <div className={styles.layoutTabs} role="tablist" aria-label="Lọc căn theo số phòng ngủ">
        {layouts.map((value) => <button key={value} type="button" role="tab" aria-selected={layout === value} className={layout === value ? styles.layoutTabActive : styles.layoutTab} onClick={() => setLayout(value)}>{value}</button>)}
      </div>
      {!loading && !error && <span className={styles.resultCount}>{filtered.length} căn hiển thị · dữ liệu danh mục</span>}
    </div>
    {loading ? <div className={styles.listingGrid} aria-label="Đang tải căn hộ">
      {[0, 1, 2].map((item) => <div key={item} className={styles.listingSkeleton} />)}
    </div> : error ? <div className={styles.liveNotice} role="alert"><span>Không tải được căn hộ: {error}</span><button type="button" onClick={() => void reload()}><RotateCw size={15} /> Thử lại</button></div> : filtered.length ?
      <div className={styles.listingGrid}>{filtered.map((unit) => <UnitCard key={unit.id} unit={unit} cost={allInCost(unit, DEFAULT_HOUSEHOLD)} />)}</div> :
      <div className={styles.emptyListings}><Building2 size={24} /><strong>Chưa có căn {layout === "Tất cả" ? "đang trống" : layout} để giới thiệu.</strong><span>Danh mục tự cập nhật khi chủ nhà mở căn mới.</span><Link href="/units">Xem toàn bộ danh mục <span aria-hidden="true">→</span></Link></div>}
  </>;
}
