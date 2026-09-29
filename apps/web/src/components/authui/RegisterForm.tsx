"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { postLoginTarget, type Role } from "@/lib/mock/auth";
import { fmtPhone } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import { signInAs, useRole } from "@/lib/mock/useRole";
import styles from "./authui.module.css";

interface RegisterFormProps {
  initialRole?: "landlord" | "tenant";
  next?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({ initialRole, next }: RegisterFormProps) {
  const router = useRouter();
  const currentRole = useRole();
  const state = useMock();
  const [role, setRole] = useState<Extract<Role, "tenant" | "landlord">>(initialRole ?? "tenant");
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? (role === "tenant" ? (state.tenantProfile?.name ?? "") : "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentRole) {
      router.replace(postLoginTarget(currentRole, next));
    }
  }, [currentRole, next, router]);

  if (currentRole) return null;

  const goHome = (r: Role) => {
    signInAs(r);
    router.push(postLoginTarget(r, next));
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
        <input className="input" autoComplete="name" value={name} aria-invalid={!!errors.name} onChange={(e) => setTypedName(e.target.value)} />
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
      {role === "tenant" && state.tenantProfile?.phone && (
        <Field label="Số điện thoại" hint="Đã xác thực qua Zalo">
          <input
            className="input"
            readOnly
            disabled
            value={fmtPhone(state.tenantProfile.phone)}
            style={{ background: "var(--surface-hover, #f8fafc)", cursor: "not-allowed" }}
          />
        </Field>
      )}
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
