export type Portal = "tenant" | "landlord" | "host" | "admin";

export const PORTAL_HOME: Record<Portal, string> = {
  tenant: "/",
  landlord: "/landlord/dashboard",
  host: "/host/dispatch",
  admin: "/admin/dashboard",
};

/** Cổng cần đăng nhập để vào một đường dẫn; null = công khai. */
export function portalForPath(pathname: string): Exclude<Portal, "tenant"> | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/landlord")) return "landlord";
  if (pathname.startsWith("/host")) return "host";
  return null;
}

export function loginPathFor(portal: Portal): string {
  if (portal === "landlord") return "/login?tab=landlord";
  if (portal === "tenant") return "/login";
  return portal === "host" ? "/admin/login?tab=host" : "/admin/login";
}

/** Người dùng do `GET /api/v1/auth/session` trả về (không bao giờ chứa token). */
export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  portal: Portal | null;
  isHostVerified: boolean;
  pendingHostId?: string;
}
