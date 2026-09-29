/**
 * Đăng nhập demo (tạm thời, thay cho auth NestJS): chọn một vai trò là có ngay phiên làm việc.
 * Phiên chỉ là cookie `vs_role` — proxy.ts dùng nó để chặn /host, /landlord, /admin.
 */
export type Role = "tenant" | "landlord" | "host" | "admin";

export const ROLE_COOKIE = "vs_role";
export const ROLE_COOKIE_VERSION = "v2";

export function encodeRoleCookie(role: Role): string {
  return `${ROLE_COOKIE_VERSION}.${role}`;
}

export function parseRoleCookie(v: string | null | undefined): Role | null {
  if (!v) return null;
  const dotIndex = v.indexOf(".");
  if (dotIndex === -1) return null;
  const prefix = v.slice(0, dotIndex);
  if (prefix !== ROLE_COOKIE_VERSION) return null;
  const rawRole = v.slice(dotIndex + 1);
  return isRole(rawRole) ? rawRole : null;
}

export interface DemoUser {
  role: Role;
  name: string;
  subtitle: string;
  /** Khoá liên kết với dữ liệu mock (landlordId / hostId). */
  refId?: string;
  phone?: string;
  home: string;
}

export const DEMO_USERS: Record<Role, DemoUser> = {
  tenant: {
    role: "tenant",
    name: "Trần Minh Anh",
    subtitle: "Sinh viên VinUni · đang tìm căn Studio",
    phone: "0912345678",
    home: "/",
  },
  landlord: {
    role: "landlord",
    name: "Nguyễn Văn Hùng",
    subtitle: "Chủ nhà · 5 căn ký gửi tại Ocean Park",
    refId: "L1",
    home: "/landlord/dashboard",
  },
  host: {
    role: "host",
    name: "Lê Quốc Bảo",
    subtitle: "Field Host · Sapphire 1 & 2 · ★ 4,9",
    refId: "H01",
    phone: "0934556201",
    home: "/host/dispatch",
  },
  admin: {
    role: "admin",
    name: "Phạm Thu Hà",
    subtitle: "Trưởng vận hành nền tảng",
    home: "/admin/dashboard",
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị viên",
};

export const isRole = (v: string | null | undefined): v is Role => v === "tenant" || v === "landlord" || v === "host" || v === "admin";

/** Đường dẫn cần vai trò nào; null = công khai. */
export function requiredRole(pathname: string): Role | null {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return null;
  if (pathname === "/host/login" || pathname.startsWith("/host/login/")) return null;
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/landlord")) return "landlord";
  if (pathname.startsWith("/host")) return "host";
  if (pathname.startsWith("/account")) return "tenant";
  if (pathname === "/booking" || pathname.startsWith("/booking/")) return "tenant";
  return null;
}

/** Trang đăng nhập đúng cổng cho một vai trò, kèm `next` nếu có. */
export function loginUrl(role: Role, next?: string): string {
  const path = role === "admin" || role === "host" ? "/admin/login" : "/login";
  if (!next) return path;
  return `${path}?${new URLSearchParams({ next }).toString()}`;
}

/** Chỉ cho phép chuyển hướng nội bộ, tránh open-redirect qua `next`. */
export const safeNext = (next: string | null | undefined): string | undefined =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

export function postLoginTarget(role: Role, next?: string): string {
  const n = safeNext(next);
  if (!n) return DEMO_USERS[role].home;
  const req = requiredRole(n);
  if (req === role) return n;
  if (req === null && role === "tenant") return n; // trang công khai, khách thuê
  return DEMO_USERS[role].home;
}

/* ── Xác thực demo (SPEC-P02 / 01-CONTRACTS §3) ──────────────────────────────────────────── */

export interface DemoCredential {
  role: Role;
  /** email hoặc số điện thoại */
  identifier: string;
  password: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  { role: "tenant", identifier: "minhanh@vinstay.demo", password: "demo1234" },
  { role: "tenant", identifier: "0912345678", password: "demo1234" },
  { role: "landlord", identifier: "hung.nguyen@vinstay.demo", password: "demo1234" },
  { role: "host", identifier: "0934556201", password: "demo1234" },
  { role: "admin", identifier: "ops@vinstay.vn", password: "admin1234" },
];

export type AuthError = "invalid_credentials" | "wrong_portal" | "empty";

const normalizeIdentifier = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, "");

/** Cổng nhận vai trò nào. */
const PORTAL_ROLES: Record<"public" | "host" | "admin", Role[]> = {
  public: ["tenant", "landlord"],
  host: ["host"],
  admin: ["admin"],
};

export function authenticate(
  identifier: string,
  password: string,
  portal: "public" | "host" | "admin",
): { ok: true; role: Role } | { ok: false; error: AuthError } {
  const id = normalizeIdentifier(identifier);
  if (!id || !password) return { ok: false, error: "empty" };

  const match = DEMO_CREDENTIALS.find((c) => normalizeIdentifier(c.identifier) === id && c.password === password);
  if (!match) return { ok: false, error: "invalid_credentials" };

  if (!PORTAL_ROLES[portal].includes(match.role)) return { ok: false, error: "wrong_portal" };
  return { ok: true, role: match.role };
}

export const AUTH_ERROR_TEXT: Record<AuthError, string> = {
  invalid_credentials: "Sai thông tin đăng nhập hoặc mật khẩu. Kiểm tra lại và thử lại.",
  wrong_portal: "Tài khoản này không dùng ở cổng này. Kiểm tra lại đường dẫn đăng nhập.",
  empty: "Nhập đầy đủ thông tin đăng nhập.",
};
