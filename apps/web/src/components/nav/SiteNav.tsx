"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarSearch, ChevronDown, FileText, Heart, LogIn, LogOut, Menu, Moon, Sun, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { initials } from "@/lib/format";
import { PORTAL_ROLE_LABEL } from "@/lib/auth/roles";
import { PORTAL_HOME } from "@/lib/auth/portals";
import { signOut, useRole, useSession } from "@/lib/auth/client";
import styles from "./SiteNav.module.css";
import { useOptionalLandingPreferences } from "@/components/landing/LandingPreferences";

const LINKS = [
  { href: "/units", label: "Tìm căn" },
  { href: "/#quy-trinh", label: "Cách hoạt động" },
  { href: "/booking", label: "Tra cứu lịch xem" },
];

const ACCOUNT_LINKS = [
  { href: "/account", label: "Hồ sơ của tôi", icon: User },
  { href: "/account/bookings", label: "Lịch xem", icon: CalendarSearch },
  { href: "/account/saved", label: "Căn đã lưu", icon: Heart },
  { href: "/account/contracts", label: "Hợp đồng & cọc", icon: FileText },
];

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { user } = useSession();
  const name = user?.fullName ?? user?.email ?? "Tài khoản";

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
      <button
        type="button"
        className={styles.accountBtn}
        aria-expanded={open}
        aria-label={`${name}, mở menu tài khoản`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.accountName}>{name}</span>
        <ChevronDown size={14} className={`${styles.caret} ${open ? styles.caretOpen : ""}`} />
      </button>
      {open && (
        <div role="menu" className={styles.accountPanel}>
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" className={styles.accountItem} onClick={() => setOpen(false)}>
              <Icon size={16} /> {label}
            </Link>
          ))}
          <div className={styles.accountDivider} />
          <button
            type="button"
            role="menuitem"
            className={`${styles.accountItem} ${styles.accountDanger}`}
            onClick={() => {
              setOpen(false);
              void signOut("/");
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/** Thanh điều hướng dành cho danh mục căn và các cổng tài khoản. */
export function SiteNav({ variant = "solid" }: { variant?: "solid" | "clear" | "landing" }) {
  const role = useRole();
  const { user, ready } = useSession();
  const pathname = usePathname();
  const prefs = useOptionalLandingPreferences();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const locale = prefs?.locale ?? "vi";
  const navLinks = variant === "landing"
    ? [
        { href: "#top", label: locale === "vi" ? "Trang chủ" : "Home" },
        { href: "/units", label: locale === "vi" ? "Thuê nhà" : "Rent" },
        { href: "#can-ho", label: locale === "vi" ? "Căn hộ" : "Apartments" },
        { href: "#danh-cho-chu-nha", label: locale === "vi" ? "Chủ nhà" : "Owners" },
        { href: "#ai-tro-ly", label: locale === "vi" ? "AI trợ lý" : "AI assistant" },
        { href: "#quy-trinh", label: locale === "vi" ? "Quy trình" : "How it works" },
        { href: "#bang-gia", label: locale === "vi" ? "Bảng phí" : "Fees" },
        { href: "#ve-chung-toi", label: locale === "vi" ? "Về VinStay" : "About" },
      ]
    : LINKS;

  useEffect(() => {
    if (variant !== "landing") return;
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [variant]);

  useEffect(() => {
    if (!open || variant !== "landing" || window.innerWidth > 820) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, variant]);

  return (
    <header className={`${styles.header} ${variant === "clear" ? styles.clear : ""} ${variant === "landing" ? styles.landingHeader : ""} ${variant === "landing" && scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Logo sub={variant === "landing" ? (locale === "vi" ? "Căn hộ · Hà Nội" : "Apartments · Hanoi") : "Ocean Park 1 · Hà Nội"} />

        <nav className={styles.links} aria-label="Điều hướng chính">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href.startsWith("#") && pathname === "/" && link.href === "#top");
            return (
              <Link key={link.href} href={link.href} className={active ? styles.current : ""} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          {variant === "landing" && prefs && (
            <div className={styles.landingControls} aria-label={locale === "vi" ? "Tuỳ chọn trang" : "Page preferences"}>
              <div className={styles.localeSwitch} aria-label="Language">
                <button type="button" aria-pressed={locale === "vi"} onClick={() => prefs.setLocale("vi")}>VI</button>
                <button type="button" aria-pressed={locale === "en"} onClick={() => prefs.setLocale("en")}>EN</button>
              </div>
              <button type="button" className={styles.themeSwitch} aria-label={prefs.dark ? (locale === "vi" ? "Bật giao diện sáng" : "Switch to light mode") : (locale === "vi" ? "Bật giao diện tối" : "Switch to dark mode")} onClick={prefs.toggleTheme}>
                {prefs.dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          )}
          <Link href="/booking" className={styles.mobileIcon} aria-label="Tra cứu lịch xem">
            <CalendarSearch size={18} />
          </Link>
          {role === "tenant" ? (
            <AccountMenu />
          ) : role ? (
            <>
              <span className={`${styles.roleChip} ${styles.desktopOnly}`}>
                <span className={styles.roleLabel}>{PORTAL_ROLE_LABEL[role]}</span>
                <span>{user?.fullName ?? user?.email}</span>
              </span>
              <Link href={PORTAL_HOME[role]} className={`${styles.enterLink} ${styles.desktopOnly}`}>Vào cổng</Link>
              <button type="button" className={`${styles.signOut} ${styles.desktopOnly}`} onClick={() => void signOut("/")} title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut size={17} />
              </button>
            </>
          ) : !ready ? (
            <span className={styles.desktopOnly} aria-hidden="true" />
          ) : (
            <div className={`${styles.right} ${styles.desktopOnly}`}>
              <Link href="/login?tab=landlord" className={styles.landlordLink}>{locale === "vi" ? "Cho thuê nhà" : "List a home"}</Link>
              <Link href="/login" className={styles.loginLink}><LogIn size={14} /> {locale === "vi" ? "Đăng nhập" : "Sign in"}</Link>
              <Link href={variant === "landing" ? "/login?tab=landlord" : "/login"} className={styles.signupLink}>{variant === "landing" ? (locale === "vi" ? "Đăng tin" : "List a home") : (locale === "vi" ? "Bắt đầu" : "Get started")}</Link>
            </div>
          )}
          <button
            type="button"
            className={styles.burger}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className={styles.drawer} aria-label="Menu di động">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
          ))}
          {variant === "landing" && prefs && <div className={styles.drawerPrefs}>
            <span>{locale === "vi" ? "Ngôn ngữ" : "Language"}</span>
            <div className={styles.localeSwitch} aria-label="Language">
              <button type="button" aria-pressed={locale === "vi"} onClick={() => prefs.setLocale("vi")}>VI</button>
              <button type="button" aria-pressed={locale === "en"} onClick={() => prefs.setLocale("en")}>EN</button>
            </div>
            <button type="button" className={styles.themeSwitch} onClick={prefs.toggleTheme} aria-label={prefs.dark ? "Light mode" : "Dark mode"}>{prefs.dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>}
          {role === "tenant" && ACCOUNT_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <div className={styles.drawerDivider} />
          {role ? (
            <div className={styles.drawerActions}>
              <Link href={PORTAL_HOME[role]} onClick={() => setOpen(false)}>Vào cổng của tôi</Link>
              <button type="button" onClick={() => { setOpen(false); void signOut("/"); }}>Đăng xuất</button>
            </div>
          ) : (
            <div className={styles.drawerActions}>
              <Link href="/login" onClick={() => setOpen(false)}>Đăng nhập</Link>
              <Link href="/login?tab=landlord" onClick={() => setOpen(false)}>Cho thuê nhà</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
