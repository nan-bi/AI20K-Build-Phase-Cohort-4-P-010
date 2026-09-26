/**
 * "Portal" là cổng đăng nhập ở FE (4 màn hình), còn "role" là mã vai trò trong bảng `roles`
 * (SAD v2 §9). Portal `host` ↔ role `field_host`, portal `admin` ↔ role `ops_admin`.
 */
export const PORTALS = ['tenant', 'landlord', 'host', 'admin'] as const;
export type Portal = (typeof PORTALS)[number];

export const PORTAL_ROLE: Record<Portal, string> = {
  tenant: 'tenant',
  landlord: 'landlord',
  host: 'field_host',
  admin: 'ops_admin',
};

export const ROLE_PORTAL: Record<string, Portal> = Object.fromEntries(
  Object.entries(PORTAL_ROLE).map(([portal, role]) => [role, portal as Portal]),
);

export const ROLE_NAMES: Record<string, string> = {
  tenant: 'Khách thuê',
  landlord: 'Chủ nhà',
  field_host: 'Field Host',
  ops_admin: 'Ops Admin',
};

export function portalForRole(role?: string | null): Portal | null {
  return (role && ROLE_PORTAL[role]) || null;
}

/** Trang đích (đường dẫn FE) sau khi đăng nhập thành công ở từng cổng. */
export const PORTAL_HOME: Record<Portal, string> = {
  tenant: '/',
  landlord: '/landlord/dashboard',
  host: '/host/dispatch',
  admin: '/admin/dashboard',
};

/** Host và Admin dùng chung màn hình đăng nhập nội bộ. */
export function loginPathForPortal(portal: Portal): string {
  return portal === 'host' || portal === 'admin' ? '/admin/login' : '/login';
}

// Cookie phiên (httpOnly). Email + mật khẩu: access token = JWT Supabase, refresh token = Supabase refresh token.
// Đăng nhập Google: access token = JWT do backend ký (SessionTokenService), không có refresh token.
export const ACCESS_COOKIE = 'vs_access';
export const REFRESH_COOKIE = 'vs_refresh';
/** Cookie tạm giữ nonce chống CSRF (khớp với `state`) trong lúc đi vòng qua Google. */
export const OAUTH_COOKIE = 'vs_oauth';

/** Phiên Google sống 1 ngày; hết hạn thì đăng nhập lại (không có refresh token). */
export const GOOGLE_SESSION_TTL_SECONDS = 24 * 60 * 60;

export const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
