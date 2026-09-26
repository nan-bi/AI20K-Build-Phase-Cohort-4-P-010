import Link from "next/link";
import { Bath, BedDouble, Compass, Ruler } from "lucide-react";
import { vnd, vndShort } from "@/lib/mock/format";
import type { CostBreakdown } from "@/lib/mock/cost";
import { unitAddress, zoneById, type Unit } from "@/lib/mock/units";
import { AllInBar } from "./AllInBar";
import { FavoriteButton } from "./FavoriteButton";
import { UnitBadges } from "./UnitBadges";
import { VerifiedPhoto } from "./VerifiedPhoto";
import styles from "./UnitCard.module.css";

interface UnitCardProps {
  unit: Unit;
  cost: CostBreakdown;
  /** "feature" = thẻ lớn có lý do AI chọn; "grid" = thẻ gọn. */
  variant?: "grid" | "feature";
  rank?: number;
  reasons?: string[];
  priority?: boolean;
}

export function UnitCard({ unit, cost, variant = "grid", rank, reasons, priority }: UnitCardProps) {
  const zone = zoneById(unit.zoneId);
  const feature = variant === "feature";
  return (
    <article className={`${styles.card} ${feature ? styles.feature : ""}`}>
      <div className={styles.photo}>
        <Link href={`/units/${unit.id}`} aria-label={`Xem chi tiết căn ${unitAddress(unit)}`} className={styles.photoLink}>
          <VerifiedPhoto
            unit={unit}
            sizes={feature ? "(max-width: 900px) 100vw, 420px" : "(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 340px"}
            priority={priority}
            className={styles.photoFrame}
          />
        </Link>
        <div className={styles.badges}>
          {rank && <span className={`badge badge-plain ${styles.rank}`}>AI chọn #{rank}</span>}
          <UnitBadges unit={unit} />
        </div>
        <FavoriteButton unitId={unit.id} />
      </div>

      <div className={styles.body}>
        <div>
          <h3 className={styles.addr}>{unitAddress(unit)}</h3>
          <p className={`muted small ${styles.zone}`}>
            {zone.name} · {unit.view}
          </p>
        </div>

        <ul className={styles.stats}>
          <li>
            <Ruler size={15} /> {unit.areaM2} m²
          </li>
          <li>
            <BedDouble size={15} /> {unit.layoutLabel}
          </li>
          <li>
            <Bath size={15} /> {unit.bathrooms} WC
          </li>
          <li>
            <Compass size={15} /> {unit.direction}
          </li>
        </ul>

        <div className={styles.price}>
          <div>
            <span className={`num ${styles.total}`}>{vnd(cost.total)}</span>
            <span className={`muted small ${styles.per}`}>đ/tháng</span>
          </div>
          <p className="muted xs">
            All-in: thuê {vndShort(cost.rent)} + phí {vndShort(cost.total - cost.rent)}
          </p>
        </div>
        <AllInBar cost={cost} />

        {feature && reasons && reasons.length > 0 && (
          <ul className={styles.reasons}>
            {reasons.slice(0, 3).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <Link href={`/units/${unit.id}`} className="btn btn-quiet btn-sm">
            Xem chi tiết
          </Link>
          <Link href={`/units/${unit.id}?book=1`} className="btn btn-amber btn-sm">
            Đặt lịch xem
          </Link>
        </div>
      </div>
    </article>
  );
}
