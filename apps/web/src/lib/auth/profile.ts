import "server-only";
import type { User } from "@supabase/supabase-js";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Portal = "tenant" | "landlord" | "host" | "admin";

export const PORTAL_HOME: Record<Portal, string> = {
  tenant: "/",
  landlord: "/landlord/dashboard",
  host: "/host/dispatch",
  admin: "/admin/dashboard",
};

export type EnsureProfileError =
  | "email_not_verified"
  | "not_authorized" // host not invited by Admin (or already claimed), or admin not provisioned
  | "wrong_portal" // account exists under a different role
  | "account_suspended";

export type EnsureProfileResult =
  | { ok: true; created: boolean; needsRfidVerification: false }
  | { ok: true; created: boolean; needsRfidVerification: true; hostId: string }
  | { ok: false; error: EnsureProfileError };

/**
 * Called after every successful sign-in (Google, email + password, email
 * confirmation link) with the portal the user came through. Creates the
 * Profile on first sign-in, and enforces that the account belongs to that
 * portal. For hosts on first login, returns `needsRfidVerification: true`
 * so the caller displays a form to enter their RFID card number.
 * Returns `created` so the caller can refresh the session: the JWT minted
 * before the Profile existed has no `user_role` claim yet.
 *
 * Role assignment rules:
 *  - tenant / landlord: open self-signup.
 *  - host: email must match an invited FieldHost row (unclaimed). After RFID
 *    verification (via /api/auth/verify-rfid), the row is linked to the
 *    Profile.
 *  - admin: never created here — provisioned by scripts/create-admin.ts.
 */
export async function ensureProfile(
  user: User,
  portal: Portal,
): Promise<EnsureProfileResult> {
  const email = user.email?.toLowerCase();
  // Email must be proven (Google always is; email signups need the confirm
  // link) — otherwise anyone could claim an invited host email.
  if (!email || !user.email_confirmed_at) return { ok: false, error: "email_not_verified" };

  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) {
    if (existing.role !== portal) return { ok: false, error: "wrong_portal" };
    if (existing.status !== "active") return { ok: false, error: "account_suspended" };
    await prisma.profile.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    if (portal === "host") {
      // A host who authenticated but never finished the RFID step must not slip in.
      const invite = await prisma.fieldHost.findUnique({ where: { email } });
      if (!invite) return { ok: false, error: "not_authorized" };
      if (!invite.userId) {
        return { ok: true, created: false, needsRfidVerification: true, hostId: invite.id };
      }
    }
    return { ok: true, created: false, needsRfidVerification: false };
  }

  const fullName: string | null =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const base = { id: user.id, email, status: "active" as const, lastLoginAt: new Date() };

  if (portal === "tenant") {
    await prisma.profile.create({ data: { ...base, role: UserRole.tenant, fullName } });
    return { ok: true, created: true, needsRfidVerification: false };
  } else if (portal === "landlord") {
    await prisma.profile.create({
      data: { ...base, role: UserRole.landlord, fullName, landlord: { create: {} } },
    });
    return { ok: true, created: true, needsRfidVerification: false };
  } else if (portal === "host") {
    const invite = await prisma.fieldHost.findUnique({ where: { email } });
    if (!invite || invite.userId) return { ok: false, error: "not_authorized" };
    await prisma.profile.create({ data: { ...base, role: UserRole.host, fullName } });
    return { ok: true, created: true, needsRfidVerification: true, hostId: invite.id };
  } else {
    return { ok: false, error: "not_authorized" };
  }
}
