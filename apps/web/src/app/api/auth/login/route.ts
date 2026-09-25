import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";

const bodySchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
  portal: z.enum(["tenant", "landlord", "host", "admin"]),
});

/**
 * Email + password login for all four roles. `portal` is the login screen.
 * For hosts, returns hostId and needsRfidVerification on first login.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { email, password, portal } = parsed.data;

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

  return NextResponse.json({
    ok: true,
    ...(result.needsRfidVerification ? { needsRfidVerification: true, hostId: result.hostId } : {}),
  });
}
