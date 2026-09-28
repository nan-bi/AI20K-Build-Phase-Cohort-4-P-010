import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Facade } from "@/components/brand/Facade";
import styles from "./AuthLayout.module.css";

interface AsideCopy {
  caption: string;
  lit: number;
}

const ASIDE_COPY: Record<"default" | "internal", AsideCopy> = {
  default: {
    caption: "Tìm căn thật, biết trước mọi chi phí hàng tháng, xem nhà có Field Host đón tại sảnh.",
    lit: 17,
  },
  internal: {
    caption: "Khu vực nội bộ VinStay",
    lit: 4,
  },
};

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "internal" cho admin: panel trái chỉ Logo + lời nhắc khu nội bộ, Facade mờ. */
  aside?: "default" | "internal";
}

/** Khung hai cột cho các màn đăng nhập/đăng ký: panel trái thương hiệu, panel phải là form. */
export function AuthLayout({ title, description, children, footer, aside = "default" }: AuthLayoutProps) {
  const copy = ASIDE_COPY[aside];
  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <Logo inverse />
        <Facade className={styles.facade} lit={copy.lit} />
        <p className={styles.caption}>{copy.caption}</p>
      </aside>
      <div className={styles.main}>
        <div className={styles.panel}>
          <div className={styles.mobileLogo}>
            <Logo />
          </div>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={`muted prose ${styles.description}`}>{description}</p>}
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
