"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface AssistantApi {
  /** Cuộn #assistant vào giữa khung nhìn rồi focus #composer-hero (preventScroll). Đã ở workspace ⇒ focus #composer-rail, không cuộn. */
  focusAssistant(options?: { prefill?: string }): void;
  /** true khi #assistant giao khung nhìn ≥ 25%. SSR / chưa đo ⇒ true (nút nổi không nháy). */
  assistantVisible: boolean;
}

/** Phần nội bộ giữa Provider và ChatExperience — không thuộc contract công khai. */
interface AssistantInternal extends AssistantApi {
  registerAssistant(el: HTMLElement | null): void;
  prefill: { text: string; nonce: number } | undefined;
}

const AssistantContext = createContext<AssistantInternal | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [assistantVisible, setVisible] = useState(true);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number }>();
  const observer = useRef<IntersectionObserver | null>(null);
  const nonce = useRef(0);

  /** ChatExperience gắn/gỡ section#assistant (gỡ khi sang workspace, gắn lại khi "Làm mới"). */
  const registerAssistant = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) {
      // Không có #assistant (workspace đã tìm): nút nổi không cần hiện.
      setVisible(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(false);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setVisible(last.isIntersecting && last.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25, 0.5, 1] });
    io.observe(el);
    observer.current = io;
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  const focusAssistant = useCallback((options?: { prefill?: string }) => {
    if (typeof document === "undefined") return;
    if (options?.prefill !== undefined) {
      nonce.current += 1;
      setPrefill({ text: options.prefill, nonce: nonce.current });
    }
    const section = document.getElementById("assistant");
    const hero = document.getElementById("composer-hero") as HTMLTextAreaElement | null;
    if (!section && !hero) {
      const rail = document.getElementById("composer-rail") as HTMLTextAreaElement | null;
      if (rail && !rail.disabled) rail.focus();
      return;
    }
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    if (hero && !hero.disabled) hero.focus({ preventScroll: true });
  }, []);

  const value = useMemo<AssistantInternal>(
    () => ({ focusAssistant, assistantVisible, registerAssistant, prefill }),
    [focusAssistant, assistantVisible, registerAssistant, prefill],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant outside AssistantProvider");
  return ctx;
}

export function useOptionalAssistant(): AssistantApi | null {
  return useContext(AssistantContext);
}

/** Dùng riêng cho ChatExperience: đăng ký #assistant và đọc prefill. Ngoài Provider ⇒ null. */
export function useAssistantInternal(): AssistantInternal | null {
  return useContext(AssistantContext);
}
