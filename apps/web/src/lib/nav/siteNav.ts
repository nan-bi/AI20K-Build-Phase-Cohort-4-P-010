// Cấu hình điều hướng header công khai — MỘT nguồn duy nhất (hồ sơ 17, 01-CONTRACTS §1).

export type SiteNavKey = "home" | "units" | "how";

export interface SiteNavItem {
  key: SiteNavKey;
  /** Route hoặc "/#<anchor>". */
  href: string;
  /** Nhãn tiếng Việt. */
  label: string;
  /** Chỉ dùng trên "/" khi locale = "en". */
  labelEn: string;
}

export const SITE_NAV: readonly SiteNavItem[] = [
  { key: "home", href: "/", label: "Trang chủ", labelEn: "Home" },
  { key: "units", href: "/units", label: "Tìm căn", labelEn: "Find a home" },
  { key: "how", href: "/#how-it-works", label: "Cách hoạt động", labelEn: "How it works" },
];

/** Khớp theo đoạn đường dẫn: `/units` và `/units/...` đều khớp, `/unitsx` thì không. */
function matchesSegment(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Mục đang active. `section` = id section đang trong khung nhìn ở "/" (scrollspy), null nếu không có. */
export function activeNavKey(pathname: string, section: string | null): SiteNavKey | null {
  if (pathname === "/") return section === "how-it-works" ? "how" : "home";
  if (matchesSegment(pathname, "/units")) return "units";
  return null;
}

/** Menu tài khoản Khách thuê. */
export const TENANT_MENU: readonly { href: string; label: string; icon: "user" | "calendar" | "search" | "heart" | "file" }[] = [
  { href: "/account", label: "Hồ sơ của tôi", icon: "user" },
  { href: "/account/bookings", label: "Lịch xem của tôi", icon: "calendar" },
  { href: "/booking", label: "Tra cứu mã lịch", icon: "search" },
  { href: "/account/saved", label: "Căn đã lưu", icon: "heart" },
  { href: "/account/contracts", label: "Hợp đồng & cọc", icon: "file" },
];
