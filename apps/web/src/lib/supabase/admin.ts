import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role Supabase client — bypasses RLS and can call Admin-only APIs
 * (auth.admin.createUser, updateUserById, ...). NEVER import this from
 * client-side code or expose SUPABASE_SERVICE_ROLE_KEY to the browser; the
 * `server-only` import throws a build error if that ever happens.
 *
 * Used by:
 *  - /api/auth/signup and /api/admin/field-hosts to create the Supabase
 *    auth user (email + password) for Landlord / Field Host accounts.
 *  - scripts/seed.ts and scripts/seed-admin-allowlist.ts.
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
