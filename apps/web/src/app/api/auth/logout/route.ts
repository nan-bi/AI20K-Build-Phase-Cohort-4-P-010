import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Must be a Route Handler, not a Server Component — only Route Handlers
// (and Server Actions) can mutate response cookies in Next.js.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

// Visiting /api/auth/logout in the browser also signs out (handy when a
// stale session gets stuck on a 403 page).
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
