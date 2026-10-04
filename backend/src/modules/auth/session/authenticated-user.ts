import { Portal } from '../auth.constants';
import { HostRoleCode } from '../host-roles';

/** Người dùng đã xác thực, gắn vào `request.user` bởi SupabaseAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  fullName: string | null;
  /** Mã vai trò trong bảng `roles`; null nếu tài khoản Supabase chưa có Profile. */
  role: string | null;
  portal: Portal | null;
  isPhoneVerified: boolean;
  /** Field Host đã có hồ sơ `field_hosts` (do Admin tạo). Vai trò khác luôn là false. */
  isHostVerified: boolean;
  /** Vai của Field Host (đọc từ `field_hosts.roles`, không nằm trong JWT). [] nếu không phải Host hoặc chưa có hồ sơ. */
  hostRoles: HostRoleCode[];
}

/** Phiên trả cho FE — không bao giờ chứa token (token chỉ nằm trong cookie httpOnly). */
export type AuthUserView = AuthenticatedUser;
