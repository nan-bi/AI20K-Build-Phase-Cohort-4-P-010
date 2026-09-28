"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/nav/SiteNav";
import styles from "./layout.module.css";

const MENU = [
  { href: "/account", label: "Hồ sơ" },
  { href: "/account/bookings", label: "Lịch xem của tôi" },
  { href: "/account/saved", label: "Căn đã lưu" },
  { href: "/account/contracts", label: "Hợp đồng & cọc" },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <SiteNav />
      <div className={styles.body}>
        <nav className={styles.side} aria-label="Menu tài khoản">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className={pathname === m.href ? styles.active : ""}>
              {m.label}
            </Link>
          ))}
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
}
