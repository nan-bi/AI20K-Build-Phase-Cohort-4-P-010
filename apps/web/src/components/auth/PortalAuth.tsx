"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GoogleMark } from "./GoogleMark";
import { RfidVerifyStep } from "./RfidVerifyStep";
import { errorMessage, postJson } from "./authApi";
import styles from "./auth.module.css";

export type Portal = "tenant" | "landlord" | "host" | "admin";

const HOME: Record<Portal, string> = {
  tenant: "/",
  landlord: "/landlord/dashboard",
  host: "/host/dispatch",
  admin: "/admin/dashboard",
};

interface PortalAuthProps {
  portal: Portal;
  label: string;
  initialError?: string | null;
}

/**
 * Login (+ signup where allowed) for one role, by Google or email + password.
 * Admin is email + password only and cannot sign up.
 * Host (on first login) must verify their RFID card number.
 */
export function PortalAuth({ portal, label, initialError }: PortalAuthProps) {
  const router = useRouter();
  const canSignup = portal !== "admin";
  const canGoogle = portal !== "admin";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? errorMessage(initialError) : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingRfid, setPendingRfid] = useState<string | null>(null);

  const callbackUrl = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    return `${appUrl}/auth/callback?portal=${portal}`;
  };

  function enter() {
    router.push(HOME[portal]);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setLoading(false);
      setError(errorMessage("oauth_failed"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { ok, data } = await postJson("/api/auth/login", { email, password, portal });
        if (!ok) return setError(errorMessage(data.error));
        if (portal === "host" && data.needsRfidVerification) return setPendingRfid(data.hostId);
        return enter();
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl(), data: { full_name: fullName } },
      });
      if (error) return setError(error.message);
      if (data.session) {
        const { ok, data: body } = await postJson("/api/auth/complete", { portal });
        if (!ok) return setError(errorMessage(body.error));
        if (portal === "host" && body.needsRfidVerification) return setPendingRfid(body.hostId);
        return enter();
      }
      setNotice(`Đã gửi email xác nhận tới ${email}. Bấm vào liên kết trong email để hoàn tất đăng ký.`);
    } finally {
      setLoading(false);
    }
  }

  if (pendingRfid) {
    return <RfidVerifyStep hostId={pendingRfid} onDone={enter} />;
  }

  return (
    <>
      <h1 className={styles.cardHeading}>
        {mode === "login" ? `Đăng nhập ${label}` : `Đăng ký ${label}`}
      </h1>

      {canGoogle && (
        <>
          <button type="button" className={styles.googleButton} onClick={handleGoogle} disabled={loading}>
            <GoogleMark />
            {mode === "login" ? "Đăng nhập với Google" : "Đăng ký với Google"}
          </button>
          <p className={styles.divider}>hoặc dùng email</p>
        </>
      )}

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label className={styles.field}>
            Họ và tên
            <input
              className={styles.input}
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}
        <label className={styles.field}>
          Email
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Mật khẩu{mode === "signup" ? " (tối thiểu 8 ký tự)" : ""}
          <input
            className={styles.input}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.primaryButton} disabled={loading}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}

      {canSignup && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      )}
    </>
  );
}
