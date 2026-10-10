import { SetMetadata } from '@nestjs/common';

export const REQUIRE_VERIFICATION_KEY = 'requireVerification';

/** Mức xác thực danh tính. Hiện chỉ có `phone`; eKYC CCCD sẽ thêm `identity` mà không đổi cách dùng. */
export type VerificationLevel = 'phone';

/** Chặn thao tác nếu tài khoản chưa đạt mức xác thực (403 `phone_not_verified`). Đặt trên route "nhận việc / ký", không đặt trên route chỉ đọc. */
export const RequireVerification = (level: VerificationLevel) => SetMetadata(REQUIRE_VERIFICATION_KEY, level);
