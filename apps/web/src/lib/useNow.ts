"use client";

import { useSyncExternalStore } from "react";

interface Ticker {
  value: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => number;
}

const tickers = new Map<number, Ticker>();

function tickerFor(ms: number): Ticker {
  let t = tickers.get(ms);
  if (t) return t;
  const created: Ticker = {
    value: 0,
    listeners: new Set(),
    subscribe(cb) {
      created.listeners.add(cb);
      if (!created.timer) {
        created.timer = setInterval(() => {
          created.value = Date.now();
          for (const l of created.listeners) l();
        }, ms);
      }
      return () => {
        created.listeners.delete(cb);
        if (!created.listeners.size && created.timer) {
          clearInterval(created.timer);
          created.timer = undefined;
        }
      };
    },
    getSnapshot() {
      if (!created.value) created.value = Date.now();
      return created.value;
    },
  };
  tickers.set(ms, created);
  t = created;
  return t;
}

const serverSnapshot = () => 0;

/** Đồng hồ dùng chung: mỗi chu kỳ chỉ một setInterval cho mọi component. Trên server trả 0. */
export function useNow(intervalMs = 1000): number {
  const t = tickerFor(intervalMs);
  return useSyncExternalStore(t.subscribe, t.getSnapshot, serverSnapshot);
}
