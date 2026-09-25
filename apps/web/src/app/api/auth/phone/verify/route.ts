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
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ code: z.string().length(4) });

/**
 * Marks the signed-in Field Host / Landlord's phone as verified. Used on a
 * Host's first login (accounts are provisioned by Admin with an unverified
 * phone). The phone checked is always the one on the caller's Profile, never
 * a client-supplied value.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireRole(["host", "landlord"]);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw err;
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile?.phone) {
    return NextResponse.json({ error: "no_phone_on_profile" }, { status: 400 });
  }

  try {
    const verified = await verifyOtp({
      phone: profile.phone,
      purpose: OtpPurpose.phone_verify,
      code: parsed.data.code,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    await consumeOtp(verified.id);
  } catch (err) {
    if (err instanceof OtpNotFoundError) {
      return NextResponse.json({ error: "otp_not_found_or_expired" }, { status: 400 });
    }
    if (err instanceof OtpInvalidError) {
      return NextResponse.json({ error: "otp_invalid", attemptsRemaining: err.attemptsRemaining }, { status: 400 });
    }
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json({ error: "otp_locked", retryAfterSeconds: err.retryAfterSeconds }, { status: 429 });
    }
    console.error("phone/verify failed", err);
    return NextResponse.json({ error: "otp_verify_failed" }, { status: 500 });
  }

  await prisma.profile.update({ where: { id: profile.id }, data: { phoneVerifiedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
