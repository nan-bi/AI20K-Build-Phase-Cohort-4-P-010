import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Pure sign/verify logic for the tenant one-shot action token — free of
 * "server-only"/env-var lookups so it's directly unit-testable.
 * lib/auth/session.ts wraps this with OTP_TOKEN_SECRET lookup and the
 * single-use jti tracking.
 *
 * Format: a compact HMAC-signed token (base64url(payload).base64url(sig)),
 * not a full JWT — no extra dependency needed for a 2-field payload.
 */

export interface TenantActionTokenPayload {
  phone: string;
  purpose: "tenant_viewing" | "tenant_deposit_sign";
  jti: string;
  exp: number; // unix seconds
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signActionToken(
  payload: Omit<TenantActionTokenPayload, "jti" | "exp">,
  secret: string,
  ttlSeconds = 15 * 60,
): string {
  const fullPayload: TenantActionTokenPayload = {
    ...payload,
    jti: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signature = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(signature)}`;
}

export class ActionTokenInvalidError extends Error {
  constructor(reason: string) {
    super(`action_token_invalid: ${reason}`);
  }
}

/** Verifies signature, purpose match, and expiry. Does NOT check single-use — see lib/auth/session.ts. */
export function verifyActionTokenSignature(
  token: string,
  expectedPurpose: TenantActionTokenPayload["purpose"],
  secret: string,
): TenantActionTokenPayload {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) throw new ActionTokenInvalidError("malformed");

  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest();
  const givenSig = Buffer.from(sigB64, "base64url");
  if (expectedSig.length !== givenSig.length || !timingSafeEqual(expectedSig, givenSig)) {
    throw new ActionTokenInvalidError("bad_signature");
  }

  const payload: TenantActionTokenPayload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8"),
  );

  if (payload.purpose !== expectedPurpose) {
    throw new ActionTokenInvalidError("wrong_purpose");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new ActionTokenInvalidError("expired");
  }

  return payload;
}
