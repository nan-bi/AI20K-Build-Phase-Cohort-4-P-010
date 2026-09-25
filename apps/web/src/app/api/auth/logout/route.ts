import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("vinstay_dev_role");
  response.cookies.delete("vinstay_dev_user");
  return response;
}

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("vinstay_dev_role");
  response.cookies.delete("vinstay_dev_user");
  return response;
}

