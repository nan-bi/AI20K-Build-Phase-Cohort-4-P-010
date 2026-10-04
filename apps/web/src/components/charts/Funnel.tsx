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
  const max = Math.max(1, ...steps.flatMap((s) => (s.value === null ? [] : [s.value])));
  const drops = steps.slice(1).flatMap((s, i) => {
    const previous = steps[i].value;
    return s.value === null || previous === null || previous === 0 ? [] : [{ i: i + 1, keep: s.value / previous }];
  });
  const worst = drops.length > 0 ? drops.reduce((a, b) => (b.keep < a.keep ? b : a)) : null;

  return (
    <ChartFrame
      title="Phễu chuyển đổi 6 giai đoạn"
      subtitle="Số liệu từ backend; giai đoạn chưa có nguồn sẽ hiển thị riêng"
      table={{ head: ["Giai đoạn", "Số lượt", "Giữ lại so với giai đoạn trước"], rows: steps.map((s, i) => [s.label, s.value === null ? "Chưa có nguồn" : s.value.toLocaleString("vi-VN"), i === 0 || s.value === null || steps[i - 1].value === null || steps[i - 1].value === 0 ? "—" : `${Math.round((s.value / steps[i - 1].value!) * 100)}%`]) }}
    >
      <div className={styles.plot} data-plot="">
        <ol className={styles.funnel}>
          {steps.map((s, i) => {
            const previous = i > 0 ? steps[i - 1].value : null;
            const pct = i === 0 ? 100 : s.value === null || previous === null || previous === 0 ? null : Math.round((s.value / previous) * 100);
            return (
              <li key={s.key} {...tip.bind(s.label, [{ label: i === 0 ? "lượt truy cập" : pct === null ? "Tỷ lệ giữ lại" : `giữ lại ${pct}% so với ${steps[i - 1].label.toLowerCase()}`, value: s.value === null ? "Chưa có nguồn dữ liệu" : s.value.toLocaleString("vi-VN"), key: ORDINAL_6[i] }])}>
                <span className={styles.fLabel}>{s.label}</span>
                <span className={styles.fTrack}>
                  {s.value !== null && <span className={styles.fBar} style={{ width: `${Math.max(1.6, (s.value / max) * 100)}%`, background: ORDINAL_6[i] }} />}
                </span>
                <span className={`tnum ${styles.fVal}`}>
                  <b>{s.value === null ? "—" : s.value.toLocaleString("vi-VN")}</b>
                  {i > 0 && <em>{pct === null ? "—" : `${pct}%`}</em>}
                </span>
              </li>
            );
          })}
        </ol>
        {tip.node}
      </div>
      {worst ? (
        <p className={`small ${styles.insight}`}>
          <AlertTriangle size={15} /> Điểm rơi lớn nhất: từ “{steps[worst.i - 1].label}” xuống “{steps[worst.i].label}” chỉ giữ lại {Math.round(worst.keep * 100)}%.
        </p>
      ) : (
        <p className={`small ${styles.insight}`}>Chưa đủ dữ liệu liên tiếp để tính tỷ lệ chuyển đổi giữa các giai đoạn.</p>
      )}
    </ChartFrame>
  );
}
