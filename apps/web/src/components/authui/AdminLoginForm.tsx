"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AUTH_ERROR_TEXT, DEMO_USERS, authenticate } from "@/lib/mock/auth";
import { signInAs } from "@/lib/mock/useRole";
import styles from "./authui.module.css";

const DEMO_ADMIN = { identifier: "ops@vinstay.vn", password: "admin1234" };

export function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    const result = authenticate(identifier, password, "admin");
    if (!result.ok) {
      setError(AUTH_ERROR_TEXT[result.error]);
      return;
    }
    signInAs("admin");
    router.push(DEMO_USERS.admin.home);
    router.refresh();
  };

  const fillDemo = () => {
    setIdentifier(DEMO_ADMIN.identifier);
    setPassword(DEMO_ADMIN.password);
    setError(null);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {error && (
        <div className={styles.alert} role="alert">
          {error}
        </div>
      )}
      <Field label="Email công việc">
        <input
          className="input"
          type="email"
          autoComplete="username"
          value={identifier}
          aria-invalid={!!error}
          onChange={(e) => setIdentifier(e.target.value)}
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
          Dùng tài khoản thử
        </button>
      </p>
    </form>
  );
}
