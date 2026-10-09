"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { signOut } from "@/lib/auth/client";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

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
  /** Nhãn breadcrumb cho các đường dẫn không nằm trong `nav` (vd. trang con tĩnh). */
  crumbLabels?: Record<string, string>;
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
export function PortalShell({ portal, userName, userMeta, nav, children, signOutHref, sideSlot, crumbLabels }: PortalShellProps) {
  const pathname = usePathname();
  const labels = { ...Object.fromEntries(nav.map((n) => [n.href, n.label])), ...crumbLabels };

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-background text-foreground">
      <aside className="md:w-64 lg:w-72 shrink-0 bg-[#123d3a] text-[#eef5f0] flex flex-col border-b md:border-b-0 md:border-r border-[#2a514b] sticky top-0 z-40 md:h-[100dvh]">
        <div className="p-4 md:p-6 pb-4 md:pb-8 shrink-0 flex items-center justify-between md:block">
          <Logo inverse href="/" sub={portal} />
        </div>

        <nav
          className="flex-1 overflow-x-auto md:overflow-y-auto overflow-y-hidden px-4 md:px-3 pb-2 md:pb-4 flex md:flex-col gap-1 md:gap-1.5 scrollbar-none"
          aria-label={`Điều hướng ${portal}`}
        >
          {nav.map((item) => {
            const active = isNavActive(pathname, item);
            const { href, label, icon: Icon, badge } = item;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 md:py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0 md:shrink
                  ${active
                    ? "bg-[#23534d] text-white shadow-sm"
                    : "text-[#b9cfca] hover:bg-[#1a4842] hover:text-white"
                  }
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} className={active ? "text-[#e6bc73]" : "opacity-75"} />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full font-bold
                    ${active ? "bg-[#e6bc73]/20 text-[#f0ca86]" : "bg-[#1a4842] text-[#d1e0da]"}
                  `}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {sideSlot && <div className="hidden md:block px-4 py-2 shrink-0">{sideSlot}</div>}

        <div className="hidden md:flex items-center gap-3 p-4 m-3 mt-0 rounded-2xl bg-[#194640] border border-[#2a5a52] shrink-0">
          <span className="w-10 h-10 rounded-full bg-[#dcefe8] text-[#105b53] flex items-center justify-center font-bold text-sm shrink-0">
            {initials(userName)}
          </span>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <strong className="text-sm font-semibold truncate text-white">{userName}</strong>
            <span className="text-xs text-[#b9cfca] truncate">{userMeta}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#b9cfca] hover:text-white hover:bg-[#23534d] rounded-xl shrink-0"
            aria-label="Đăng xuất"
            onClick={() => void signOut(signOutHref ?? "/login")}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-muted/20 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <Breadcrumbs root={{ href: nav[0]?.href ?? "/", label: portal }} labels={labels} />
        {children}
      </main>
    </div>
  );
}
