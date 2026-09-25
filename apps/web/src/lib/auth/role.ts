import type { User } from "@supabase/supabase-js";

export type Role = "tenant" | "host" | "landlord" | "admin";

/**
 * Pure — no "server-only", no I/O — so it's directly unit-testable.
 * lib/auth/rbac.ts (guarded) wraps this with the actual Supabase session
 * lookup for route handlers.
 *
 * Reads the role Supabase's Custom Access Token Hook stamped onto the JWT
 * (prisma/migrations/0002_custom_access_token_hook).
 */
export function roleFromUser(user: User): Role | undefined {
  const claims = user.app_metadata as Record<string, unknown> | undefined;
  const role = claims?.user_role;
  return typeof role === "string" ? (role as Role) : undefined;
}

/**
 * Reads `user_role` from the access token's claims. The Custom Access Token
 * Hook writes the role into the JWT only — not into the user's stored
 * app_metadata that getUser() returns — so this is the reliable source.
 * Only call it with a token that came from a validated session.
 */
export function roleFromAccessToken(token: string | undefined): Role | undefined {
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.user_role === "string" ? (payload.user_role as Role) : undefined;
  } catch {
    return undefined;
  }
}
