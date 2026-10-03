"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/apiClient";
import { errorText } from "./api";
import type { QueryDef } from "./queries";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; httpStatus: number }
  | { status: "ready"; data: T; /** true khi đang làm mới ngầm phía sau dữ liệu cũ đã hiển thị. */ refreshing: boolean };

export interface Query<T> {
  state: QueryState<T>;
  reload: () => void;
}

// ─── Cache stale-while-revalidate dùng chung giữa các màn hình ──────────────────────────────────
// Vào lại một màn hình thì hiện NGAY dữ liệu lần trước rồi làm mới ngầm; hai nơi cùng cần một `key` thì dùng chung
// một request. Mỗi lượt gọi API tới Supabase tốn ~1 giây nên đây là khác biệt giữa "bấm là thấy" và "bấm là chờ".

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<ApiResponse<unknown>>>();
const listeners = new Set<() => void>();
let cacheOwner: string | null = null;

function load<T>(def: QueryDef<T>): Promise<ApiResponse<T>> {
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

// Tải trước chạy qua hàng đợi, tối đa 2 request cùng lúc: mỗi request chi tiết căn là ~6 truy vấn DB, mà DB gói free
// chỉ có pool nhỏ — bắn cả chục request một lượt có thể làm Supabase từ chối kết nối ("Can't reach database server").
const PREFETCH_CONCURRENCY = 2;
const prefetchQueue: QueryDef<unknown>[] = [];
let prefetchRunning = 0;

function pumpPrefetch() {
  while (prefetchRunning < PREFETCH_CONCURRENCY && prefetchQueue.length) {
    const next = prefetchQueue.shift()!;
    if (cache.has(next.key) || inflight.has(next.key)) continue; // người dùng đã mở trang đó rồi
    prefetchRunning += 1;
    void load(next).finally(() => {
      prefetchRunning -= 1;
      pumpPrefetch();
    });
  }
}

/** Gọi sớm để lúc người dùng bấm vào đã có sẵn dữ liệu (vd. tải chi tiết các căn ngay khi có danh sách). */
export function prefetchLandlord<T>(def: QueryDef<T>) {
  if (cache.has(def.key) || inflight.has(def.key) || prefetchQueue.some((q) => q.key === def.key)) return;
  prefetchQueue.push(def as QueryDef<unknown>);
  pumpPrefetch();
}

/** Báo mọi màn đang mở tải lại và bỏ cache (gọi sau khi ký gửi / thoát ủy quyền thành công). */
export function invalidateLandlordData() {
  cache.clear();
  inflight.clear();
  prefetchQueue.length = 0;
  for (const l of listeners) l();
}

/**
 * Gắn cache với người dùng đang đăng nhập: đổi tài khoản trong cùng một tab thì bỏ cache cũ,
 * để không bao giờ hiện dữ liệu của người trước.
 */
export function setLandlordCacheOwner(userId: string | null | undefined) {
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
 * Tải dữ liệu từ API chủ nhà qua cache. Có cache → hiện ngay và làm mới nền; chưa có → `loading`.
 * Lỗi khi làm mới nền thì giữ dữ liệu cũ (không đẩy người dùng vào màn lỗi chỉ vì một lần mạng chập chờn).
 */
export function useLandlordQuery<T>(def: QueryDef<T>): Query<T> {
  const { key } = def;
  const [entry, setEntry] = useState<{ key: string; state: QueryState<T> }>(() => ({ key, state: initial<T>(key) }));
  const [tick, setTick] = useState(0);
  // Đổi `key` (cùng component, tham số khác) → bỏ state của key cũ ngay trong lượt render này.
  const state = entry.key === key ? entry.state : initial<T>(key);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void load(def).then((res) => {
      if (!alive) return;
      if (res.ok) setEntry({ key, state: { status: "ready", data: res.data, refreshing: false } });
      else
        setEntry((prev) =>
          // Làm mới nền thất bại: giữ dữ liệu đang hiển thị.
          prev.key === key && prev.state.status === "ready"
            ? { key, state: { ...prev.state, refreshing: false } }
            : { key, state: { status: "error", message: errorText(res, "Không tải được dữ liệu."), httpStatus: res.status } },
        );
    });
    return () => {
      alive = false;
    };
    // `def.fetch` luôn được suy ra từ `key` (xem queries.ts) nên chỉ cần key + tick làm phụ thuộc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => {
    inflight.delete(key);
    setTick((t) => t + 1);
  }, [key]);
  return { state, reload };
}
