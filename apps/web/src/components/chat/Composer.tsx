"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Lock, LogIn, Send } from "lucide-react";
import { SAMPLE_PROMPTS, sentenceFromCriteria, hasCriteria } from "@/lib/tenant/matchmaker";
import type { CriteriaState } from "@/lib/mock/types";
import { FilterTray } from "./FilterTray";
import styles from "./Composer.module.css";

interface ComposerProps {
  criteria: CriteriaState;
  onCriteria: (c: CriteriaState) => void;
  onSend: (text: string) => void;
  busy: boolean;
  /** Khách vãng lai đã hết lượt nhắn. */
  locked: boolean;
  guestNotice: boolean;
  variant: "hero" | "rail";
  showPrompts?: boolean;
  locale?: "vi" | "en";
  /** Điền sẵn nội dung (không tự gửi); nonce đổi ⇒ áp dụng lại. */
  prefill?: { text: string; nonce: number };
}

const HINT_INTERVAL_MS = 5000;

const SAMPLE_PROMPTS_EN = [
  "2 bedrooms in Sapphire 2 under 12 million",
  "Furnished studio with air conditioning",
  "High floor, budget up to 10 million",
];

export function Composer({ criteria, onCriteria, onSend, busy, locked, guestNotice, variant, showPrompts, locale = "vi", prefill }: ComposerProps) {
  const [text, setText] = useState("");
  const [seenNonce, setSeenNonce] = useState(prefill?.nonce ?? 0);
  // Nhận prefill mới ngay trong lúc render (không cần effect) — chỉ điền, không gửi.
  if (prefill && prefill.nonce !== seenNonce) {
    setSeenNonce(prefill.nonce);
    setText(prefill.text);
  }
  const area = useRef<HTMLTextAreaElement>(null);
  const filtered = hasCriteria(criteria);

  // Placeholder hero tự đổi mỗi 5 giây theo cùng bộ câu với thẻ gợi ý; dừng khi đang gõ hoặc đang xử lý.
  const prompts = locale === "en" ? SAMPLE_PROMPTS_EN : SAMPLE_PROMPTS;
  const [hintIndex, setHintIndex] = useState(0);
  const rotating = variant === "hero" && !locked && !text && !busy;
  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setHintIndex((value) => value + 1), HINT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [rotating]);
  const hint = prompts[hintIndex % prompts.length];

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const prefillNonce = prefill?.nonce;
  useEffect(() => {
    if (prefillNonce && area.current) grow(area.current);
  }, [prefillNonce]);

  const submit = (value?: string) => {
    const body = (value ?? text).trim() || (filtered ? sentenceFromCriteria(criteria) : "");
    if (!body || busy || locked) return;
    onSend(body);
    setText("");
    if (area.current) area.current.style.height = "auto";
  };

  if (locked) {
    return (
      <div className={styles.lock}>
        <span className={styles.lockIcon}>
          <Lock size={18} />
        </span>
        <div>
          <strong>{locale === "en" ? "You have used your free message" : "Bạn đã dùng lượt nhắn miễn phí"}</strong>
          <p className="muted small">{locale === "en" ? "Sign in to keep chatting with VinStay AI. You can still browse homes, change filters, and request a viewing without an account." : "Đăng nhập để chat không giới hạn với VinStay AI. Xem căn, đổi bộ lọc và đặt lịch vẫn dùng được mà không cần tài khoản."}</p>
          <Link href="/login?as=tenant" className="btn btn-primary btn-sm">
            <LogIn size={15} /> {locale === "en" ? "Sign in to continue" : "Đăng nhập để tiếp tục"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${variant === "hero" ? styles.hero : ""}`}>
      <div className={styles.shell}>
        <div className={styles.inputRow}>
        <label htmlFor={`composer-${variant}`} className="sr-only">
          Nhập yêu cầu tìm căn
        </label>
        <div className={styles.areaWrap}>
        {variant === "hero" && !text && (
          <span className={styles.hint} aria-hidden="true">
            <span key={hint} className={styles.hintText}>{hint}</span>
          </span>
        )}
        <textarea
          id={`composer-${variant}`}
          ref={area}
          className={styles.area}
          rows={1}
          placeholder={variant === "hero" ? "" : (locale === "en" ? "Ask a follow-up or adjust your search…" : "Hỏi tiếp hoặc chỉnh yêu cầu…")}
          value={text}
          disabled={busy}
          onChange={(e) => {
            setText(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        </div>
        <button type="button" className={`${styles.send} ${text.trim() || filtered ? styles.ready : ""}`} disabled={busy || (!text.trim() && !filtered)} onClick={() => submit()} aria-label={text.trim() ? "Gửi tin nhắn" : "Tìm căn theo bộ lọc"}>
          <Send size={18} />
        </button>
        </div>
        {showPrompts && (
          <div className={styles.prompts} aria-label={locale === "en" ? "Suggested questions" : "Gợi ý câu hỏi"}>
            {(locale === "en" ? SAMPLE_PROMPTS_EN : SAMPLE_PROMPTS).map((p) => (
              <button key={p} type="button" className={styles.prompt} onClick={() => submit(p)} disabled={busy}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.filterRow}>
        <FilterTray criteria={criteria} onChange={onCriteria} compact locale={locale} />
      </div>
      {variant === "hero" && filtered && <p className={`muted xs ${styles.footHint}`}>{locale === "en" ? "Send to search with these filters, or add more details." : "Bấm mũi tên để tìm theo bộ lọc, hoặc gõ thêm ý bạn muốn."}</p>}

      {guestNotice && <p className={`muted xs ${styles.guest}`}>{locale === "en" ? "Guests can send one message. Sign in for unlimited chat." : "Khách chưa đăng nhập được nhắn 1 lần. Đăng nhập để chat không giới hạn."}</p>}
    </div>
  );
}
