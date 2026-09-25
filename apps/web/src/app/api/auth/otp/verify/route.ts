import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { OtpPurpose } from "@prisma/client";
import {
  verifyOtp,
  consumeOtp,
  OtpNotFoundError,
  OtpInvalidError,
  OtpRateLimitError,
} from "@/lib/auth/otp";
import { normalizeVnPhone } from "@/lib/auth/phone";
import { issueTenantActionToken } from "@/lib/auth/session";

const bodySchema = z.object({
  phone: z.string().min(9).max(20),
  purpose: z.nativeEnum(OtpPurpose),
  code: z.string().length(4),
});

const TENANT_PURPOSES = new Set<OtpPurpose>([
  OtpPurpose.tenant_viewing,
  OtpPurpose.tenant_deposit_sign,
]);

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const phone = normalizeVnPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const { purpose, code } = parsed.data;
  // Only tenant OTPs are verified standalone (they yield an action token).
  // phone_verify is checked inside /api/auth/signup and /api/auth/phone/verify,
  // where the verified phone is bound to an account in the same request.
  if (!TENANT_PURPOSES.has(purpose)) {
    return NextResponse.json({ error: "unsupported_purpose" }, { status: 400 });
  }
  const ipAddress = request.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  let verified;
  try {
    verified = await verifyOtp({ phone, purpose, code, ipAddress, userAgent });
  } catch (err) {
    if (err instanceof OtpNotFoundError) {
      return NextResponse.json({ error: "otp_not_found_or_expired" }, { status: 400 });
    }
    if (err instanceof OtpInvalidError) {
      return NextResponse.json(
        { error: "otp_invalid", attemptsRemaining: err.attemptsRemaining },
        { status: 400 },
      );
    }
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json(
        { error: "otp_locked", retryAfterSeconds: err.retryAfterSeconds },
        { status: 429 },
      );
    }
    console.error("otp/verify failed", err);
    return NextResponse.json({ error: "otp_verify_failed" }, { status: 500 });
  }

  await consumeOtp(verified.id);
  const actionToken = issueTenantActionToken(
    phone,
    purpose as "tenant_viewing" | "tenant_deposit_sign",
  );
  return NextResponse.json({ ok: true, actionToken, expiresInSeconds: 15 * 60 });
}
