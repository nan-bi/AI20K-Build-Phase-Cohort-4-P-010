import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token hành động dùng một lần của Khách thuê: chứng minh "SĐT này đã qua OTP cho mục đích này".
 * Định dạng gọn: base64url(payload).base64url(HMAC-SHA256) — không cần JWT đầy đủ cho 4 trường.
 * `jti` chính là id của bản ghi OtpCode đã VERIFIED; ActionTokenService đổi VERIFIED→CONSUMED
 * nguyên tử (DB) nên dùng được nhiều instance, không cần bộ nhớ dùng chung.
 */
export type ActionTokenPurpose = 'TENANT_VIEWING' | 'TENANT_DEPOSIT_SIGN';

export interface ActionTokenPayload {
  phone: string;
  purpose: ActionTokenPurpose;
  jti: string;
  exp: number; // unix seconds
}

export class ActionTokenInvalidError extends Error {
  constructor(reason: string) {
    super(`action_token_invalid: ${reason}`);
  }
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signActionToken(
  payload: Omit<ActionTokenPayload, 'exp'>,
  secret: string | Buffer,
  ttlSeconds = 15 * 60,
): string {
  const full: ActionTokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = b64url(JSON.stringify(full));
  const signature = createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${b64url(signature)}`;
}

/** Kiểm tra chữ ký, mục đích và hạn dùng. KHÔNG kiểm tra đã dùng chưa — xem ActionTokenService. */
export function verifyActionTokenSignature(
  token: string,
  expectedPurpose: ActionTokenPurpose,
  secret: string | Buffer,
): ActionTokenPayload {
  const [payloadB64, sigB64] = (token ?? '').split('.');
  if (!payloadB64 || !sigB64) throw new ActionTokenInvalidError('malformed');

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  const givenSig = Buffer.from(sigB64, 'base64url');
  if (expectedSig.length !== givenSig.length || !timingSafeEqual(expectedSig, givenSig)) {
    throw new ActionTokenInvalidError('bad_signature');
  }

  let payload: ActionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new ActionTokenInvalidError('malformed');
  }

  if (payload.purpose !== expectedPurpose) throw new ActionTokenInvalidError('wrong_purpose');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new ActionTokenInvalidError('expired');
  return payload;
}
