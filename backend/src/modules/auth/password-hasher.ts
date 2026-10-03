import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PREFIX = 'scrypt';

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** `scrypt$<salt hex>$<hash hex>` — salt riêng mỗi mật khẩu, tham số scrypt mặc định của Node (N=16384, r=8, p=1). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return `${PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/** So sánh thời gian hằng số; chuỗi hash hỏng/lạ định dạng → false (không ném lỗi). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, saltHex, keyHex] = stored.split('$');
  if (prefix !== PREFIX || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, Buffer.from(saltHex, 'hex'));
  return timingSafeEqual(actual, expected);
}

/** Hash giả để đăng nhập email không tồn tại cũng tốn thời gian như email có thật (chống dò email qua độ trễ). */
export const DUMMY_PASSWORD_HASH = `${PREFIX}$${'00'.repeat(SALT_BYTES)}$${'00'.repeat(KEY_LENGTH)}`;
