import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";

const bodySchema = z.object({ portal: z.enum(["tenant", "landlord", "host"]) });

/**
 * Finishes an email + password signup that already has a session.
 * For hosts, returns hostId and needsRfidVerification.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await ensureProfile(user, parsed.data.portal);
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
