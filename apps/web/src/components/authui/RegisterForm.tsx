"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { DEMO_USERS, type Role } from "@/lib/mock/auth";
import { signInAs, useRole } from "@/lib/mock/useRole";
import styles from "./authui.module.css";

interface RegisterFormProps {
  initialRole?: "landlord" | "tenant";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({ initialRole }: RegisterFormProps) {
  const router = useRouter();
  const currentRole = useRole();
  const [role, setRole] = useState<Extract<Role, "tenant" | "landlord">>(initialRole ?? "tenant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentRole) {
      router.replace(DEMO_USERS[currentRole].home);
    }
  }, [currentRole, router]);

  if (currentRole) return null;

  const goHome = (r: Role) => {
    signInAs(r);
    router.push(DEMO_USERS[r].home);
    router.refresh();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Nhập họ tên.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Nhập email hợp lệ.";
    if (password.length < 8) next.password = "Mật khẩu cần ít nhất 8 ký tự.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    goHome(role);
  };

  const onGoogle = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    goHome(role);
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.segmented} role="radiogroup" aria-label="Bạn là">
        <button
          type="button"
          role="radio"
          aria-checked={role === "tenant"}
          className={`${styles.segmentBtn} ${role === "tenant" ? styles.segmentBtnActive : ""}`}
          onClick={() => setRole("tenant")}
        >
          Tôi thuê nhà
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={role === "landlord"}
          className={`${styles.segmentBtn} ${role === "landlord" ? styles.segmentBtnActive : ""}`}
          onClick={() => setRole("landlord")}
        >
          Tôi cho thuê nhà
        </button>
      </div>
      <Field label="Họ tên" error={errors.name}>
        <input className="input" autoComplete="name" value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={!!errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Mật khẩu" hint={errors.password ? undefined : "Ít nhất 8 ký tự."} error={errors.password}>
        <PasswordInput autoComplete="new-password" value={password} aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </button>
      <div className={styles.dividerRow}>hoặc</div>
      <button type="button" className={`btn btn-quiet btn-block ${styles.googleBtn}`} onClick={onGoogle} disabled={submitting}>
        <GoogleMark /> Đăng ký với Google
      </button>
    </form>
  );
}
