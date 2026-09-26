/**
 * Đăng nhập demo (tạm thời, thay cho auth NestJS): chọn một vai trò là có ngay phiên làm việc.
 * Phiên chỉ là cookie `vs_role` — proxy.ts dùng nó để chặn /host, /landlord, /admin.
 */
export type Role = "tenant" | "landlord" | "host" | "admin";

export const ROLE_COOKIE = "vs_role";

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
export function requiredRole(pathname: string): Exclude<Role, "tenant"> | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/landlord")) return "landlord";
  if (pathname.startsWith("/host")) return "host";
  return null;
}

export function loginUrl(role: Role, next?: string): string {
  const q = new URLSearchParams({ as: role });
  if (next) q.set("next", next);
  return `/login?${q.toString()}`;
}

/** Chỉ cho phép chuyển hướng nội bộ, tránh open-redirect qua `next`. */
export const safeNext = (next: string | null | undefined): string | undefined =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
