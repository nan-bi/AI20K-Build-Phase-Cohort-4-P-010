import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth/rbac";

/** GET current signed-in user + role, for client-side hydration. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone ?? null,
      email: user.email ?? null,
      role: roleFromUser(user) ?? null,
    },
  });
}
