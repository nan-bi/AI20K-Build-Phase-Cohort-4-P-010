import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { roleFromAccessToken, roleFromUser, type Role } from "@/lib/auth/role";

function roleForPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return "admin";
  }
  if (pathname.startsWith("/landlord") || pathname.startsWith("/api/landlord")) {
    return "landlord";
  }
  if (pathname.startsWith("/host") || pathname.startsWith("/api/host")) {
    return "host";
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // getUser() (not getSession()) validates against Supabase and refreshes
  // the access token if needed, rewriting cookies onto `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const required = roleForPath(request.nextUrl.pathname);
  if (!required) return response;

  // Allow the login routes themselves through unauthenticated.
  if (request.nextUrl.pathname.endsWith("/login")) {
    return response;
  }

  if (!user) {
    // Landlord signs in on the public /login; Host and Admin share /admin/login.
    const loginPath = required === "landlord" ? "/login" : "/admin/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = roleFromAccessToken(session?.access_token) ?? roleFromUser(user);
  if (role !== required) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return response;
}

export const config = {
  matcher: [
    "/landlord/:path*",
    "/host/:path*",
    "/admin/:path*",
    "/api/landlord/:path*",
    "/api/host/:path*",
    "/api/admin/:path*",
  ],
};
