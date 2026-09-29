import "server-only";
import { cookies } from "next/headers";
import { DEMO_USERS, ROLE_COOKIE, parseRoleCookie, type DemoUser } from "./auth";

/** Người dùng demo hiện tại cho Server Component; null nếu chưa đăng nhập. */
export async function getDemoUser(): Promise<DemoUser | null> {
  const role = parseRoleCookie((await cookies()).get(ROLE_COOKIE)?.value);
  return role ? DEMO_USERS[role] : null;
}
