import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Khi có, hàng click được: cột đầu là <Link>, cả hàng có nền hover. */
  rowHref?: (row: T) => string;
  empty: ReactNode;
}

/** Bảng danh sách chuẩn cho mọi cổng: xếp chồng nhãn–giá trị dưới 720px. */
export function DataTable<T>({ columns, rows, rowHref, empty }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className={styles.empty}>{empty}</div>;
  }
  return (
    <div className={styles.wrap} role="table">
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align === "right" ? "right" : "left" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowIndex} className={href ? styles.clickable : undefined}>
                {columns.map((col, colIndex) => {
                  const record = row as Record<string, ReactNode>;
                  const content = col.render ? col.render(row) : (record[col.key] ?? "");
                  return (
                    <td key={col.key} data-label={col.header} style={{ textAlign: col.align === "right" ? "right" : "left" }}>
                      {href && colIndex === 0 ? (
                        <Link href={href} className={styles.rowLink}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
