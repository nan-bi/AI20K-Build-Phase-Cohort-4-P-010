import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client + response pair for use inside middleware.ts. Distinct
 * from lib/supabase/server.ts because middleware reads/writes cookies on
 * NextRequest/NextResponse, not via next/headers.
 *
 * Calling supabase.auth.getUser() on the returned client both validates the
 * session against Supabase and, if the access token was near/past expiry,
 * transparently refreshes it and rewrites the cookies onto `response` — this
 * is how sessions self-renew without a dedicated refresh endpoint.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return { supabase, response };
}
