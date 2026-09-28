import type { ReactNode } from "react";
import styles from "./StatusBadge.module.css";

export type StatusTone = "neutral" | "info" | "ok" | "warn" | "danger";

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
}

/** Nhãn trạng thái nhỏ dùng trong bảng và hồ sơ chi tiết; "warn" dùng hổ phách làm tín hiệu. */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
