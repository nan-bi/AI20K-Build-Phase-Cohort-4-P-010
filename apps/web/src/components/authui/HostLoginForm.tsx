"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AUTH_ERROR_TEXT, DEMO_USERS, authenticate } from "@/lib/mock/auth";
import { signInAs } from "@/lib/mock/useRole";
import styles from "./authui.module.css";

const RFID_KEY = "vs_rfid_ok";
const RFID_CODE = "VS-0412";

function hasVerifiedRfid(): boolean {
  try {
    return localStorage.getItem(RFID_KEY) === "1";
  } catch {
    return false;
  }
}

function markRfidVerified() {
  try {
    localStorage.setItem(RFID_KEY, "1");
  } catch {
    // localStorage không khả dụng (chế độ ẩn danh) — bỏ qua, sẽ hỏi lại lần sau.
  }
}

const DEMO_HOST = { phone: "0934556201", password: "demo1234" };

export function HostLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsRfid, setNeedsRfid] = useState(false);

  const [rfid, setRfid] = useState("");
  const [rfidError, setRfidError] = useState<string | null>(null);

  const fillDemo = () => {
    setPhone(DEMO_HOST.phone);
    setPassword(DEMO_HOST.password);
    setError(null);
  };

  const fillDemoRfid = () => {
    setRfid(RFID_CODE);
    setRfidError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    const result = authenticate(phone, password, "host");
    if (!result.ok) {
      setError(AUTH_ERROR_TEXT[result.error]);
      return;
    }
    if (!hasVerifiedRfid()) {
      setNeedsRfid(true);
      return;
    }
    signInAs("host");
    router.push(DEMO_USERS.host.home);
    router.refresh();
  };

  const onVerifyRfid = (e: FormEvent) => {
    e.preventDefault();
    if (rfid.trim().toUpperCase() !== RFID_CODE) {
      setRfidError("Số thẻ không khớp hồ sơ Admin đã cấp.");
      return;
    }
    setRfidError(null);
    markRfidVerified();
    signInAs("host");
    router.push(DEMO_USERS.host.home);
    router.refresh();
  };

  if (needsRfid) {
    return (
      <form className={styles.form} onSubmit={onVerifyRfid} noValidate>
        <p className={`small ${styles.stepLabel}`}>Xác minh thẻ cư dân</p>
        {rfidError && (
          <div className={styles.alert} role="alert">
            {rfidError}
          </div>
        )}
        <Field label="Số thẻ RFID" hint="Nhập số in trên thẻ thang máy do Ban quản lý cấp. Chỉ cần làm lần đầu." error={rfidError ?? undefined}>
          <input className="input" placeholder="VS-0000" value={rfid} aria-invalid={!!rfidError} onChange={(e) => setRfid(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block">
          Xác nhận
        </button>
        <p className={`small ${styles.demoNote}`}>
          <button type="button" className={styles.demoFillBtn} onClick={fillDemoRfid}>
            Điền mã thẻ mẫu ({RFID_CODE})
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error && (
        <div className={styles.alert} role="alert">
          {error}
        </div>
      )}
      <Field label="Số điện thoại">
        <input
          className="input"
          inputMode="numeric"
          autoComplete="username"
          value={phone}
          aria-invalid={!!error}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field label="Mật khẩu">
        <PasswordInput autoComplete="current-password" value={password} aria-invalid={!!error} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
      <p className={`small ${styles.demoNote}`}>
        <button type="button" className={styles.demoFillBtn} onClick={fillDemo}>
          Dùng tài khoản thử (Lê Quốc Bảo · 0934 556 201)
        </button>
      </p>
    </form>
  );
}
