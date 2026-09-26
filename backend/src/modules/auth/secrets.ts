import { hkdfSync } from 'node:crypto';

const DEV_FALLBACK_SECRET = 'vinstay-dev-only-secret-DO-NOT-USE-IN-PROD';

/**
 * Một khóa gốc (AES_SECRET_KEY) → nhiều khóa con tách theo mục đích (HKDF), để khóa mã hóa SĐT,
 * pepper OTP và khóa ký action token không dùng chung một khóa thô.
 * Production bắt buộc phải có AES_SECRET_KEY (>= 16 ký tự); dev có khóa mặc định kèm cảnh báo.
 */
export function resolveMasterSecret(env: { get(key: string): string | undefined }, nodeEnv?: string): string {
  const secret = env.get('AES_SECRET_KEY');
  if (secret && secret.length >= 16) return secret;
  if (nodeEnv === 'production') {
    throw new Error('AES_SECRET_KEY is required in production (>= 16 characters).');
  }
  return DEV_FALLBACK_SECRET;
}

export function deriveKey(masterSecret: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterSecret, 'vinstay.v1', purpose, 32));
}
