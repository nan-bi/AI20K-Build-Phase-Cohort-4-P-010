import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { fmtDate } from "@/lib/mock/format";
import styles from "@/components/unit/VerifiedPhoto.module.css";

interface UnitPhotoProps {
  url: string | null;
  alt: string;
  /** Thời điểm xác minh ảnh (UnitMedia.verifiedAt) — hiện trên dấu Verified. */
  verifiedAt?: string | null;
  sizes: string;
  className?: string;
}

/** Ảnh căn lấy từ API (UnitMedia), kèm dấu Verified có ngày xác minh; chưa có ảnh thì hiện khung trống. */
export function UnitPhoto({ url, alt, verifiedAt, sizes, className }: UnitPhotoProps) {
  return (
    <div className={`${styles.frame} ${className ?? ""}`}>
      {url && <Image src={url} alt={alt} fill sizes={sizes} className={styles.img} />}
      {url && verifiedAt && (
        <span className={styles.stamp}>
          <BadgeCheck size={13} />
          Đã xác minh {fmtDate(verifiedAt).slice(0, 5)}
        </span>
      )}
    </div>
  );
}
