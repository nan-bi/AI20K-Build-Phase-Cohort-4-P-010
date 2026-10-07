import { Injectable, Logger } from '@nestjs/common';
import { OtpChannelSender } from './otp-channel';

/**
 * Kênh OTP giả cho dev/demo: chỉ ghi mã ra log backend, không gửi tin nhắn thật.
 * OtpService chỉ dùng kênh này khi OTP_ECHO_DEV_CODE=true và NODE_ENV khác production,
 * sau khi Zalo và SMS thật đều không gửi được.
 */
@Injectable()
export class ConsoleOtpSender implements OtpChannelSender {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  async send(phone: string, code: string): Promise<void> {
    this.logger.warn(`[DEV] OTP cho ${phone.slice(0, 5)}*****: ${code} (không gửi tin nhắn thật)`);
  }
}
