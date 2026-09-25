import "server-only";
import { OtpChannel, OtpPurpose, OtpStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/supabase/env";
import { generateOtpCode, hashOtpCode, otpHashesEqual } from "@/lib/auth/otpCrypto";
import type { OtpChannelSender } from "@/lib/notifications/otpChannel";
import { ZaloZnsSender } from "@/lib/notifications/zaloZnsSender";
import { SmsFallbackSender } from "@/lib/notifications/smsFallbackSender";
import { ConsoleOtpSender } from "@/lib/notifications/consoleOtpSender";

const TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const LOCKOUT_SECONDS = Number(process.env.OTP_LOCKOUT_SECONDS ?? 600);

function otpPepper(): string {
  return requireEnv("OTP_PEPPER");
}

function hashCode(code: string): string {
  return hashOtpCode(code, otpPepper());
}

function generateCode(): string {
  return generateOtpCode();
}

export class OtpRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("otp_locked");
  }
}

export class OtpInvalidError extends Error {
  constructor(public readonly attemptsRemaining: number) {
    super("otp_invalid");
  }
}

export class OtpNotFoundError extends Error {
  constructor() {
    super("otp_not_found_or_expired");
  }
}

/**
 * Generates a fresh OTP for (phone, purpose), stores its hash, and attempts
 * delivery Zalo -> SMS fallback -> (development only) console. Returns the
 * plaintext code ONLY when APP_ENV=development, so callers can echo it back
 * for local testing without needing real Zalo/SMS credentials.
 */
export async function sendOtp(params: {
  phone: string;
  purpose: OtpPurpose;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ devCode?: string }> {
  const { phone, purpose, ipAddress, userAgent } = params;

  const existing = await prisma.otpCode.findFirst({
    where: { phone, purpose, status: OtpStatus.pending },
    orderBy: { createdAt: "desc" },
  });
  if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (existing.lockedUntil.getTime() - Date.now()) / 1000,
    );
    throw new OtpRateLimitError(retryAfterSeconds);
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

  const isDev = process.env.APP_ENV === "development";
  let channel: OtpChannel = OtpChannel.zalo;
  let devCode: string | undefined;

  const senders: Array<{ channel: OtpChannel; sender: OtpChannelSender }> = [
    { channel: OtpChannel.zalo, sender: new ZaloZnsSender() },
    { channel: OtpChannel.sms, sender: new SmsFallbackSender() },
  ];

  let delivered = false;
  for (const candidate of senders) {
    try {
      await candidate.sender.send(phone, code);
      channel = candidate.channel;
      delivered = true;
      break;
    } catch {
      // try next channel
    }
  }

  if (!delivered) {
    if (!isDev) {
      throw new Error("Failed to deliver OTP via any configured channel.");
    }
    await new ConsoleOtpSender().send(phone, code);
    devCode = code;
  }

  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash,
      channel,
      status: OtpStatus.pending,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  await prisma.authAuditLog.create({
    data: { phone, event: "otp_sent", ipAddress, userAgent, metadata: { purpose } },
  });

  return { devCode };
}

/**
 * Verifies a code for (phone, purpose). On success marks the row consumed
 * and returns it (callers decide what to do next — mark a host/landlord phone
 * verified, or issue a one-shot action token for tenant purposes).
 * On failure increments attemptCount and, at MAX_ATTEMPTS, locks for
 * LOCKOUT_SECONDS.
 */
export async function verifyOtp(params: {
  phone: string;
  purpose: OtpPurpose;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { phone, purpose, code, ipAddress, userAgent } = params;

  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, status: OtpStatus.pending },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new OtpNotFoundError();
  }
  if (otp.lockedUntil && otp.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (otp.lockedUntil.getTime() - Date.now()) / 1000,
    );
    throw new OtpRateLimitError(retryAfterSeconds);
  }

  const candidateHash = hashCode(code);
  if (!otpHashesEqual(candidateHash, otp.codeHash)) {
    const attemptCount = otp.attemptCount + 1;
    const lockedUntil =
      attemptCount >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_SECONDS * 1000)
        : null;

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attemptCount, lockedUntil },
    });
    await prisma.authAuditLog.create({
      data: { phone, event: "otp_verify_failed", ipAddress, userAgent, metadata: { purpose } },
    });

    if (lockedUntil) {
      throw new OtpRateLimitError(LOCKOUT_SECONDS);
    }
    throw new OtpInvalidError(MAX_ATTEMPTS - attemptCount);
  }

  const verified = await prisma.otpCode.update({
    where: { id: otp.id },
    data: { status: OtpStatus.verified, verifiedAt: new Date() },
  });

  await prisma.authAuditLog.create({
    data: { phone, event: "otp_verified", ipAddress, userAgent, metadata: { purpose } },
  });

  return verified;
}

export async function consumeOtp(id: string) {
  await prisma.otpCode.update({
    where: { id },
    data: { status: OtpStatus.consumed, consumedAt: new Date() },
  });
}
