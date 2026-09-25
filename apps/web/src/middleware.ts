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
  const pathname = request.nextUrl.pathname;

  // 1. Allow login routes through immediately without touching auth
  if (pathname.endsWith("/login")) {
    return NextResponse.next({ request });
  }

  const required = roleForPath(pathname);
  if (!required) return NextResponse.next({ request });

  // 2. Allow quick preview / dev role cookie if set
  const devRole = request.cookies.get("vinstay_dev_role")?.value;
  if (
    devRole &&
    (devRole === required ||
      (required === "host" && (devRole === "host" || devRole === "field_host")) ||
      devRole === "admin")
  ) {
    return NextResponse.next({ request });
  }

  // 3. Authenticate with Supabase
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginPath = required === "landlord" ? "/login?tab=landlord" : "/admin/login";
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
  } catch {
    // If Supabase not reachable or credentials invalid
    const loginPath = required === "landlord" ? "/login?tab=landlord" : "/admin/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
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
