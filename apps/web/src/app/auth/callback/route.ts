import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile, PORTAL_HOME, type Portal } from "@/lib/auth/profile";

const PORTALS = new Set<Portal>(["tenant", "landlord", "host"]);

/**
 * Landing point for Google OAuth and the email-confirmation link.
 * For hosts, does not finalize the login: returns a redirect with ?rfidPending=hostId
 * so the client-side UI can display the RFID form instead of redirecting home.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const portalParam = request.nextUrl.searchParams.get("portal") as Portal | null;
  const portal = portalParam && PORTALS.has(portalParam) ? portalParam : null;

  const loginPath = portal === "host" ? "/admin/login" : "/login";
  const fail = (error: string) =>
    NextResponse.redirect(new URL(`${loginPath}?error=${error}&tab=${portal ?? "tenant"}`, request.url));

  if (!portal) return fail("oauth_failed");
  if (!code) return fail("missing_code");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("oauth_failed");

  const result = await ensureProfile(data.user, portal);
  if (!result.ok) {
    await supabase.auth.signOut();
    return fail(result.error);
  }
  if (result.created) await supabase.auth.refreshSession();

  // Hosts need to verify RFID before home redirect
  if (result.needsRfidVerification) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(`/admin/login?rfidPending=${result.hostId}&tab=host`, appUrl),
    );
  }

  return NextResponse.redirect(new URL(PORTAL_HOME[portal], request.url));
}
