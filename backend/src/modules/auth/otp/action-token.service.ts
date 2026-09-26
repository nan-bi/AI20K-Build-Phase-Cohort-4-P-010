import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authError } from '../auth.errors';
import { deriveKey, resolveMasterSecret } from '../secrets';
import {
  ActionTokenInvalidError,
  ActionTokenPayload,
  ActionTokenPurpose,
  signActionToken,
  verifyActionTokenSignature,
} from './action-token';
import { OtpService } from './otp.service';

export const ACTION_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * Token hành động của Khách thuê (đặt lịch xem / ký cọc): thay cho "phiên" vì khách không cần tài
 * khoản. Module nghiệp vụ (booking, deposit) gọi `redeem()` để kiểm tra + tiêu thụ đúng một lần.
 */
@Injectable()
export class ActionTokenService {
  private readonly secret: Buffer;

  constructor(
    config: ConfigService,
    private readonly otp: OtpService,
  ) {
    this.secret = deriveKey(resolveMasterSecret(config, config.get('NODE_ENV')), 'otp:action-token');
  }

  issue(params: { phone: string; purpose: ActionTokenPurpose; otpId: string }): string {
    return signActionToken(
      { phone: params.phone, purpose: params.purpose, jti: params.otpId },
      this.secret,
      ACTION_TOKEN_TTL_SECONDS,
    );
  }

  async redeem(token: string, purpose: ActionTokenPurpose): Promise<ActionTokenPayload> {
    let payload: ActionTokenPayload;
    try {
      payload = verifyActionTokenSignature(token, purpose, this.secret);
    } catch (err) {
      if (err instanceof ActionTokenInvalidError) throw authError('action_token_invalid');
      throw err;
    }
    // Dùng một lần: chỉ lời gọi đầu tiên đổi được OtpCode VERIFIED → CONSUMED.
    if (!(await this.otp.consume(payload.jti))) throw authError('action_token_invalid');
    return payload;
  }
}
