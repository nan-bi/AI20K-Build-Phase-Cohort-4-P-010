import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel, OtpCode, OtpPurpose, OtpStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthAuditService } from '../auth-audit.service';
import { authError } from '../auth.errors';
import { PhoneService } from '../phone/phone.service';
import { deriveKey, resolveMasterSecret } from '../secrets';
import { generateOtpCode, hashOtpCode, otpHashesEqual } from './otp-crypto';
import { ConsoleOtpSender } from './senders/console-otp.sender';
import { OtpChannelSender } from './senders/otp-channel';
import { SmsFallbackSender } from './senders/sms-fallback.sender';
import { ZaloZnsSender } from './senders/zalo-zns.sender';

export interface OtpRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

const secondsUntil = (date: Date) => Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));

/**
 * Vòng đời OTP: gửi qua nhà cung cấp thật; xác thực có giới hạn thử và khóa.
 * TTL / số lần thử / thời gian khóa nằm ở đây (không phải cấu hình Supabase) để khớp SAD ở mọi gói.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly pepper: Buffer;
  private readonly ttlSeconds: number;
  private readonly maxAttempts: number;
  private readonly lockoutSeconds: number;
  private readonly resendSeconds: number;
  /** Chỉ bật được ngoài production: khi không có nhà cung cấp thật thì trả mã qua API để dev/demo. */
  private readonly echoDevCode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
    private readonly audit: AuthAuditService,
    private readonly zalo: ZaloZnsSender,
    private readonly sms: SmsFallbackSender,
    private readonly devConsole: ConsoleOtpSender,
    config: ConfigService,
  ) {
    this.pepper = deriveKey(resolveMasterSecret(config, config.get('NODE_ENV')), 'otp:pepper');
    this.ttlSeconds = Number(config.get('OTP_TTL_SECONDS') ?? 300);
    this.maxAttempts = Number(config.get('OTP_MAX_ATTEMPTS') ?? 3);
    this.lockoutSeconds = Number(config.get('OTP_LOCKOUT_SECONDS') ?? 600);
    this.resendSeconds = Number(config.get('OTP_RESEND_SECONDS') ?? 60);
    this.echoDevCode = String(config.get('OTP_ECHO_DEV_CODE')) === 'true' && config.get('NODE_ENV') !== 'production';
  }

  get expiresInSeconds(): number {
    return this.ttlSeconds;
  }

  /** `phone` phải là E.164 đã chuẩn hóa. Chỉ trả `devCode` khi chế độ dev bật và không có nhà cung cấp thật. */
  async send(
    params: { phone: string; purpose: OtpPurpose } & OtpRequestContext,
  ): Promise<{ devCode?: string }> {
    const { phone, purpose, ipAddress, userAgent } = params;
    const phoneHash = this.phones.hash(phone);

    const latest = await this.prisma.otpCode.findFirst({
      where: { phoneHash, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (latest?.lockedUntil && latest.lockedUntil > new Date()) {
      throw authError('otp_locked', { retryAfterSeconds: secondsUntil(latest.lockedUntil) });
    }
    if (latest) {
      const nextAllowedAt = new Date(latest.createdAt.getTime() + this.resendSeconds * 1000);
      if (nextAllowedAt > new Date()) {
        throw authError('otp_cooldown', { retryAfterSeconds: secondsUntil(nextAllowedAt) });
      }
    }

    const code = generateOtpCode();
    const { channel, echoed } = await this.deliver(phone, code);

    await this.prisma.$transaction([
      // Chỉ mã mới nhất được dùng: vô hiệu các mã cũ chưa xác thực.
      this.prisma.otpCode.updateMany({
        where: { phoneHash, purpose, status: OtpStatus.PENDING },
        data: { status: OtpStatus.CONSUMED, consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: {
          phoneHash,
          purpose,
          codeHash: hashOtpCode(code, this.pepper),
          channel,
          status: OtpStatus.PENDING,
          expiresAt: new Date(Date.now() + this.ttlSeconds * 1000),
          ipAddress: ipAddress?.slice(0, 45),
          userAgent,
        },
      }),
    ]);
    await this.audit.record('otp_sent', { phoneHash, ipAddress, userAgent, metadata: { purpose, channel } });

    return echoed ? { devCode: code } : {};
  }

  /**
   * Xác thực mã cho (phone, purpose). Thành công → hàng chuyển VERIFIED và được trả về; người gọi
   * quyết định tiếp (consume ngay, hoặc phát action token). Sai → tăng bộ đếm, tới giới hạn thì khóa.
   *
   * Bộ đếm được tăng NGUYÊN TỬ *trước* khi so mã: nếu đọc-so-ghi thì gửi song song hàng nghìn
   * lần đoán sẽ vượt giới hạn (mã chỉ có 4 chữ số).
   */
  async verify(params: { phone: string; purpose: OtpPurpose; code: string } & OtpRequestContext): Promise<OtpCode> {
    const { phone, purpose, code, ipAddress, userAgent } = params;
    const phoneHash = this.phones.hash(phone);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneHash, purpose, status: OtpStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) throw authError('otp_not_found_or_expired');
    if (otp.lockedUntil && otp.lockedUntil > new Date()) {
      throw authError('otp_locked', { retryAfterSeconds: secondsUntil(otp.lockedUntil) });
    }

    const { attemptCount } = await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attemptCount: { increment: 1 } },
      select: { attemptCount: true },
    });

    if (attemptCount > this.maxAttempts) {
      throw authError('otp_locked', { retryAfterSeconds: this.lockoutSeconds });
    }

    if (!otpHashesEqual(hashOtpCode(code, this.pepper), otp.codeHash)) {
      await this.audit.record('otp_verify_failed', { phoneHash, ipAddress, userAgent, metadata: { purpose } });
      if (attemptCount >= this.maxAttempts) {
        await this.prisma.otpCode.update({
          where: { id: otp.id },
          data: { lockedUntil: new Date(Date.now() + this.lockoutSeconds * 1000) },
        });
        throw authError('otp_locked', { retryAfterSeconds: this.lockoutSeconds });
      }
      throw authError('otp_invalid', { attemptsRemaining: this.maxAttempts - attemptCount });
    }

    // Chỉ một request được chuyển PENDING → VERIFIED (chặn dùng lại cùng một mã song song).
    const claimed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, status: OtpStatus.PENDING },
      data: { status: OtpStatus.VERIFIED, verifiedAt: new Date() },
    });
    if (claimed.count !== 1) throw authError('otp_not_found_or_expired');

    await this.audit.record('otp_verified', { phoneHash, ipAddress, userAgent, metadata: { purpose } });
    return { ...otp, status: OtpStatus.VERIFIED, verifiedAt: new Date(), attemptCount };
  }

  /** VERIFIED → CONSUMED, nguyên tử. Trả true nếu chính lời gọi này là bên tiêu thụ mã. */
  async consume(id: string): Promise<boolean> {
    const result = await this.prisma.otpCode.updateMany({
      where: { id, status: OtpStatus.VERIFIED },
      data: { status: OtpStatus.CONSUMED, consumedAt: new Date() },
    });
    return result.count === 1;
  }

  private async deliver(phone: string, code: string): Promise<{ channel: OtpChannel; echoed: boolean }> {
    const candidates: Array<{ channel: OtpChannel; sender: OtpChannelSender }> = [
      { channel: OtpChannel.ZALO, sender: this.zalo },
      { channel: OtpChannel.SMS, sender: this.sms },
    ];
    for (const { channel, sender } of candidates) {
      try {
        await sender.send(phone, code);
        return { channel, echoed: false };
      } catch (err) {
        this.logger.debug(`Kênh ${channel} không gửi được: ${(err as Error).message}`);
      }
    }

    if (this.echoDevCode) {
      await this.devConsole.send(phone, code);
      return { channel: OtpChannel.ZALO, echoed: true };
    }
    throw authError('otp_send_failed');
  }
}
