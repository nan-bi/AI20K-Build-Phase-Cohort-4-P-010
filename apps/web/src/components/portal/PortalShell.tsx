"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { signOut } from "@/lib/mock/useRole";
import { initials } from "@/lib/mock/format";
import styles from "./PortalShell.module.css";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Tiền tố đường dẫn khác cũng tính là mục này đang active, vd ["/host/viewing"]. */
  match?: string[];
}

interface PortalShellProps {
  portal: string;
  userName: string;
  userMeta: string;
  nav: PortalNavItem[];
  children: React.ReactNode;
  /** Đích sau đăng xuất. Mặc định "/login". */
  signOutHref?: string;
  /** Nội dung phụ trong sidebar, giữa nav và khối người dùng. */
  sideSlot?: React.ReactNode;
}

/** Thuần, export để test: active khi khớp href, href/…, hoặc một tiền tố trong match (khớp p hoặc p/…). */
export function isNavActive(pathname: string, item: Pick<PortalNavItem, "href" | "match">): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  if (item.match) {
    for (const prefix of item.match) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return true;
      }
    }
  }
  return false;
}

/** Khung dashboard có sidebar cho cổng Chủ nhà và Admin (trên mobile sidebar thành thanh cuộn ngang). */
export function PortalShell({ portal, userName, userMeta, nav, children, signOutHref, sideSlot }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <Logo inverse href="/" sub={portal} />
        </div>
        <nav className={styles.nav} aria-label={`Điều hướng ${portal}`}>
          {nav.map((item) => {
            const active = isNavActive(pathname, item);
            const { href, label, icon: Icon, badge } = item;
            return (
              <Link key={href} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
                {!!badge && <i>{badge}</i>}
              </Link>
            );
          })}
        </nav>
        {sideSlot && <div className={styles.slot}>{sideSlot}</div>}
        <div className={styles.user}>
          <span className={styles.avatar}>{initials(userName)}</span>
          <div>
            <strong>{userName}</strong>
            <span>{userMeta}</span>
          </div>
          <button
            type="button"
            className={styles.out}
            aria-label="Đăng xuất"
            onClick={() => {
              signOut();
              router.push(signOutHref ?? "/login");
              router.refresh();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
