"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import styles from "./Charts.module.css";

interface ChartFrameProps {
  title: string;
  subtitle?: string;
  /** Bản bảng số liệu — tương đương truy cập được của biểu đồ. */
  table: { head: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  legend?: { label: string; color: string }[];
  aside?: React.ReactNode;
}

export function ChartFrame({ title, subtitle, table, children, legend, aside }: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className={styles.frame}>
      <figcaption className={styles.cap}>
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <div className={styles.capRight}>
          {aside}
          <button type="button" className={`${styles.toggle} ${asTable ? styles.toggleOn : ""}`} aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
            <Table2 size={14} /> Bảng số liệu
          </button>
        </div>
      </figcaption>
      {legend && legend.length > 1 && !asTable && (
        <ul className={styles.legend} aria-label="Chú giải">
          {legend.map((l) => (
            <li key={l.label}>
              <i style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {asTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={j === 0 ? "" : "tnum"}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}
