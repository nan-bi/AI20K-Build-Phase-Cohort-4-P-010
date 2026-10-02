/**
 * Danh tính "chủ sở hữu" của dữ liệu mock (landlordId / hostId) cho các màn hình chưa nối API.
 * KHÔNG phải đăng nhập: phiên thật do backend NestJS quản lý (xem lib/auth/*). Xoá cùng lib/mock khi nối API.
 */
export type Role = "tenant" | "landlord" | "host" | "admin";

export interface DemoUser {
  role: Role;
  name: string;
  subtitle: string;
  /** Khoá liên kết với dữ liệu mock (landlordId / hostId). */
  refId?: string;
  phone?: string;
}

/** Không có `tenant`: khách thuê là người dùng THẬT (phiên backend), không có "chủ sở hữu" mock cố định. */
export const DEMO_USERS: Record<Exclude<Role, "tenant">, DemoUser> = {
  landlord: {
    role: "landlord",
    name: "Nguyễn Văn Hùng",
    subtitle: "Chủ nhà · 5 căn ký gửi tại Ocean Park",
    refId: "L1",
  },
  host: {
    role: "host",
    name: "Lê Quốc Bảo",
    subtitle: "Field Host · Sapphire 1 & 2 · ★ 4,9",
    refId: "H01",
    phone: "0934556201",
  },
  admin: {
    role: "admin",
    name: "Phạm Thu Hà",
    subtitle: "Trưởng vận hành nền tảng",
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  tenant: "Khách thuê",
  landlord: "Chủ nhà",
  host: "Field Host",
  admin: "Quản trị viên",
};
