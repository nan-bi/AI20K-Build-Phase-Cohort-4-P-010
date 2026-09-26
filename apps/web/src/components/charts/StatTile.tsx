import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CONTEXT, SERIES } from "./tokens";
import styles from "./Charts.module.css";

interface StatTileProps {
  label: string;
  value: string;
  /** Đơn vị nhỏ đứng sau giá trị. */
  unit?: string;
  delta?: { text: string; tone: "good" | "bad" | "flat"; dir?: "up" | "down" };
  spark?: number[];
  hero?: boolean;
}

/** Thẻ số liệu: nhãn · giá trị · chênh lệch có tên kỳ so sánh · sparkline (12 điểm, điểm cuối đậm). */
export function StatTile({ label, value, unit, delta, spark, hero }: StatTileProps) {
  const max = spark ? Math.max(...spark) : 1;
  const min = spark ? Math.min(...spark) : 0;
  const pts = spark?.map((v, i) => [(i / (spark.length - 1)) * 96 + 2, 26 - ((v - min) / (max - min || 1)) * 22] as const);
  return (
    <div className={`${styles.tile} ${hero ? styles.hero : ""}`}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={`num ${styles.tileValue}`}>
        {value}
        {unit && <small>{unit}</small>}
      </p>
      <div className={styles.tileFoot}>
        {delta && (
          <span className={`${styles.delta} ${styles[`d-${delta.tone}`]}`}>
            {delta.tone === "flat" ? <Minus size={13} /> : delta.dir === "down" ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {delta.text}
          </span>
        )}
        {pts && (
          <svg viewBox="0 0 100 30" className={styles.spark} aria-hidden>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={CONTEXT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={SERIES} stroke="#fff" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </div>
  );
}
