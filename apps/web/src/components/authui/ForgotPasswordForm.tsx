"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/ui/OtpInput";
import { toast } from "@/components/ui/Toast";
import styles from "./authui.module.css";

function genOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [expected, setExpected] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Nhập email hoặc số điện thoại đã đăng ký.");
      return;
    }
    setError(null);
    const code = genOtp();
    setExpected(code);
    setOtp("");
    toast(`Mã Zalo mô phỏng: ${code}`);
    setSent(true);
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    if (otp !== expected) {
      setError("Mã xác thực không đúng. Kiểm tra lại hoặc gửi lại mã.");
      return;
    }
    router.push("/reset-password?token=mock");
  };

  if (sent) {
    return (
      <form className={styles.form} onSubmit={onVerify} noValidate>
        {error && (
          <div className={styles.alert} role="alert">
            {error}
          </div>
        )}
        <div className={styles.otpRow}>
          <p className="muted small">Nhập mã 4 số gửi qua Zalo để tiếp tục.</p>
          <OtpInput value={otp} onChange={setOtp} error={!!error} autoFocus />
          <button type="button" className={styles.resendLink} onClick={onSend}>
            Gửi lại mã
          </button>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting || otp.length < 4}>
          {submitting ? "Đang xác nhận…" : "Xác nhận"}
        </button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSend} noValidate>
      {error && (
        <div className={styles.alert} role="alert">
          {error}
        </div>
      )}
      <div className="field">
        <span className="label">Email hoặc số điện thoại</span>
        <input
          className="input"
          autoComplete="username"
          value={identifier}
          aria-invalid={!!error}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        Gửi mã
      </button>
      <p className="small muted">
        Nhớ mật khẩu rồi? <Link href="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}
