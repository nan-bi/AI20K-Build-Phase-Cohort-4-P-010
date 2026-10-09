"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Nhãn breadcrumb do trang chi tiết đăng ký cho đường dẫn hiện tại (vd. tên Host thay cho "Chi tiết").
 * Lưu theo pathname nên điều hướng sang trang khác không dính nhãn cũ.
 */
let labels: Record<string, string> = {};
const listeners = new Set<() => void>();

function set(path: string, label: string | null) {
  if (label === null) {
    if (!(path in labels)) return;
    labels = Object.fromEntries(Object.entries(labels).filter(([k]) => k !== path));
  } else {
    if (labels[path] === label) return;
    labels = { ...labels, [path]: label };
  }
  for (const l of listeners) l();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const useCrumbLabels = () => useSyncExternalStore(subscribe, () => labels, () => labels);

/** Đăng ký nhãn cho `path` trong suốt vòng đời component; `label` rỗng/undefined ⇒ không đăng ký. */
export function useRegisterCrumb(path: string, label: string | null | undefined) {
  useEffect(() => {
    if (!label) return;
    set(path, label);
    return () => set(path, null);
  }, [path, label]);
}
