"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Ô mật khẩu với nút hiện/ẩn; dùng bên trong `Field`. */
export function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.wrap}>
      <input {...props} type={show ? "text" : "password"} className={`input ${styles.input}`} />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
