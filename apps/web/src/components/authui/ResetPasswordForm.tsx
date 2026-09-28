"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { toast } from "@/components/ui/Toast";
import styles from "./authui.module.css";

interface ResetPasswordFormProps {
  hasToken: boolean;
}

export function ResetPasswordForm({ hasToken }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!hasToken) {
    return (
      <div className={styles.form}>
        <div className={styles.alert} role="alert">
          Liên kết đặt lại đã hết hạn.
        </div>
        <Link href="/forgot-password" className="btn btn-primary btn-block">
          Gửi lại mã
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Mật khẩu cần ít nhất 8 ký tự.";
    if (confirm !== password) next.confirm = "Mật khẩu nhập lại không khớp.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    toast("Đã đổi mật khẩu", "success");
    router.push("/login");
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Field label="Mật khẩu mới" hint={errors.password ? undefined : "Ít nhất 8 ký tự."} error={errors.password}>
        <PasswordInput autoComplete="new-password" value={password} aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Nhập lại mật khẩu" error={errors.confirm}>
        <PasswordInput autoComplete="new-password" value={confirm} aria-invalid={!!errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
