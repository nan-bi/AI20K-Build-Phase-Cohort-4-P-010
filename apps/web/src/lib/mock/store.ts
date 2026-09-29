"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_STATE, seedState, todayKey } from "./seed";
import type { MockState } from "./types";

/**
 * Store mock dùng chung cho cả 4 vai trò. Không có backend: toàn bộ dữ liệu nằm trong localStorage của
 * trình duyệt nên khi đổi vai trò (khách → Host → chủ nhà → Admin) vẫn thấy cùng một dòng sự kiện.
 */
const KEY = "vinstay.mock.v5";

let state: MockState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): MockState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    if (!parsed.hostRoles) {
      parsed.hostRoles = {};
    }
    return { ...parsed, ready: true };
  } catch {
    return null;
  }
}

function writeStorage(next: MockState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...next, ready: undefined }));
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư) — vẫn chạy bình thường trong bộ nhớ.
  }
}

function emit() {
  for (const l of listeners) l();
}

function ensureLoaded(): MockState {
  if (typeof window === "undefined") return EMPTY_STATE;
  if (loaded) return state;
  loaded = true;
  try {
    window.localStorage.removeItem("vinstay.mock.v3");
    window.localStorage.removeItem("vinstay.mock.v4");
  } catch {
    // Trình duyệt chặn storage
  }
  const now = Date.now();
  const stored = readStorage();
  // Dữ liệu seed gắn với "hôm nay" (lịch xem trong ngày) nên qua ngày mới thì dựng lại cho khỏi cũ.
  state = stored && stored.seededOn === todayKey(now) ? stored : seedState(now);
  writeStorage(state);
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const next = readStorage();
    if (next) {
      state = next;
      emit();
    }
  });
  return state;
}

export function getMockState(): MockState {
  return ensureLoaded();
}

export function setMockState(updater: (prev: MockState) => MockState) {
  const prev = ensureLoaded();
  const next = updater(prev);
  if (next === prev) return;
  state = next;
  writeStorage(state);
  emit();
}

export function resetMockState() {
  setMockState(() => seedState(Date.now()));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Trạng thái mock hiện tại. `ready=false` trên server và ở lần render hydrate đầu tiên. */
export function useMock(): MockState {
  return useSyncExternalStore(subscribe, ensureLoaded, () => EMPTY_STATE);
}
