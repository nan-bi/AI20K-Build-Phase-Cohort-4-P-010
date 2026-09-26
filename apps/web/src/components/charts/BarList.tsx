"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ChartFrame } from "./ChartFrame";
import { SERIES, STATUS } from "./tokens";
import { useChartTip } from "./useChartTip";
import styles from "./Charts.module.css";

export interface BarItem {
  label: string;
  value: number;
  sub?: string;
}

interface BarListProps {
  title: string;
  subtitle: string;
  items: BarItem[];
  /** Ngưỡng SLA (giây). Bar vượt ngưỡng đổi sang màu trạng thái kèm biểu tượng. */
  threshold: number;
  thresholdLabel: string;
  format: (v: number) => string;
  unit: string;
}

/** Thanh ngang một series (mọi thanh cùng một màu) + vạch ngưỡng; vượt ngưỡng = trạng thái cảnh báo có icon và chữ. */
export function BarList({ title, subtitle, items, threshold, thresholdLabel, format, unit }: BarListProps) {
  const tip = useChartTip();
  const max = Math.max(threshold * 1.25, ...items.map((i) => i.value));
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return (
    <ChartFrame title={title} subtitle={subtitle} table={{ head: ["Field Host", unit, "Trạng thái SLA"], rows: sorted.map((i) => [i.label, format(i.value), i.value > threshold ? "Vượt ngưỡng" : "Đạt"]) }}>
      <div className={styles.plot} data-plot="">
        <ul className={styles.bars}>
          {sorted.map((i) => {
            const over = i.value > threshold;
            return (
              <li key={i.label} {...tip.bind(i.label, [{ label: over ? `${unit} — vượt ngưỡng` : unit, value: format(i.value), key: over ? STATUS.critical : SERIES }])}>
                <span className={styles.bLabel}>
                  {over ? <AlertTriangle size={14} className={styles.bad} aria-label="Vượt ngưỡng SLA" /> : <CheckCircle2 size={14} className={styles.good} aria-label="Đạt SLA" />}
                  {i.label}
                </span>
                <span className={styles.bTrack}>
                  <span className={styles.bFill} style={{ width: `${(i.value / max) * 100}%`, background: over ? STATUS.critical : SERIES }} />
                  <span className={styles.bLimit} style={{ left: `${(threshold / max) * 100}%` }} />
                </span>
                <b className={`tnum ${styles.bVal}`}>{format(i.value)}</b>
              </li>
            );
          })}
        </ul>
        <p className={`xs muted ${styles.limitNote}`}>
          <i /> {thresholdLabel}
        </p>
        {tip.node}
      </div>
    </ChartFrame>
  );
}

