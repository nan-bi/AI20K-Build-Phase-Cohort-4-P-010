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
}

interface PortalShellProps {
  portal: string;
  userName: string;
  userMeta: string;
  nav: PortalNavItem[];
  children: React.ReactNode;
}

/** Khung dashboard có sidebar cho cổng Chủ nhà và Admin (trên mobile sidebar thành thanh cuộn ngang). */
export function PortalShell({ portal, userName, userMeta, nav, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <Logo inverse href="/" sub={portal} />
        </div>
        <nav className={styles.nav} aria-label={`Điều hướng ${portal}`}>
          {nav.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={active ? styles.active : ""} aria-current={active ? "page" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
                {!!badge && <i>{badge}</i>}
              </Link>
            );
          })}
        </nav>
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
              router.push("/login");
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
