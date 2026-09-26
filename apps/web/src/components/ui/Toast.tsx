"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, Info } from "lucide-react";
import styles from "./Toast.module.css";

interface ToastItem {
  id: number;
  text: string;
  tone: "info" | "success";
}

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, tone: ToastItem["tone"] = "info") {
  const id = ++seq;
  items = [...items, { id, text, tone }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 3600);
}

const EMPTY: ToastItem[] = [];

export function ToastHost() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => items,
    () => EMPTY,
  );
  return (
    <div className={styles.host} role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.tone === "success" ? styles.success : ""}`}>
          {t.tone === "success" ? <CheckCircle2 size={18} /> : <Info size={18} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
