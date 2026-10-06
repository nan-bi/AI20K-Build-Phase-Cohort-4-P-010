"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Images, X } from "lucide-react";
import { unitPhoto, type Unit } from "@/lib/units";
import { VerifiedPhoto } from "./VerifiedPhoto";
import styles from "./Gallery.module.css";

export function Gallery({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = unit.images;
  if (n === 0) return <div className={styles.noPhotos}><ImageOff size={28} /><b>Chưa có ảnh căn hộ</b><span>Ảnh thật chưa được lưu trong hồ sơ căn này.</span></div>;
  const shown = Math.min(n, 5);
  const idx = Array.from({ length: n }, (_, i) => i + 1);

  return (
    <>
      <div className={`${styles.grid} ${styles[`n${shown}`]}`}>
        {idx.slice(0, shown).map((i) => (
          <button key={i} type="button" className={styles.cell} onClick={() => setOpen(i)} aria-label={`Xem ảnh ${i} trên ${n}`}>
            <VerifiedPhoto unit={unit} index={i} sizes={i === 1 ? "(max-width: 900px) 100vw, 640px" : "(max-width: 900px) 50vw, 320px"} priority={i === 1} stamp={i === 1 ? "full" : "none"} className={styles.fill} />
          </button>
        ))}
        <button type="button" className={styles.all} onClick={() => setOpen(1)}>
          <Images size={16} /> Xem tất cả {n} ảnh
        </button>
      </div>

      <div className={styles.rail} aria-label="Ảnh căn hộ">
        {idx.map((i) => (
          <button key={i} type="button" className={styles.slide} onClick={() => setOpen(i)} aria-label={`Xem ảnh ${i} trên ${n}`}>
            <VerifiedPhoto unit={unit} index={i} sizes="(max-width: 760px) 88vw, 1px" priority={i === 1} stamp={i === 1 ? "full" : "none"} className={styles.fill} />
            <span className={styles.count}>
              {i}/{n}
            </span>
          </button>
        ))}
      </div>

      {open !== null && <Lightbox unit={unit} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ unit, start, onClose }: { unit: Unit; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = unit.images;
  const go = (d: number) => setI((cur) => ((cur - 1 + d + n) % n) + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((cur) => ((cur - 2 + n) % n) + 1);
      if (e.key === "ArrowRight") setI((cur) => (cur % n) + 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [n, onClose]);

  const photo = unitPhoto(unit, i);
  if (!photo) return null;
  const verifiedAt = unit.verifiedAt && Number.isFinite(Date.parse(unit.verifiedAt))
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(unit.verifiedAt))
    : "";
  return (
    <div className={styles.lb} role="dialog" aria-modal="true" aria-label={`Thư viện ảnh căn ${unit.code}`}>
      <button type="button" className={styles.lbBackdrop} onClick={onClose} aria-label="Đóng" />
      <button type="button" className={`${styles.lbBtn} ${styles.lbClose}`} onClick={onClose} aria-label="Đóng thư viện ảnh" autoFocus>
        <X size={22} />
      </button>
      <button type="button" className={`${styles.lbBtn} ${styles.lbPrev}`} onClick={() => go(-1)} aria-label="Ảnh trước">
        <ChevronLeft size={26} />
      </button>
      <figure className={styles.lbFig}>
        <div className={styles.lbImg}>
          <Image src={photo} alt={`Căn ${unit.code}, ảnh ${i}`} fill sizes="90vw" className={styles.contain} priority />
        </div>
        <figcaption>
          Ảnh {i}/{n}{verifiedAt ? ` · Đã xác minh ${verifiedAt}` : ""} · {unit.code}
        </figcaption>
      </figure>
      <button type="button" className={`${styles.lbBtn} ${styles.lbNext}`} onClick={() => go(1)} aria-label="Ảnh sau">
        <ChevronRight size={26} />
      </button>
    </div>
  );
}
