"use client";

import { AlertTriangle } from "lucide-react";
import type { FunnelStep } from "@/lib/mock/selectors";
import { ChartFrame } from "./ChartFrame";
import { ORDINAL_6 } from "./tokens";
import { useChartTip } from "./useChartTip";
import styles from "./Charts.module.css";

/** Phễu 6 giai đoạn: thứ tự là nghĩa → thang một hue sáng dần đến đậm (ordinal), không phải 6 màu rời. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const tip = useChartTip();
  const max = steps[0].value;
  // Điểm rơi lớn nhất giữa hai giai đoạn liền kề.
  const drops = steps.slice(1).map((s, i) => ({ i: i + 1, keep: s.value / steps[i].value }));
  const worst = drops.reduce((a, b) => (b.keep < a.keep ? b : a));

  return (
    <ChartFrame
      title="Phễu chuyển đổi 6 giai đoạn"
      subtitle="Tuần này: từ lượt truy cập web đến ký thỏa thuận số"
      table={{ head: ["Giai đoạn", "Số lượt", "Giữ lại so với giai đoạn trước"], rows: steps.map((s, i) => [s.label, s.value.toLocaleString("vi-VN"), i === 0 ? "—" : `${Math.round((s.value / steps[i - 1].value) * 100)}%`]) }}
    >
      <div className={styles.plot} data-plot="">
        <ol className={styles.funnel}>
          {steps.map((s, i) => {
            const pct = i === 0 ? 100 : Math.round((s.value / steps[i - 1].value) * 100);
            return (
              <li key={s.key} {...tip.bind(s.label, [{ label: i === 0 ? "lượt truy cập" : `giữ lại ${pct}% so với ${steps[i - 1].label.toLowerCase()}`, value: s.value.toLocaleString("vi-VN"), key: ORDINAL_6[i] }])}>
                <span className={styles.fLabel}>{s.label}</span>
                <span className={styles.fTrack}>
                  <span className={styles.fBar} style={{ width: `${Math.max(1.6, (s.value / max) * 100)}%`, background: ORDINAL_6[i] }} />
                </span>
                <span className={`tnum ${styles.fVal}`}>
                  <b>{s.value.toLocaleString("vi-VN")}</b>
                  {i > 0 && <em>{pct}%</em>}
                </span>
              </li>
            );
          })}
        </ol>
        {tip.node}
      </div>
      <p className={`small ${styles.insight}`}>
        <AlertTriangle size={15} /> Điểm rơi lớn nhất: từ “{steps[worst.i - 1].label}” xuống “{steps[worst.i].label}” chỉ giữ lại {Math.round(worst.keep * 100)}%.
      </p>
    </ChartFrame>
  );
}
