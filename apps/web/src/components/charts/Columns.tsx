"use client";

import { ChartFrame } from "./ChartFrame";
import { niceScale } from "./scale";
import { CONTEXT, SERIES } from "./tokens";
import { useChartTip } from "./useChartTip";
import { useMeasure } from "./useMeasure";
import styles from "./Charts.module.css";

export interface ColumnDatum {
  label: string;
  value: number;
}

interface ColumnsProps {
  title: string;
  subtitle: string;
  data: ColumnDatum[];
  /** Nhãn trục / tooltip. */
  axisFormat: (v: number) => string;
  valueFormat: (v: number) => string;
  seriesName: string;
}

const H = 250;
const PAD = { l: 48, r: 12, t: 22, b: 30 };

/** Cột dọc một series, nhấn tháng hiện tại (emphasis) và để các tháng còn lại làm nền. */
export function Columns({ title, subtitle, data, axisFormat, valueFormat, seriesName }: ColumnsProps) {
  const tip = useChartTip();
  const [W, measure] = useMeasure();
  const { max, step } = niceScale(Math.max(...data.map((d) => d.value), 1));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const band = iw / data.length;
  const bw = Math.min(24, band * 0.5);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const last = data.length - 1;

  return (
    <ChartFrame title={title} subtitle={subtitle} table={{ head: ["Kỳ", seriesName], rows: data.map((d) => [d.label, valueFormat(d.value)]) }}>
      <div className={styles.plot} data-plot="" ref={measure}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={`${title}. ${data.map((d) => `${d.label}: ${valueFormat(d.value)}`).join("; ")}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axis : styles.grid} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className={styles.tick}>
                {axisFormat(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.l + band * i + band / 2;
            const top = y(d.value);
            const h = y(0) - top;
            const r = Math.min(4, h);
            const x0 = cx - bw / 2;
            const path = `M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${y(0)} Z`;
            return (
              <g key={d.label} {...tip.bind(d.label, [{ label: seriesName, value: valueFormat(d.value), key: SERIES }])} className={styles.hit}>
                <rect x={PAD.l + band * i} y={PAD.t} width={band} height={ih + PAD.b} fill="transparent" />
                <path d={path} fill={i === last ? SERIES : CONTEXT} className={styles.col} />
                {i === last && (
                  <text x={cx} y={top - 8} textAnchor="middle" className={styles.endLabel}>
                    {valueFormat(d.value)}
                  </text>
                )}
                <text x={cx} y={H - 8} textAnchor="middle" className={styles.tick}>
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {tip.node}
      </div>
    </ChartFrame>
  );
}
