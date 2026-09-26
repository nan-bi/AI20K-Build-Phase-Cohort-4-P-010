import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/** Hàm thuần (không I/O) để test trực tiếp; OtpService bọc thêm DB + cấu hình. */

export function hashOtpCode(code: string, pepper: string | Buffer): string {
  return createHmac('sha256', pepper).update(code).digest('hex');
}

export function otpHashesEqual(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, 'hex');
  const bufB = Buffer.from(hashB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** OTP 4 chữ số theo SAD, đệm số 0 phía trước (42 -> "0042"). */
export function generateOtpCode(): string {
  return String(randomInt(0, 10000)).padStart(4, '0');
}
