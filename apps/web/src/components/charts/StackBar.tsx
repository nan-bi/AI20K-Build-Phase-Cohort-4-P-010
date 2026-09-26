"use client";

import { ORDINAL_6 } from "./tokens";
import { useChartTip } from "./useChartTip";
import styles from "./Charts.module.css";

export interface StackSeg {
  label: string;
  value: number;
}

/** Thanh chồng một hàng (trạng thái vòng đời: thang một hue), các mảnh cách nhau khe nền 2px; chú giải luôn hiện. */
export function StackBar({ title, segments }: { title: string; segments: StackSeg[] }) {
  const tip = useChartTip();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const colors = [ORDINAL_6[4], ORDINAL_6[2], ORDINAL_6[0]];
  return (
    <div className={styles.stackWrap} data-plot="">
      <p className={styles.stackTitle}>{title}</p>
      <div className={styles.stack} role="img" aria-label={`${title}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
        {segments.map((s, i) => (
          <span
            key={s.label}
            className={styles.seg}
            style={{ flexGrow: s.value, background: colors[i] }}
            {...tip.bind(s.label, [{ label: `${Math.round((s.value / total) * 100)}% tổng số căn`, value: `${s.value} căn`, key: colors[i] }])}
          >
            {s.value / total > 0.14 && <b style={{ color: i === 2 ? "var(--ink)" : "#fff" }}>{s.value}</b>}
          </span>
        ))}
      </div>
      <ul className={styles.legend} aria-label="Chú giải">
        {segments.map((s, i) => (
          <li key={s.label}>
            <i style={{ background: colors[i] }} />
            {s.label} <b className="tnum">{s.value}</b>
          </li>
        ))}
      </ul>
      {tip.node}
    </div>
  );
}
