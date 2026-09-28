"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Lock, LogIn, Send } from "lucide-react";
import { SAMPLE_PROMPTS, sentenceFromCriteria, hasCriteria } from "@/lib/mock/matchmaker";
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
}

export function Composer({ criteria, onCriteria, onSend, busy, locked, guestNotice, variant, showPrompts }: ComposerProps) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const filtered = hasCriteria(criteria);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

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
          <strong>Bạn đã dùng lượt nhắn miễn phí</strong>
          <p className="muted small">Đăng nhập để chat không giới hạn với VinStay AI. Xem căn, đổi bộ lọc và đặt lịch vẫn dùng được mà không cần tài khoản.</p>
          <Link href="/login?as=tenant" className="btn btn-primary btn-sm">
            <LogIn size={15} /> Đăng nhập để tiếp tục
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.shell}>
        <label htmlFor={`composer-${variant}`} className="sr-only">
          Nhập yêu cầu tìm căn
        </label>
        <textarea
          id={`composer-${variant}`}
          ref={area}
          className={styles.area}
          rows={1}
          placeholder={variant === "hero" ? "Ví dụ: Studio dưới 8 triệu, có điều hòa, gần VinUni…" : "Hỏi tiếp hoặc chỉnh yêu cầu…"}
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
        <button type="button" className={`${styles.send} ${text.trim() || filtered ? styles.ready : ""}`} disabled={busy || (!text.trim() && !filtered)} onClick={() => submit()} aria-label={text.trim() ? "Gửi tin nhắn" : "Tìm căn theo bộ lọc"}>
          <Send size={18} />
        </button>
      </div>

      <div className={styles.filterRow}>
        <FilterTray criteria={criteria} onChange={onCriteria} compact />
      </div>
      {variant === "hero" && filtered && <p className={`muted xs ${styles.footHint}`}>Bấm mũi tên để tìm theo bộ lọc, hoặc gõ thêm ý bạn muốn.</p>}

      {showPrompts && (
        <div className={styles.prompts}>
          {SAMPLE_PROMPTS.map((p) => (
            <button key={p} type="button" className={styles.prompt} onClick={() => submit(p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>
      )}
      {guestNotice && <p className={`muted xs ${styles.guest}`}>Khách chưa đăng nhập được nhắn 1 lần. Đăng nhập để chat không giới hạn.</p>}
    </div>
  );
}
