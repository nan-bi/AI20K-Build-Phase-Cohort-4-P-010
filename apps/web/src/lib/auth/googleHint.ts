"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Tài khoản Google đã đăng nhập trên thiết bị này — backend đặt cookie `vs_google_hint` (không httpOnly) sau mỗi lần
 * đăng nhập Google thành công để màn đăng nhập hiện "Tiếp tục bằng tên …". Chỉ chứa tên + email, không phải phiên.
 */
export interface GoogleHint {
  name: string | null;
  email: string;
}

const COOKIE = "vs_google_hint";

function readRaw(): string | null {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
    return raw || null;
  } catch {
    return null;
  }
}

function parse(raw: string | null): GoogleHint | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<GoogleHint>;
    return typeof parsed.email === "string" && parsed.email ? { name: parsed.name ?? null, email: parsed.email } : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

/** Cookie chỉ có ở client: server render ra null, sau hydrate mới có giá trị (không lệch HTML). */
export function useGoogleHint(): GoogleHint | null {
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}

/** "Nguyễn Phương Nam" → "Nguyễn Phương Nam"; thiếu tên thì dùng phần trước @ của email. */
export function hintDisplayName(hint: GoogleHint): string {
  return hint.name?.trim() || hint.email.split("@")[0];
}
