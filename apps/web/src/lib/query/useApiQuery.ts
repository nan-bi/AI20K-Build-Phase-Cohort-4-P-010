"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/apiClient";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; httpStatus: number }
  | { status: "ready"; data: T; /** true khi đang làm mới ngầm phía sau dữ liệu cũ đã hiển thị. */ refreshing: boolean };

export interface Query<T> {
  state: QueryState<T>;
  reload: () => void;
}

export interface ApiQueryDef<T> {
  key: string;
  fetch: () => Promise<ApiResponse<T>>;
  errorText?: (res: ApiResponse<T>) => string;
}

// ─── Cache stale-while-revalidate dùng chung giữa các màn hình ──────────────────────────────────
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<ApiResponse<unknown>>>();
const listeners = new Set<() => void>();
let cacheOwner: string | null = null;

function load<T>(def: ApiQueryDef<T>): Promise<ApiResponse<T>> {
  const running = inflight.get(def.key);
  if (running) return running as Promise<ApiResponse<T>>;
  const p = def.fetch().then((res) => {
    inflight.delete(def.key);
    if (res.ok) cache.set(def.key, res.data);
    return res;
  });
  inflight.set(def.key, p);
  return p;
}

const PREFETCH_CONCURRENCY = 2;
const prefetchQueue: ApiQueryDef<unknown>[] = [];
let prefetchRunning = 0;

function pumpPrefetch() {
  while (prefetchRunning < PREFETCH_CONCURRENCY && prefetchQueue.length) {
    const next = prefetchQueue.shift()!;
    if (cache.has(next.key) || inflight.has(next.key)) continue;
    prefetchRunning += 1;
    void load(next).finally(() => {
      prefetchRunning -= 1;
      pumpPrefetch();
    });
  }
}

/** Tải trước để khi người dùng mở trang đã có sẵn dữ liệu. */
export function prefetchApi<T>(def: ApiQueryDef<T>) {
  if (cache.has(def.key) || inflight.has(def.key) || prefetchQueue.some((q) => q.key === def.key)) return;
  prefetchQueue.push(def as ApiQueryDef<unknown>);
  pumpPrefetch();
}

/** Báo mọi màn đang mở tải lại và bỏ toàn bộ cache. */
export function invalidateApiData() {
  cache.clear();
  inflight.clear();
  prefetchQueue.length = 0;
  for (const l of listeners) l();
}

/** Xóa cache và báo làm mới các key khớp tiền tố. */
export function invalidateApiPattern(prefix: string) {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      inflight.delete(key);
    }
  }
  for (const l of listeners) l();
}

/** Gắn cache với người dùng đăng nhập. Đổi tài khoản thì xóa cache cũ. */
export function setApiCacheOwner(userId: string | null | undefined) {
  if (!userId) return;
  if (cacheOwner && cacheOwner !== userId) {
    cache.clear();
    inflight.clear();
  }
  cacheOwner = userId;
}

const initial = <T>(key: string): QueryState<T> =>
  cache.has(key) ? { status: "ready", data: cache.get(key) as T, refreshing: true } : { status: "loading" };

/**
 * Tải dữ liệu API qua cơ chế stale-while-revalidate.
 * `enabled=false` ⇒ KHÔNG gọi mạng (dùng khi màn hình chưa cần dữ liệu đó); có cache sẵn thì vẫn hiển thị.
 */
export function useApiQuery<T>(def: ApiQueryDef<T>, enabled = true): Query<T> {
  const { key } = def;
  const [entry, setEntry] = useState<{ key: string; state: QueryState<T> }>(() => ({ key, state: initial<T>(key) }));
  const [tick, setTick] = useState(0);
  const state = entry.key === key ? entry.state : initial<T>(key);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void load(def).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setEntry({ key, state: { status: "ready", data: res.data, refreshing: false } });
      } else {
        const errorMsg = def.errorText ? def.errorText(res) : (res as { message?: string }).message || "Không tải được dữ liệu.";
        setEntry((prev) =>
          prev.key === key && prev.state.status === "ready"
            ? { key, state: { ...prev.state, refreshing: false } }
            : { key, state: { status: "error", message: errorMsg, httpStatus: res.status } },
        );
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, enabled]);

  const reload = useCallback(() => {
    inflight.delete(key);
    setTick((t) => t + 1);
  }, [key]);

  return { state, reload };
}
