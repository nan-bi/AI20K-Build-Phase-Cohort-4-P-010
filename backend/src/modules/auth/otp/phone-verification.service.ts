import { Injectable } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { authError } from '../auth.errors';
import { PhoneService } from '../phone/phone.service';
import { AuthSessionService } from '../session/auth-session.service';
import { OtpRequestContext, OtpService } from './otp.service';

/**
 * Gắn SĐT đã xác thực vào hồ sơ. OTP chứng minh người dùng đang giữ đúng số đó nên nhận `phone` từ
 * client là an toàn — mã được kiểm tra chính trên số này.
 *
 * Trùng số được kiểm tra HAI lần: trước khi gửi OTP (`assertAvailable`, để không tốn mã Zalo và báo lỗi ngay)
 * và lại sau khi qua OTP (chống đua). Lần trước khi gửi chỉ dành cho Chủ nhà / Host ĐÃ đăng nhập và bị giới hạn
 * tần suất ⇒ rủi ro dò "số này đã đăng ký" chấp nhận được; endpoint OTP công khai của Khách thuê không kiểm.
 */
@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly phones: PhoneService,
    private readonly sessions: AuthSessionService,
  ) {}

  /** Số đang thuộc hồ sơ KHÁC ⇒ `phone_already_registered`. Số chính hồ sơ này thì cho qua (gửi lại / đổi lại cùng số). */
  async assertAvailable(userId: string, phone: string): Promise<void> {
    const taken = await this.prisma.profile.findFirst({
      where: { phoneHash: this.phones.hash(phone), NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) throw authError('phone_already_registered');
  }

  async verifyAndBind(userId: string, phone: string, code: string, ctx: OtpRequestContext): Promise<void> {
    const verified = await this.otp.verify({ phone, purpose: OtpPurpose.PHONE_VERIFY, code, ...ctx });
    await this.otp.consume(verified.id);

    const phoneHash = this.phones.hash(phone);
    await this.assertAvailable(userId, phone);

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
