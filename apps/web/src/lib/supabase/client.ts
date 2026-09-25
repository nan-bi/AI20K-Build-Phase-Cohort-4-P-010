"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components (e.g. a future Realtime
 * subscription on the landlord dashboard). Uses the anon key — RLS policies
 * (see prisma/migrations/0003_profiles_rls) are what constrain what this
 * client can read/write, since it authenticates as the signed-in browser
 * session, not as our privileged server role.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
