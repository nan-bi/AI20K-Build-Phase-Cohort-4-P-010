import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}

/** Tiêu đề đầu trang cho mọi màn trong PortalShell: tên màn, mô tả một câu, hành động chính. */
export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {back && (
          <Link href={back.href} className={styles.back}>
            <ArrowLeft size={16} />
            {back.label}
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={`muted prose ${styles.description}`}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
