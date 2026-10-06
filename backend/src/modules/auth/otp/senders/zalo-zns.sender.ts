import { Injectable } from '@nestjs/common';
import { OtpChannelSender } from './otp-channel';

/**
 * Zalo ZNS (Zalo Notification Service) — chưa tích hợp.
 * PRD/UI_FLOW_SPEC quy định Zalo là kênh OTP chính nhưng chưa có ZNS App ID / Secret / Template ID.
 * Luôn throw để OtpService thử kênh SMS thật hoặc báo lỗi thay vì giả vờ đã gửi.
 * Khi có credentials: gọi API "Send message" của ZNS với `phone` và `code` làm data của template.
 */
@Injectable()
export class ZaloZnsSender implements OtpChannelSender {
  async send(_phone: string, _code: string): Promise<void> {
    throw new Error('ZaloZnsSender not implemented: ZALO_ZNS_* credentials are not configured yet.');
  }
}
