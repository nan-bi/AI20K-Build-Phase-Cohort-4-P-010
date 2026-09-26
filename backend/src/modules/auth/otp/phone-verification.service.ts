import { Injectable } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { authError } from '../auth.errors';
import { PhoneService } from '../phone/phone.service';
import { AuthSessionService } from '../session/auth-session.service';
import { OtpRequestContext, OtpService } from './otp.service';

/**
 * Gắn SĐT đã xác thực vào hồ sơ. OTP chứng minh người dùng đang giữ đúng số đó nên nhận `phone` từ
 * client là an toàn — mã được kiểm tra chính trên số này. Kiểm tra trùng số SAU khi qua OTP để
 * không lộ "số này đã đăng ký" cho người chưa chứng minh được quyền sở hữu số.
 */
@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly phones: PhoneService,
    private readonly sessions: AuthSessionService,
  ) {}

  async verifyAndBind(userId: string, phone: string, code: string, ctx: OtpRequestContext): Promise<void> {
    const verified = await this.otp.verify({ phone, purpose: OtpPurpose.PHONE_VERIFY, code, ...ctx });
    await this.otp.consume(verified.id);

    const phoneHash = this.phones.hash(phone);
    const taken = await this.prisma.profile.findFirst({
      where: { phoneHash, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw authError('phone_already_registered');

    try {
      await this.prisma.profile.update({
        where: { id: userId },
        data: { phoneEnc: this.phones.encrypt(phone), phoneHash, isPhoneVerified: true },
      });
      this.sessions.invalidate(userId);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') throw authError('phone_already_registered');
      throw err;
    }
  }
}
