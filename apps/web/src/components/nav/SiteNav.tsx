"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearch, LogIn, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DEMO_USERS, ROLE_LABEL } from "@/lib/mock/auth";
import { signOut, useRole } from "@/lib/mock/useRole";
import styles from "./SiteNav.module.css";

const LINKS = [
  { href: "/units", label: "Tìm căn" },
  { href: "/#quy-trinh", label: "Cách hoạt động" },
  { href: "/booking", label: "Lịch xem của tôi" },
];

/** Thanh điều hướng cổng khách thuê (công khai). */
export function SiteNav({ variant = "solid" }: { variant?: "solid" | "clear" }) {
  const role = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={`${styles.nav} ${variant === "clear" ? styles.clear : ""} no-print`}>
      <div className={`wrap ${styles.inner}`}>
        <Logo sub="Vinhomes Ocean Park 1" />

        <nav className={styles.links} aria-label="Điều hướng chính">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? styles.current : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.right}>
          <Link href="/booking" className={`icon-btn ${styles.onlyMobile}`} aria-label="Kiểm tra lịch xem">
            <CalendarSearch size={20} />
          </Link>
          {role ? (
            <>
              <Link href={DEMO_USERS[role].home} className={`btn btn-quiet btn-sm ${styles.who}`}>
                {role === "tenant" ? DEMO_USERS.tenant.name : `Vào cổng ${ROLE_LABEL[role].toLowerCase()}`}
              </Link>
              <button
                type="button"
                className="icon-btn"
                aria-label="Đăng xuất"
                onClick={() => {
                  signOut();
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <Link href="/login?as=tenant" className="btn btn-primary btn-sm">
              <LogIn size={15} /> Đăng nhập
            </Link>
          )}
          <button type="button" className={`icon-btn ${styles.burger}`} aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={styles.drawer} aria-label="Menu di động">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/login?as=landlord" onClick={() => setOpen(false)}>
            Dành cho chủ nhà
          </Link>
        </nav>
      )}
    </header>
  );
}
