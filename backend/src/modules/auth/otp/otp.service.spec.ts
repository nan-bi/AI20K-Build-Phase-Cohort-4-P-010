import { OtpPurpose } from '@prisma/client';
import { AuthAuditService } from '../auth-audit.service';
import { AuthException } from '../auth.errors';
import { PhoneService } from '../phone/phone.service';
import { fakeConfig } from '../testing/fake-config';
import { createFakePrisma } from '../testing/fake-prisma';
import { ActionTokenService } from './action-token.service';
import { OtpService } from './otp.service';
import { ConsoleOtpSender } from './senders/console-otp.sender';
import { SmsFallbackSender } from './senders/sms-fallback.sender';
import { ZaloZnsSender } from './senders/zalo-zns.sender';

const PHONE = '+84912345678';

function setup(env: Record<string, string> = {}) {
  const prisma = createFakePrisma();
  const config = fakeConfig({
    AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
    OTP_ECHO_DEV_CODE: 'true',
    OTP_RESEND_SECONDS: '0',
    ...env,
  });
  const phones = new PhoneService(config);
  const audit = new AuthAuditService(prisma as any);
  const consoleSender = new ConsoleOtpSender();
  jest.spyOn(consoleSender, 'send').mockResolvedValue();
  const otp = new OtpService(prisma as any, phones, audit, new ZaloZnsSender(), new SmsFallbackSender(), consoleSender, config);
  const actionTokens = new ActionTokenService(config, otp);
  return { prisma, otp, phones, actionTokens };
}

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err instanceof AuthException ? err.code : `unexpected:${(err as Error).message}`;
  }
  return 'no-error';
};

describe('OtpService', () => {
  describe('send', () => {
    it('lưu hash (không lưu mã, không lưu SĐT plaintext) và trả devCode khi bật echo', async () => {
      const { prisma, otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });

      expect(devCode).toMatch(/^\d{4}$/);
      const row = prisma.otpCode.rows[0];
      expect(JSON.stringify(row)).not.toContain(devCode as string);
      expect(JSON.stringify(row)).not.toContain('84912345678');
      expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(row.status).toBe('PENDING');
    });

    it('không lộ mã và báo lỗi khi không kênh nào gửi được ngoài chế độ dev', async () => {
      const { otp } = setup({ OTP_ECHO_DEV_CODE: 'false' });
      expect(await errorCode(otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING }))).toBe('otp_send_failed');
    });

    it('không bao giờ echo mã ở production dù cờ dev bật', async () => {
      const { otp } = setup({ NODE_ENV: 'production' });
      expect(await errorCode(otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING }))).toBe('otp_send_failed');
    });

    it('chặn gửi lại trong thời gian chờ', async () => {
      const { otp } = setup({ OTP_RESEND_SECONDS: '60' });
      await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      expect(await errorCode(otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING }))).toBe('otp_cooldown');
    });

    it('mã mới vô hiệu mã cũ chưa dùng', async () => {
      const { prisma, otp } = setup();
      const first = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const second = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });

      const pending = prisma.otpCode.rows.filter((r: any) => r.status === 'PENDING');
      expect(pending).toHaveLength(1);
      expect(await errorCode(otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: first.devCode as string })))
        .toBe(first.devCode === second.devCode ? 'no-error' : 'otp_invalid');
    });
  });

  describe('verify', () => {
    it('mã đúng → VERIFIED', async () => {
      const { otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const row = await otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string });
      expect(row.status).toBe('VERIFIED');
    });

    it('mã sai báo số lần còn lại, sai đủ số lần thì khóa (kể cả nhập đúng sau đó)', async () => {
      const { otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const wrong = devCode === '0000' ? '1111' : '0000';
      const verify = (code: string) => otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code });

      const err1 = await verify(wrong).catch((e) => e);
      expect(err1.code).toBe('otp_invalid');
      expect(err1.getResponse().errors.attemptsRemaining).toBe(2);
      expect((await verify(wrong).catch((e) => e)).getResponse().errors.attemptsRemaining).toBe(1);
      expect(await errorCode(verify(wrong))).toBe('otp_locked');
      expect(await errorCode(verify(devCode as string))).toBe('otp_locked');
    });

    it('bị khóa thì không gửi được mã mới cho tới khi hết khóa', async () => {
      const { otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const wrong = devCode === '0000' ? '1111' : '0000';
      for (let i = 0; i < 3; i++) await otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: wrong }).catch(() => undefined);
      expect(await errorCode(otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING }))).toBe('otp_locked');
    });

    it('đoán song song không vượt quá số lần thử cho phép', async () => {
      const { otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const wrong = devCode === '0000' ? '1111' : '0000';

      const results = await Promise.all(
        Array.from({ length: 12 }, () => errorCode(otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: wrong }))),
      );
      expect(results.filter((r) => r === 'otp_invalid')).toHaveLength(2); // lần 1, 2
      expect(results.filter((r) => r === 'otp_locked')).toHaveLength(10); // lần 3 (khóa) và mọi lần sau
    });

    it('mã hết hạn hoặc không tồn tại → otp_not_found_or_expired', async () => {
      const { prisma, otp } = setup();
      expect(await errorCode(otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: '1234' }))).toBe('otp_not_found_or_expired');

      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      prisma.otpCode.rows[0].expiresAt = new Date(Date.now() - 1000);
      expect(await errorCode(otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string }))).toBe('otp_not_found_or_expired');
    });

    it('mã của SĐT/mục đích khác không dùng được', async () => {
      const { otp } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      expect(await errorCode(otp.verify({ phone: '+84900000000', purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string }))).toBe('otp_not_found_or_expired');
      expect(await errorCode(otp.verify({ phone: PHONE, purpose: OtpPurpose.PHONE_VERIFY, code: devCode as string }))).toBe('otp_not_found_or_expired');
    });
  });

  it('consume chỉ thành công đúng một lần', async () => {
    const { otp } = setup();
    const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
    const row = await otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string });
    expect(await otp.consume(row.id)).toBe(true);
    expect(await otp.consume(row.id)).toBe(false);
  });

  describe('ActionTokenService (dùng một lần, lưu ở DB)', () => {
    it('redeem đúng một lần', async () => {
      const { otp, actionTokens } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const verified = await otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string });

      const token = actionTokens.issue({ phone: PHONE, purpose: 'TENANT_VIEWING', otpId: verified.id });
      expect(await actionTokens.redeem(token, 'TENANT_VIEWING')).toMatchObject({ phone: PHONE, jti: verified.id });
      expect(await errorCode(actionTokens.redeem(token, 'TENANT_VIEWING'))).toBe('action_token_invalid');
    });

    it('từ chối sai mục đích và token giả', async () => {
      const { otp, actionTokens } = setup();
      const { devCode } = await otp.send({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING });
      const verified = await otp.verify({ phone: PHONE, purpose: OtpPurpose.TENANT_VIEWING, code: devCode as string });
      const token = actionTokens.issue({ phone: PHONE, purpose: 'TENANT_VIEWING', otpId: verified.id });

      expect(await errorCode(actionTokens.redeem(token, 'TENANT_DEPOSIT_SIGN'))).toBe('action_token_invalid');
      expect(await errorCode(actionTokens.redeem('forged.token', 'TENANT_VIEWING'))).toBe('action_token_invalid');
    });
  });
});
