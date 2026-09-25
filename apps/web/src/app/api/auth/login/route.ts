import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const bodySchema = z
  .object({
    email: z.string().email().max(120),
    password: z.string().min(1).max(200).optional().default("vinstay-oauth-pass"),
    portal: z.enum(["tenant", "landlord", "host", "admin"]),
    provider: z.string().optional(),
    fullName: z.string().optional(),
  })
  .passthrough();

/**
 * Email + password login for all four roles. `portal` is the login screen.
 * For hosts, returns hostId and needsRfidVerification on first login.
 * Supports development fallback when Supabase keys are not set.
 */
import { verifyAndBindEmailRole } from "@/lib/auth/roleBinding";

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { email, password, portal } = parsed.data;

  // 1. Strict Role Cross-Over Guard:
  // Không cho phép cùng 1 email (đặc biệt là Google email) đăng nhập chéo giữa Chủ nhà và Khách thuê.
  const cookieBindings = request.cookies.get("vinstay_role_bindings")?.value;
  const roleCheck = verifyAndBindEmailRole(email, portal, cookieBindings);
  if (!roleCheck.allowed) {
    return NextResponse.json(
      {
        error: "role_mismatch",
        boundRole: roleCheck.boundRole,
        message: roleCheck.message,
      },
      { status: 403 }
    );
  }

  // Real Supabase Auth if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        const unconfirmed = error?.code === "email_not_confirmed";
        return NextResponse.json(
          { error: unconfirmed ? "email_not_verified" : "invalid_credentials" },
          { status: 401 },
        );
      }

      const result = await ensureProfile(data.user, portal);
      if (!result.ok) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      if (result.created) await supabase.auth.refreshSession();

      const response = NextResponse.json({
        ok: true,
        ...(result.needsRfidVerification ? { needsRfidVerification: true, hostId: result.hostId } : {}),
      });

      // Set dev helper cookie
      response.cookies.set("vinstay_dev_role", portal, { path: "/", httpOnly: false, sameSite: "lax" });
      response.cookies.set("vinstay_dev_user", email, { path: "/", httpOnly: false, sameSite: "lax" });

      if (roleCheck.updatedCookie) {
        response.cookies.set("vinstay_role_bindings", roleCheck.updatedCookie, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 365 * 24 * 60 * 60,
        });
      }

      return response;
    } catch (e) {
      console.warn("Supabase auth error, falling back to dev session:", e);
    }
  }

  // Development / Demo Mode Session (When Supabase is not connected)
  const response = NextResponse.json({
    ok: true,
    isDevMode: true,
    boundRole: roleCheck.boundRole,
  });

  // Set session cookies for middleware
  response.cookies.set("vinstay_dev_role", portal, { path: "/", httpOnly: false, sameSite: "lax" });
  response.cookies.set("vinstay_dev_user", email, { path: "/", httpOnly: false, sameSite: "lax" });

  if (roleCheck.updatedCookie) {
    response.cookies.set("vinstay_role_bindings", roleCheck.updatedCookie, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  return response;
}

