import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleFromAccessToken, roleFromUser, type Role } from "@/lib/auth/role";

export type { Role };
export { roleFromUser };

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
  }
}

/**
 * Primary RBAC enforcement point for Route Handlers. This is the layer that
 * actually matters for anything going through Prisma (which connects with a
 * privileged role and bypasses RLS) — see the note in
 * prisma/migrations/0003_profiles_rls/migration.sql. middleware.ts does the
 * same check for page routes as a first line of defense; call this again
 * inside the route handler itself since middleware matchers can drift.
 */
export async function requireRole(allowed: Role[]): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = roleFromAccessToken(session?.access_token) ?? roleFromUser(user);
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenError();
  }
  return user;
}
