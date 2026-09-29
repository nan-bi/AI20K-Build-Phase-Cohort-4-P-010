"use client";

import { useSyncExternalStore } from "react";
import { DEMO_USERS, ROLE_COOKIE, encodeRoleCookie, parseRoleCookie, type DemoUser, type Role } from "./auth";

const listeners = new Set<() => void>();

function readRole(): Role | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${ROLE_COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : null;
  return parseRoleCookie(v);
}

export function signInAs(role: Role) {
  document.cookie = `${ROLE_COOKIE}=${encodeRoleCookie(role)}; path=/; samesite=lax`;
  for (const l of listeners) l();
}

export function signOut() {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Vai trò đang đăng nhập (null = khách vãng lai). Trên server luôn null. */
export function useRole(): Role | null {
  return useSyncExternalStore(subscribe, readRole, () => null);
}

export function useDemoUser(): DemoUser | null {
  const role = useRole();
  return role ? DEMO_USERS[role] : null;
}
