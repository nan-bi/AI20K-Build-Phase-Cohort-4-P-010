"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./InfoTip.module.css";

interface InfoTipProps {
  /** Nhãn đọc cho trình đọc màn hình, vd "Giải thích tiền cọc bảo đảm". */
  label: string;
  children: ReactNode;
}

/** Dấu "!" nhỏ cạnh nhãn; rê chuột, focus hoặc bấm để xem giải thích. Esc hoặc bấm ra ngoài để đóng. */
export function InfoTip({ label, children }: InfoTipProps) {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const open = pinned || hover;

  useEffect(() => {
    if (!pinned) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [pinned]);

  return (
    <span ref={root} className={styles.root} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        className={styles.btn}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setPinned((p) => !p)}
      >
        !
      </button>
      {open && (
        <span id={id} role="tooltip" className={styles.tip}>
          {children}
        </span>
      )}
    </span>
  );
}
