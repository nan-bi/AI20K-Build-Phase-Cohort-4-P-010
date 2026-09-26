import { Injectable, Logger } from '@nestjs/common';
import { OtpChannelSender } from './otp-channel';

/**
 * "Gửi" OTP bằng cách ghi ra log server — chỉ dùng khi dev (OTP_ECHO_DEV_CODE=true),
 * để chạy trọn luồng mà không cần credentials Zalo/SMS. OtpService là nơi duy nhất chọn sender này.
 */
@Injectable()
export class ConsoleOtpSender implements OtpChannelSender {
  private readonly logger = new Logger('DevOtp');

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`phone=${phone} code=${code}`);
  }
}
