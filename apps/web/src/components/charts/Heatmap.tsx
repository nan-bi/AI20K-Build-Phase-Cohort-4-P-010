"use client";

import { ChartFrame } from "./ChartFrame";
import { SEQ } from "./tokens";
import { useChartTip } from "./useChartTip";
import styles from "./Charts.module.css";

export interface HeatRow {
  zone: string;
  cells: { building: string; total: number; used: number }[];
}

const stepFor = (rate: number) => Math.min(SEQ.length - 1, Math.floor(rate * SEQ.length));
const darkFill = (i: number) => i >= 4;

/** Bản đồ nhiệt tỷ lệ lấp đầy theo toà: một hue, càng đậm càng đầy; số hiện trong ô, tooltip nêu số căn. */
export function Heatmap({ rows }: { rows: HeatRow[] }) {
  const tip = useChartTip();
  return (
    <ChartFrame
      title="Tỷ lệ lấp đầy theo toà"
      subtitle="Ô nhạt là toà còn nhiều căn trống, nên đẩy chiến dịch tiếp thị vào đó"
      table={{
        head: ["Phân khu", "Toà", "Đã thuê hoặc giữ chỗ", "Tổng căn", "Tỷ lệ lấp đầy"],
        rows: rows.flatMap((r) => r.cells.map((c) => [r.zone, c.building, c.used, c.total, `${Math.round((c.used / c.total) * 100)}%`])),
      }}
    >
      <div className={styles.plot} data-plot="">
        <div className={styles.heat}>
          {rows.map((r) => (
            <div key={r.zone} className={styles.heatRow}>
              <span className={styles.heatZone}>{r.zone}</span>
              <div className={styles.heatCells}>
                {r.cells.map((c) => {
                  const rate = c.used / c.total;
                  const i = stepFor(rate);
                  return (
                    <div
                      key={c.building}
                      className={styles.cell}
                      style={{ background: SEQ[i], color: darkFill(i) ? "#fff" : "var(--ink)" }}
                      {...tip.bind(`Toà ${c.building}`, [
                        { label: `lấp đầy (${c.used}/${c.total} căn)`, value: `${Math.round(rate * 100)}%` },
                        { label: "căn còn trống", value: String(c.total - c.used) },
                      ])}
                    >
                      <b className="tnum">{Math.round(rate * 100)}%</b>
                      <span>{c.building}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.scale} aria-label="Thang màu: từ trống đến đầy">
          <span className="xs muted">Trống</span>
          <span className={styles.scaleBar}>
            {SEQ.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          <span className="xs muted">Đầy</span>
        </div>
        {tip.node}
      </div>
    </ChartFrame>
  );
}
