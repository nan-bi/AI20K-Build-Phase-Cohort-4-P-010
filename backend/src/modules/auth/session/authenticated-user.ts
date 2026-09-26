import { Portal } from '../auth.constants';

/** Người dùng đã xác thực, gắn vào `request.user` bởi SupabaseAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  fullName: string | null;
  /** Mã vai trò trong bảng `roles`; null nếu tài khoản Supabase chưa có Profile. */
  role: string | null;
  portal: Portal | null;
  isPhoneVerified: boolean;
  /** Field Host đã nhập đúng RFID (có bản ghi FieldHost). Vai trò khác luôn là false. */
  isHostVerified: boolean;
}

/** Phiên trả cho FE — không bao giờ chứa token (token chỉ nằm trong cookie httpOnly). */
export interface AuthUserView extends AuthenticatedUser {
  /** Id lời mời Field Host đang chờ nhập RFID (dùng để dựng lại bước RFID sau khi tải lại trang). */
  pendingHostId?: string;
}
