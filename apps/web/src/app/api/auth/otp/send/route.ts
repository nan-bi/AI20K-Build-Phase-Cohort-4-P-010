import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { OtpPurpose } from "@prisma/client";
import { sendOtp, OtpRateLimitError } from "@/lib/auth/otp";
import { normalizeVnPhone } from "@/lib/auth/phone";

// OTP only proves the phone is real; the legacy login purposes are unused.
const bodySchema = z.object({
  phone: z.string().min(9).max(20),
  purpose: z.enum([OtpPurpose.phone_verify, OtpPurpose.tenant_viewing, OtpPurpose.tenant_deposit_sign]),
});

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

  try {
    const { devCode } = await sendOtp({
      phone,
      purpose: parsed.data.purpose,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      expiresInSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
      // Only ever present when APP_ENV=development — see lib/auth/otp.ts.
      ...(devCode ? { devCode } : {}),
    });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      return NextResponse.json(
        { error: "otp_locked", retryAfterSeconds: err.retryAfterSeconds },
        { status: 429 },
      );
    }
    console.error("otp/send failed", err);
    return NextResponse.json({ error: "otp_send_failed" }, { status: 502 });
  }
}
