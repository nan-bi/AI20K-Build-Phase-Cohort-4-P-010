import { NextResponse, type NextRequest } from "next/server";
import { rebuildCookieHeader } from "@/lib/auth/setCookie";
import { PORTAL_HOME, hostGateRedirect, loginPathFor, portalForPath, type Portal, type SessionUser } from "@/lib/auth/portals";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/+$/, "");

/** Cổng cần đăng nhập để vào một đường dẫn; null = công khai. `/account`, `/booking` là khu của Khách thuê. */
function requiredPortal(pathname: string): Portal | null {
  if (pathname === "/admin/login" || pathname === "/host/login") return null;
  if (/^\/(account|booking)(\/|$)/.test(pathname)) return "tenant";
  return portalForPath(pathname);
}

/**
 * Chặn trang theo phiên THẬT: hỏi backend `GET /auth/session` (cookie httpOnly `vs_access`).
 * Backend có thể xoá cookie hỏng ⇒ chuyển tiếp Set-Cookie cho trình duyệt và cập nhật cookie của request đang xử lý.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const required = requiredPortal(pathname);
  if (!required) return NextResponse.next();

  let user: SessionUser | null = null;
  let setCookies: string[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/session`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (res.ok) user = ((await res.json()) as { data?: { user: SessionUser | null } }).data?.user ?? null;
    setCookies = res.headers.getSetCookie();
  } catch {
    // Backend không với tới được ⇒ coi như chưa đăng nhập.
  }

  if (!user || user.portal !== required) {
    const target = new URL(loginPathFor(required), request.url);
    if (user?.portal) return NextResponse.redirect(new URL(PORTAL_HOME[user.portal], request.url));
    target.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(target);
    for (const c of setCookies) redirect.headers.append("set-cookie", c);
    return redirect;
  }

  const gate = required === "host" ? hostGateRedirect(user) : null;
  if (gate) {
    const redirect = NextResponse.redirect(new URL(gate, request.url));
    for (const c of setCookies) redirect.headers.append("set-cookie", c);
    return redirect;
  }

  // Cập nhật cookie của request đang xử lý để Server Component thấy token mới ngay lượt này.
  const headers = new Headers(request.headers);
  headers.set("cookie", rebuildCookieHeader(request.headers.get("cookie") ?? "", setCookies));
  const response = NextResponse.next({ request: { headers } });
  for (const c of setCookies) response.headers.append("set-cookie", c);
  return response;
}

export const config = {
  matcher: ["/landlord/:path*", "/host/:path*", "/admin/:path*", "/account", "/account/:path*", "/booking", "/booking/:path*"],
};
