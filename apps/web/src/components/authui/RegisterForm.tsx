"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { authApi } from "@/lib/apiClient";
import { postLoginTarget, type Role } from "@/lib/mock/auth";
import { fmtPhone } from "@/lib/mock/format";
import { setTenantProfile } from "@/lib/mock/actions";
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

  const googleLoginPrompt = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSubmitting(true);
      try {
        if (tokenResponse?.access_token) {
          const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }).catch(() => null);
          if (userRes && userRes.ok) {
            const userInfo = await userRes.json();
            if (role === "tenant" && userInfo?.name) {
              setTenantProfile({
                name: userInfo.name,
                phone: state.tenantProfile?.phone || "0912345678",
              });
            }
          }
        }
      } catch {
        // Fallback
      }
      try {
        await authApi.demoLogin(role).catch(() => null);
      } catch {
        // Backend offline
      }
      setSubmitting(false);
      goHome(role);
    },
    onError: () => {
      if (role === "tenant" && name.trim()) {
        setTenantProfile({ name: name.trim(), phone: state.tenantProfile?.phone || "0912345678" });
      }
      setSubmitting(false);
      goHome(role);
    },
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = "Nhập họ tên.";
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = "Nhập email hợp lệ.";
    if (password.length < 8) nextErrors.password = "Mật khẩu cần ít nhất 8 ký tự.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);

    try {
      await authApi.signup({ email, password, fullName: name, portal: role }).catch(() => null);
    } catch {
      // Offline fallback
    }

    if (role === "tenant") {
      setTenantProfile({ name: name.trim(), phone: state.tenantProfile?.phone || "0912345678" });
    }

    setSubmitting(false);
    goHome(role);
  };

  const onGoogle = () => {
    googleLoginPrompt();
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
