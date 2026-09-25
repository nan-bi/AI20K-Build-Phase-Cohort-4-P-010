import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Pure OTP crypto helpers — deliberately free of Prisma/Supabase/"server-only"
 * imports so they're directly unit-testable. lib/auth/otp.ts (the guarded,
 * I/O-doing module) wraps these with DB reads/writes and env-var lookups.
 */

export function hashOtpCode(code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(code).digest("hex");
}

export function otpHashesEqual(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, "hex");
  const bufB = Buffer.from(hashB, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** 4-digit OTP per docs/SAD.md, zero-padded so e.g. 42 stays "0042". */
export function generateOtpCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}
