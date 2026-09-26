"use client";

import { useRef } from "react";
import styles from "./OtpInput.module.css";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Ô nhập mã OTP 4 số: tự nhảy ô, dán được cả mã, Backspace lùi ô. */
export function OtpInput({ value, onChange, length = 4, error, disabled, autoFocus }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, ch: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[i] = ch || " ";
    onChange(chars.join("").replace(/ +$/, "").replace(/ /g, ""));
  };

  return (
    <div className={`${styles.row} ${error ? styles.error : ""}`} role="group" aria-label="Mã xác thực 4 số">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.box}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Chữ số ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!text) return;
            e.preventDefault();
            onChange(text);
            refs.current[Math.min(text.length, length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
