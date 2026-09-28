import type { ReactNode } from "react";
import { Facade } from "@/components/brand/Facade";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Hiện motif mặt tiền nhỏ — dùng cho trạng thái rỗng lớn, không dùng trong bảng. */
  art?: boolean;
}

/** Trạng thái rỗng: nói rõ chưa có gì và mời một hành động cụ thể. */
export function EmptyState({ title, description, action, art }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {art && <Facade className={styles.facade} lit={6} />}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className="muted prose">{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
