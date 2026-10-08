import Image from "next/image";
import { unitPhoto, type Unit } from "@/lib/units";
import { BadgeCheck, ImageOff } from "lucide-react";
import styles from "./VerifiedPhoto.module.css";

interface VerifiedPhotoProps {
  unit: Unit;
  index?: number;
  sizes: string;
  priority?: boolean;
  /** Hiện dấu xác minh đầy đủ (mã căn + thời điểm chụp). */
  stamp?: "full" | "compact" | "none";
  className?: string;
}

/** Ảnh thật của căn, kèm dấu Verified có timestamp (chống tin mồi, chống môi giới copy ảnh). */
export function VerifiedPhoto({ unit, index = 1, sizes, priority, stamp = "compact", className }: VerifiedPhotoProps) {
  const photo = unitPhoto(unit, index);
  const verifiedAt = unit.verifiedAt && Number.isFinite(Date.parse(unit.verifiedAt))
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(unit.verifiedAt))
    : null;
  return (
    <div className={`${styles.frame} ${className ?? ""}`}>
      {photo ? <Image
        src={photo}
        alt={`Căn ${unit.code}, ảnh ${index}`}
        fill
        sizes={sizes}
        priority={priority}
        className={styles.img}
      /> : <div className={styles.noPhoto}><ImageOff size={24} /><span>Chưa có ảnh trong hệ thống</span></div>}
      {photo && verifiedAt && stamp !== "none" && (
        <span className={styles.stamp}>
          <BadgeCheck size={13} />
          {stamp === "full" ? (
            <>
              <b>Đã xác minh</b> {verifiedAt} · {unit.code}
            </>
          ) : (
            <>Đã xác minh {verifiedAt}</>
          )}
        </span>
      )}
    </div>
  );
}
