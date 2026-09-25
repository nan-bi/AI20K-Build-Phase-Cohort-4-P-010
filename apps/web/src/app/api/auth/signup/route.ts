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
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(200),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(9).max(20),
  code: z.string().length(4),
});

/**
 * Landlord self-signup. The phone number must first be proven real with a
 * Zalo OTP (`phone_verify`, sent via /api/auth/otp/send); the code is checked
 * here, in the same request that creates the account, so an unverified phone
 * can never end up on a Profile. Login afterwards is email + password.
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, fullName, code } = parsed.data;

  const phone = normalizeVnPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const taken = await prisma.profile.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: taken.email === email ? "email_already_registered" : "phone_already_registered" },
      { status: 409 },
    );
  }

  let verified;
  try {
    verified = await verifyOtp({
      phone,
      purpose: OtpPurpose.phone_verify,
      code,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
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
    console.error("signup otp verify failed", err);
    return NextResponse.json({ error: "otp_verify_failed" }, { status: 500 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("signup createUser failed", error);
    return NextResponse.json({ error: "create_user_failed" }, { status: 502 });
  }

  try {
    await prisma.profile.create({
      data: {
        id: data.user.id,
        email,
        phone,
        phoneVerifiedAt: new Date(),
        role: "landlord",
        fullName,
        status: "active",
        landlord: { create: {} },
      },
    });
  } catch (err) {
    // Don't leave an orphan auth.users row that could never log in.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    console.error("signup profile create failed", err);
    return NextResponse.json({ error: "create_profile_failed" }, { status: 500 });
  }
  await consumeOtp(verified.id);

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: "signin_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
