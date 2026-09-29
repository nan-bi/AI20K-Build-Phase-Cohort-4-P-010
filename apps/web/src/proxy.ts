import { NextResponse, type NextRequest } from "next/server";
import { ROLE_COOKIE, loginUrl, parseRoleCookie, requiredRole } from "@/lib/mock/auth";

/**
 * Chặn trang theo vai trò trong bản MVP mock: phiên chỉ là cookie `vs_role` do màn đăng nhập demo đặt.
 * (Đăng nhập thật qua backend NestJS đang tạm dừng — xem lib/auth/* và components/auth/* nếu cần khôi phục.)
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const required = requiredRole(pathname);
  if (!required) return NextResponse.next();

  const role = parseRoleCookie(request.cookies.get(ROLE_COOKIE)?.value);
  if (role && role === required) return NextResponse.next();

  return NextResponse.redirect(new URL(loginUrl(required, pathname + search), request.url));
}

export const config = {
  matcher: ["/landlord/:path*", "/host/:path*", "/admin/:path*", "/account/:path*", "/booking", "/booking/:path*"],
};
