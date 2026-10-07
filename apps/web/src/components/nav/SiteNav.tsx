"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarSearch, ChevronDown, FileText, Heart, LogOut, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { initials } from "@/lib/format";
import { PORTAL_ROLE_LABEL } from "@/lib/auth/roles";
import { PORTAL_HOME } from "@/lib/auth/portals";
import { signOut, useRole, useSession } from "@/lib/auth/client";
import styles from "./SiteNav.module.css";
import { useOptionalLandingPreferences } from "@/components/landing/LandingPreferences";
import { SITE_NAV, TENANT_MENU, VIEWING_LOOKUP, activeNavKey } from "@/lib/nav/siteNav";

/** Nhãn EN cho drawer/menu khi `/` đang ở locale en; route khác giữ tiếng Việt. Khoá = href của TENANT_MENU. */
const TENANT_MENU_EN: Record<string, string> = {
  "/account": "My profile",
  "/account/bookings": "My viewings",
  "/booking": "Look up a booking",
  "/account/saved": "Saved homes",
  "/account/contracts": "Contracts & deposit",
};

const MENU_ICONS = { user: User, calendar: CalendarSearch, search: Search, heart: Heart, file: FileText } as const;

function AccountMenu({ en }: { en: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { user } = useSession();
  const name = user?.fullName ?? user?.email ?? (en ? "Account" : "Tài khoản");

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
        aria-label={en ? `${name}, open account menu` : `${name}, mở menu tài khoản`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar}>{initials(name)}</span>
        <span className={styles.accountName}>{name}</span>
        <ChevronDown size={14} className={`${styles.caret} ${open ? styles.caretOpen : ""}`} />
      </button>
      {open && (
        <div role="menu" className={styles.accountPanel}>
          {TENANT_MENU.map(({ href, label, icon }) => {
            const Icon = MENU_ICONS[icon];
            return (
              <Link key={href} href={href} role="menuitem" className={styles.accountItem} onClick={() => setOpen(false)}>
                <Icon size={16} /> {en ? (TENANT_MENU_EN[href] ?? label) : label}
              </Link>
            );
          })}
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
            <LogOut size={16} /> {en ? "Sign out" : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Id section trang chủ được scrollspy theo dõi (khớp SITE_NAV.how). */
const SPY_ID = "how-it-works";

/** Header công khai thống nhất cho `/`, `/units*`, `/booking*`, `/account*`. `overlay` = nền trong suốt trên hero `/` cho tới khi cuộn. */
export function SiteNav({ variant = "solid" }: { variant?: "solid" | "overlay" }) {
  const role = useRole();
  const { ready } = useSession();
  const pathname = usePathname();
  const prefs = useOptionalLandingPreferences();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const locale = prefs?.locale ?? "vi";
  const isHome = pathname === "/";
  const overlay = variant === "overlay";
  const activeKey = activeNavKey(pathname, isHome ? section : null);
  const en = isHome && locale === "en";
  const menuLabel = (href: string, label: string) => (en ? (TENANT_MENU_EN[href] ?? label) : label);
  const labelOf = (item: (typeof SITE_NAV)[number]) => (isHome && locale === "en" ? item.labelEn : item.label);

  useEffect(() => {
    if (!overlay) return;
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [overlay]);

  // Scrollspy "Cách hoạt động": chỉ ở "/". Section có thể mount muộn nên thử lại vài lần.
  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver | null = null;
    let tries = 0;
    const attach = () => {
      const el = document.getElementById(SPY_ID);
      if (!el) return false;
      observer = new IntersectionObserver(
        (entries) => setSection(entries.some((entry) => entry.isIntersecting) ? SPY_ID : null),
        { rootMargin: "-45% 0px -50% 0px" },
      );
      observer.observe(el);
      return true;
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    if (!attach()) {
      timer = setInterval(() => {
        tries += 1;
        if (attach() || tries >= 20) clearInterval(timer);
      }, 300);
    }
    return () => {
      if (timer) clearInterval(timer);
      observer?.disconnect();
      setSection(null);
    };
  }, [isHome]);

  // Burger: khoá cuộn + Escape đóng, mọi route.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  /** Bấm "Trang chủ" khi đã ở "/" ⇒ cuộn về đầu, không tải lại. */
  const onNavClick = (href: string) => (event: React.MouseEvent) => {
    setOpen(false);
    if (href === "/" && isHome) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const portalHome = role && role !== "tenant" ? PORTAL_HOME[role] : undefined;
  const prefsLabel = locale === "vi" ? "Tuỳ chọn trang" : "Page preferences";

  return (
    <header className={`${styles.header} ${overlay ? styles.overlay : ""} ${overlay && scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Logo sub="Ocean Park 1 · Hà Nội" />

        <nav className={styles.links} aria-label="Điều hướng chính">
          {SITE_NAV.map((item) => {
            const active = item.key === activeKey;
            return (
              <Link key={item.key} href={item.href} className={active ? styles.current : ""} aria-current={active ? "page" : undefined} onClick={onNavClick(item.href)}>
                {labelOf(item)}
              </Link>
            );
          })}
        </nav>

        <div className={styles.right}>
          {prefs && (
            <div className={styles.landingControls} aria-label={prefsLabel}>
              <div className={styles.localeSwitch} aria-label="Language">
                <button type="button" aria-pressed={locale === "vi"} onClick={() => prefs.setLocale("vi")}>VI</button>
                <button type="button" aria-pressed={locale === "en"} onClick={() => prefs.setLocale("en")}>EN</button>
              </div>
              <button type="button" className={styles.themeSwitch} aria-label={prefs.dark ? (locale === "vi" ? "Bật giao diện sáng" : "Switch to light mode") : (locale === "vi" ? "Bật giao diện tối" : "Switch to dark mode")} onClick={prefs.toggleTheme}>
                {prefs.dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          )}
          {role === "tenant" ? (
            <>
              <Link href={VIEWING_LOOKUP.href} className={`${styles.loginLink} ${styles.desktopOnly}`} aria-current={pathname.startsWith(VIEWING_LOOKUP.href) ? "page" : undefined}>
                <CalendarSearch size={15} aria-hidden="true" />&nbsp;{en ? VIEWING_LOOKUP.labelEn : VIEWING_LOOKUP.label}
              </Link>
              <AccountMenu en={en} />
            </>
          ) : role ? (
            <>
              {portalHome && (
                <Link href={portalHome} className={`${styles.enterLink} ${styles.desktopOnly}`}>{en ? "Go to portal" : `Vào cổng ${PORTAL_ROLE_LABEL[role]}`}</Link>
              )}
              <button type="button" className={`${styles.signOut} ${styles.desktopOnly}`} onClick={() => void signOut("/")} title={en ? "Sign out" : "Đăng xuất"} aria-label={en ? "Sign out" : "Đăng xuất"}>
                <LogOut size={17} />
              </button>
            </>
          ) : !ready ? (
            <span className={styles.placeholder} aria-hidden="true" />
          ) : (
            <>
              <Link href="/login" className={`${styles.loginLink} ${styles.desktopOnly}`}>{locale === "vi" ? "Đăng nhập" : "Sign in"}</Link>
              <Link href="/login?tab=landlord" className={styles.ctaLink}>{locale === "vi" ? "Cho thuê nhà" : "List a home"}</Link>
            </>
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
          {SITE_NAV.map((item) => (
            <Link key={item.key} href={item.href} onClick={onNavClick(item.href)}>{labelOf(item)}</Link>
          ))}
          {prefs && <div className={styles.drawerPrefs}>
            <span>{locale === "vi" ? "Ngôn ngữ" : "Language"}</span>
            <div className={styles.localeSwitch} aria-label="Language">
              <button type="button" aria-pressed={locale === "vi"} onClick={() => prefs.setLocale("vi")}>VI</button>
              <button type="button" aria-pressed={locale === "en"} onClick={() => prefs.setLocale("en")}>EN</button>
            </div>
            <button type="button" className={styles.themeSwitch} onClick={prefs.toggleTheme} aria-label={prefs.dark ? "Light mode" : "Dark mode"}>{prefs.dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>}
          {role === "tenant" && TENANT_MENU.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{menuLabel(href, label)}</Link>
          ))}
          <div className={styles.drawerDivider} />
          {role ? (
            <div className={styles.drawerActions}>
              {portalHome && role !== "tenant" && <Link href={portalHome} onClick={() => setOpen(false)}>{en ? "Go to portal" : `Vào cổng ${PORTAL_ROLE_LABEL[role]}`}</Link>}
              <button type="button" onClick={() => { setOpen(false); void signOut("/"); }}>{en ? "Sign out" : "Đăng xuất"}</button>
            </div>
          ) : (
            <div className={styles.drawerActions}>
              <Link href="/login" onClick={() => setOpen(false)}>{en ? "Sign in" : "Đăng nhập"}</Link>
              <Link href="/login?tab=landlord" onClick={() => setOpen(false)}>{en ? "List a home" : "Cho thuê nhà"}</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
