import "server-only";
import { requireEnv } from "@/lib/supabase/env";
import {
  signActionToken,
  verifyActionTokenSignature,
  ActionTokenInvalidError,
  type TenantActionTokenPayload,
} from "@/lib/auth/actionToken";

export { ActionTokenInvalidError };
export type { TenantActionTokenPayload };

// ---------------------------------------------------------------------------
// Tenant action tokens — single-use, purpose-bound, no Supabase session.
// Sign/verify math lives in lib/auth/actionToken.ts (pure, unit-tested);
// this wraps it with the OTP_TOKEN_SECRET env lookup and single-use tracking.
// ---------------------------------------------------------------------------

// NOTE: in-memory Set, which only works within one server process/instance
// and is reset on restart — fine for local dev, but on a multi-instance
// deployment this must move to a shared store (e.g. a `consumed_jti` table
// or Redis) before this ships to staging/production. Flagging explicitly
// rather than silently shipping a check that only half-works.
const usedActionTokenIds = new Set<string>();

function actionTokenSecret(): string {
  return requireEnv("OTP_TOKEN_SECRET");
}

/**
 * Issues a token proving "this phone completed OTP verification for this
 * purpose", valid for 15 minutes and intended for exactly one follow-up API
 * call (e.g. POST /api/viewings). This is the entire tenant "session" — no
 * cookie, no Supabase auth.users row.
 */
export function issueTenantActionToken(
  phone: string,
  purpose: TenantActionTokenPayload["purpose"],
): string {
  return signActionToken({ phone, purpose }, actionTokenSecret());
}

/** Verifies signature + expiry (via lib/auth/actionToken.ts) + single-use. */
export function verifyTenantActionToken(
  token: string,
  expectedPurpose: TenantActionTokenPayload["purpose"],
): TenantActionTokenPayload {
  const payload = verifyActionTokenSignature(token, expectedPurpose, actionTokenSecret());
  if (usedActionTokenIds.has(payload.jti)) {
    throw new ActionTokenInvalidError("already_used");
  }
  return payload;
}

export function consumeActionToken(jti: string) {
  usedActionTokenIds.add(jti);
}
