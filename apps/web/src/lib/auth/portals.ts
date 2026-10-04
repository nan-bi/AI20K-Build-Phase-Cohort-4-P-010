export type Portal = "tenant" | "landlord" | "host" | "admin";

/** Vai của Field Host — trùng `HostRoleCode` của backend (`auth/host-roles.ts`). */
export type HostRoleCode = "sale" | "inspector";

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
  /** Field Host: Profile đã có hồ sơ `field_hosts` (do Admin tạo). */
  isHostVerified: boolean;
  hostRoles: HostRoleCode[];
}

/** Trang đích cổng Host theo vai — trùng `hostHome` của backend. */
export function hostHome(roles: readonly HostRoleCode[]): string {
  if (roles.includes("sale")) return "/host/dispatch";
  if (roles.includes("inspector")) return "/host/inspections";
  return "/host/account";
}

/** Host đã đăng nhập nhưng chưa có hồ sơ Field Host ⇒ chuyển về trang đăng nhập kèm lỗi; null = cho vào. */
export function hostGateRedirect(user: Pick<SessionUser, "portal" | "isHostVerified">): string | null {
  if (user.portal !== "host" || user.isHostVerified) return null;
  return "/admin/login?tab=host&error=host_not_provisioned";
}

/** Chỉ cho phép chuyển hướng nội bộ, tránh open-redirect qua `next`. */
export const safeNext = (next: string | null | undefined): string | undefined =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
