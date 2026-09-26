import { Injectable } from '@nestjs/common';
import { OtpChannelSender } from './otp-channel';

/** SMS dự phòng khi Zalo lỗi. Chưa chọn nhà cung cấp (vd. eSMS.vn) nên luôn throw. */
@Injectable()
export class SmsFallbackSender implements OtpChannelSender {
  async send(_phone: string, _code: string): Promise<void> {
    throw new Error('SmsFallbackSender not implemented: no SMS provider configured yet.');
  }
}
