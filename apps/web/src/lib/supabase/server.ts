import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Route Handlers and Server Components — reads/writes
 * the session cookie via next/headers. Use this (not the admin client) for
 * anything acting "as the current signed-in user".
 *
 * Cookie writes silently no-op when called from a Server Component (Next.js
 * forbids mutating cookies outside Route Handlers/Server Actions) — that's
 * fine, session refresh in that case is handled by middleware.ts instead.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore; middleware.ts refreshes
          // the session cookie on the next request that hits a matched path.
        }
      },
    },
  });
}
