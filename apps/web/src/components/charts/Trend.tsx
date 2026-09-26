"use client";

import { useState } from "react";
import { ChartFrame } from "./ChartFrame";
import { niceScale } from "./scale";
import { SERIES } from "./tokens";
import { useChartTip } from "./useChartTip";
import { useMeasure } from "./useMeasure";
import styles from "./Charts.module.css";

interface TrendProps {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  seriesName: string;
}

const H = 230;
const PAD = { l: 36, r: 46, t: 18, b: 28 };

/** Đường xu hướng một series: đường 2px, vùng tô ~10%, con trỏ chữ thập bám vào ngày gần nhất, chấm cuối có viền nền 2px. */
export function Trend({ title, subtitle, data, seriesName }: TrendProps) {
  const tip = useChartTip();
  const [W, measure] = useMeasure();
  const [hover, setHover] = useState<number | null>(null);
  const { max, step } = niceScale(Math.max(...data.map((d) => d.value), 1));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const lastI = data.length - 1;

  return (
    <ChartFrame title={title} subtitle={subtitle} table={{ head: ["Ngày", seriesName], rows: data.map((d) => [d.label, d.value]) }}>
      <div className={styles.plot} data-plot="" ref={measure}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          role="img"
          aria-label={`${title}. ${data.map((d) => `${d.label}: ${d.value}`).join("; ")}`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - PAD.l) / iw) * (data.length - 1));
            const idx = Math.min(data.length - 1, Math.max(0, i));
            setHover(idx);
            tip.at(e.currentTarget, e.clientX, e.clientY, data[idx].label, [{ label: seriesName, value: String(data[idx].value), key: SERIES }]);
          }}
          onPointerLeave={() => {
            setHover(null);
            tip.hide();
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? styles.axis : styles.grid} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className={styles.tick}>
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (i % 2 === 0 && i !== lastI - 1) || i === lastI ? (
              <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" className={styles.tick}>
                {d.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={SERIES} opacity="0.1" />
          <path d={line} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} className={styles.cross} />}
          <circle cx={x(hover ?? lastI)} cy={y(data[hover ?? lastI].value)} r="5" fill={SERIES} stroke="#fff" strokeWidth="2" />
          {hover === null && (
            <text x={x(lastI) + 10} y={y(data[lastI].value) + 4} className={styles.endLabel}>
              {data[lastI].value}
            </text>
          )}
        </svg>
        {tip.node}
      </div>
    </ChartFrame>
  );
}
