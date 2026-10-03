import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Lỗi có mã máy đọc được (`code`) để FE map sang thông báo tiếng Việt.
 * HttpExceptionFilter đưa `code` vào response.
 */
export class AuthException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super({ code, message, ...(extra ? { errors: extra } : {}) }, status);
  }
}

const MESSAGES: Record<string, [HttpStatus, string]> = {
  invalid_credentials: [HttpStatus.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng'],
  password_not_set: [HttpStatus.UNAUTHORIZED, 'Tài khoản này đăng nhập bằng Google, chưa đặt mật khẩu'],
  email_not_verified: [HttpStatus.UNAUTHORIZED, 'Email Google chưa được xác minh'],
  not_authorized: [HttpStatus.FORBIDDEN, 'Email này chưa được cấp quyền truy cập cổng này'],
  wrong_portal: [HttpStatus.FORBIDDEN, 'Tài khoản thuộc một vai trò khác. Vui lòng đăng nhập đúng cổng dành cho vai trò của bạn'],
  account_suspended: [HttpStatus.FORBIDDEN, 'Tài khoản đã bị tạm khoá'],
  account_conflict: [HttpStatus.CONFLICT, 'Email đã gắn với một hồ sơ khác'],
  signup_not_allowed: [HttpStatus.FORBIDDEN, 'Cổng này không hỗ trợ đăng ký / đăng nhập Google'],
  email_already_registered: [HttpStatus.CONFLICT, 'Email đã được đăng ký'],
  weak_password: [HttpStatus.BAD_REQUEST, 'Mật khẩu chưa đủ mạnh'],
  invalid_host: [HttpStatus.BAD_REQUEST, 'Lời mời Field Host không hợp lệ hoặc đã được sử dụng'],
  rfid_mismatch: [HttpStatus.FORBIDDEN, 'Mã RFID không đúng'],
  invalid_request: [HttpStatus.BAD_REQUEST, 'Thông tin chưa hợp lệ'],
  unauthorized: [HttpStatus.UNAUTHORIZED, 'Chưa đăng nhập hoặc phiên đã hết hạn'],
  forbidden: [HttpStatus.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này'],
  host_rfid_unverified: [HttpStatus.FORBIDDEN, 'Field Host cần xác nhận mã thẻ RFID trước khi sử dụng'],
  oauth_failed: [HttpStatus.BAD_REQUEST, 'Đăng nhập bằng Google không thành công'],
  auth_not_configured: [HttpStatus.SERVICE_UNAVAILABLE, 'Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)'],
  demo_disabled: [HttpStatus.NOT_FOUND, 'Chế độ demo đang tắt'],
  rate_limited: [HttpStatus.TOO_MANY_REQUESTS, 'Quá nhiều yêu cầu, vui lòng thử lại sau'],
  invalid_phone: [HttpStatus.BAD_REQUEST, 'Số điện thoại không hợp lệ'],
  phone_already_registered: [HttpStatus.CONFLICT, 'Số điện thoại đã được dùng cho tài khoản khác'],
  otp_not_found_or_expired: [HttpStatus.BAD_REQUEST, 'Mã OTP không tồn tại hoặc đã hết hạn'],
  otp_invalid: [HttpStatus.BAD_REQUEST, 'Mã OTP không đúng'],
  otp_locked: [HttpStatus.TOO_MANY_REQUESTS, 'Đã nhập sai quá số lần cho phép, vui lòng thử lại sau'],
  otp_cooldown: [HttpStatus.TOO_MANY_REQUESTS, 'Vui lòng đợi trước khi yêu cầu mã mới'],
  otp_send_failed: [HttpStatus.BAD_GATEWAY, 'Không gửi được mã OTP'],
  action_token_invalid: [HttpStatus.UNAUTHORIZED, 'Mã xác thực hành động không hợp lệ hoặc đã dùng'],
};

export function authError(code: keyof typeof MESSAGES | string, extra?: Record<string, unknown>): AuthException {
  const [status, message] = MESSAGES[code] ?? [HttpStatus.BAD_REQUEST, code];
  return new AuthException(status, code, message, extra);
}
