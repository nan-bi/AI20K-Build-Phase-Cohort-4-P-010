import type { ReactNode } from "react";
import styles from "./KeyValue.module.css";

interface KeyValueItem {
  label: string;
  value: ReactNode;
}

interface KeyValueProps {
  items: KeyValueItem[];
}

/** Lưới nhãn–giá trị cho trang chi tiết và hồ sơ. */
export function KeyValue({ items }: KeyValueProps) {
  return (
    <dl className={styles.grid}>
      {items.map((item, i) => (
        <div key={i} className={styles.row}>
          <dt className="muted small">{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
