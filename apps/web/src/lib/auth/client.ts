"use client";

import { useSyncExternalStore } from "react";
import type { SessionUser } from "./portals";

/**
 * Phiên đăng nhập THẬT cho Client Component: đọc `GET /api/v1/auth/session` (cookie httpOnly do backend set),
 * chỉ một lần cho mỗi lần tải trang và dùng chung giữa các component.
 */
export interface SessionState {
  ready: boolean;
  user: SessionUser | null;
}

const SERVER_STATE: SessionState = { ready: false, user: null };
let state: SessionState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function publish(next: SessionState) {
  state = next;
  for (const l of listeners) l();
}

async function load(): Promise<SessionState> {
  try {
    const res = await fetch("/api/v1/auth/session", { credentials: "same-origin", cache: "no-store" });
    const body = res.ok ? ((await res.json()) as { data?: { user: SessionUser | null } }) : null;
    publish({ ready: true, user: body?.data?.user ?? null });
  } catch {
    publish({ ready: true, user: null }); // backend không với tới được ⇒ coi như chưa đăng nhập
  }
  return state;
}

/** Đọc lại phiên (sau khi đổi họ tên…) để header và các màn hình khác cập nhật ngay. */
export function refreshSession() {
  started = true;
  return load();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(cb);
  };
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** Cổng của người đang đăng nhập (null = khách vãng lai hoặc đang tải). */
export function useRole(): SessionUser["portal"] {
  return useSession().user?.portal ?? null;
}

/** Đăng xuất: thu hồi phiên ở backend rồi tải lại toàn trang (xoá cache router của các trang có chắn quyền). */
export async function signOut(redirectTo = "/login") {
  try {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    window.location.assign(redirectTo);
  }
}
