import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Bỏ padding thân — dùng khi children đã tự có khoảng cách, ví dụ DataTable. */
  flush?: boolean;
}

/** Panel viền một cấp cho một nhóm nội dung: bảng, form hoặc khối chi tiết. */
export function Section({ title, description, actions, children, flush }: SectionProps) {
  const hasHead = Boolean(title || description || actions);
  return (
    <section className={styles.section}>
      {hasHead && (
        <header className={styles.head}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className="muted small">{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
