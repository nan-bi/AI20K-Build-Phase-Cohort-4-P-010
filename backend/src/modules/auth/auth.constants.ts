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

// Cookie phiên (httpOnly): access token = JWT do backend ký (SessionTokenService) cho cả email + mật khẩu lẫn Google.
export const ACCESS_COOKIE = 'vs_access';
/** Cookie của phiên cũ (Supabase refresh token). Không còn dùng; chỉ xoá khi gặp để dọn trình duyệt. */
export const LEGACY_REFRESH_COOKIE = 'vs_refresh';
/**
 * Cookie KHÔNG httpOnly để màn đăng nhập hiện "Tiếp tục bằng tên …" cho tài khoản Google đã dùng trên thiết bị này.
 * Chỉ chứa tên + email của chính người dùng; không phải thông tin phiên, đăng xuất không xoá.
 */
export const GOOGLE_HINT_COOKIE = 'vs_google_hint';
export const GOOGLE_HINT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
/** Cookie tạm giữ nonce chống CSRF (khớp với `state`) trong lúc đi vòng qua Google. */
export const OAUTH_COOKIE = 'vs_oauth';

/** Phiên sống 7 ngày; hết hạn thì đăng nhập lại (không có refresh token). */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
