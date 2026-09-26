"use client";

import { useState } from "react";
import styles from "./Charts.module.css";

export interface TipRow {
  label: string;
  value: string;
  /** Màu khoá của chuỗi (đường ngắn), không tô màu chữ. */
  key?: string;
}

interface TipState {
  x: number;
  y: number;
  title?: string;
  rows: TipRow[];
}

/** Tooltip dùng chung: bám con trỏ (hover) hoặc phần tử đang focus (bàn phím). Giá trị dẫn đầu, tên đứng sau. */
export function useChartTip() {
  const [tip, setTip] = useState<TipState | null>(null);

  // Tìm khung biểu đồ từ chính phần tử phát sự kiện (thay vì giữ ref), khung được đánh dấu data-plot.
  const at = (from: Element, clientX: number, clientY: number, title: string | undefined, rows: TipRow[]) => {
    const box = from.closest("[data-plot]");
    if (!box) return;
    const r = box.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 96), Math.max(96, r.width - 96));
    setTip({ x, y: clientY - r.top, title, rows });
  };

  const bind = (title: string | undefined, rows: TipRow[]) => ({
    onPointerMove: (e: React.PointerEvent) => at(e.currentTarget as Element, e.clientX, e.clientY, title, rows),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<Element>) => {
      const b = e.currentTarget.getBoundingClientRect();
      at(e.currentTarget, b.left + b.width / 2, b.top, title, rows);
    },
    onBlur: () => setTip(null),
    tabIndex: 0,
  });

  const node = tip && (
    <div className={styles.tip} style={{ left: tip.x, top: tip.y }} role="status">
      {tip.title && <div className={styles.tipTitle}>{tip.title}</div>}
      {tip.rows.map((r) => (
        <div key={r.label} className={styles.tipRow}>
          {r.key && <i style={{ background: r.key }} />}
          <b>{r.value}</b>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );

  return { bind, node, hide: () => setTip(null), at };
}
