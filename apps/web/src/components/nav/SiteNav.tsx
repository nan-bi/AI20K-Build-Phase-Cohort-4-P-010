"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarSearch, ChevronDown, FileText, Heart, LogIn, LogOut, Menu, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { initials } from "@/lib/mock/format";
import { ROLE_LABEL } from "@/lib/mock/actors";
import { PORTAL_HOME } from "@/lib/auth/portals";
import { signOut, useRole, useSession } from "@/lib/auth/client";
import styles from "./SiteNav.module.css";

const LINKS = [
  { href: "/units", label: "Tìm căn" },
  { href: "/#quy-trinh", label: "Cách hoạt động" },
  { href: "/booking", label: "Tra cứu lịch xem" },
];

const ACCOUNT_LINKS = [
  { href: "/account", label: "Hồ sơ", icon: User },
  { href: "/account/bookings", label: "Lịch xem của tôi", icon: CalendarSearch },
  { href: "/account/saved", label: "Căn đã lưu", icon: Heart },
  { href: "/account/contracts", label: "Hợp đồng & cọc", icon: FileText },
];

/** Menu tài khoản (nút tên + avatar chữ cái) cho khách thuê đã đăng nhập. */
function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { user } = useSession();
  const name = user?.fullName ?? user?.email ?? "Tài khoản";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.account} ref={root}>
      <button type="button" className={styles.accountBtn} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.who}>{name}</span>
        <ChevronDown size={14} className={styles.caret} />
      </button>
      {open && (
        <div role="menu" className={styles.accountPanel}>
          {ACCOUNT_LINKS.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" className={styles.accountItem} onClick={() => setOpen(false)}>
              <l.icon size={16} />
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className={`${styles.accountItem} ${styles.accountDanger}`}
            onClick={() => {
              setOpen(false);
              void signOut("/");
            }}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/** Thanh điều hướng cổng khách thuê (công khai). */
export function SiteNav({ variant = "solid" }: { variant?: "solid" | "clear" }) {
  const role = useRole();
  const { user, ready } = useSession();
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
          <Link href="/booking" className={`icon-btn ${styles.onlyMobile}`} aria-label="Tra cứu lịch xem">
            <CalendarSearch size={20} />
          </Link>
          {role === "tenant" ? (
            <div className={styles.who}>
              <AccountMenu />
            </div>
          ) : role ? (
            <>
              <span className={`${styles.roleChip} ${styles.who}`}>
                Đang đăng nhập: {ROLE_LABEL[role]}
                <span className={styles.roleName}> · {user?.fullName ?? user?.email}</span>
              </span>
              <Link href={PORTAL_HOME[role]} className={`btn btn-quiet btn-sm ${styles.who}`}>
                Vào cổng
              </Link>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => void signOut("/")}
              >
                <LogOut size={15} /> Đăng xuất
              </button>
            </>
          ) : !ready ? (
            <span className="skeleton" style={{ width: 168, height: 34 }} aria-hidden="true" />
          ) : (
            <>
              <Link href="/login?tab=landlord" className={`${styles.landlordLink} ${styles.who}`}>
                Cho thuê nhà
              </Link>
              <Link href="/login" className={`btn btn-quiet btn-sm ${styles.onlyDesktop}`}>
                <LogIn size={15} /> Đăng nhập
              </Link>
              <Link href="/login" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </>
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
          {role === "tenant" &&
            ACCOUNT_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          {!role && (
            <Link href="/login?tab=landlord" onClick={() => setOpen(false)}>
              Cho thuê nhà
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
