"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PORTAL_HOME, hostHome, type HostRoleCode, type Portal, type SessionUser } from "@/lib/auth/portals";
import { hintDisplayName, useGoogleHint } from "@/lib/auth/googleHint";
import { refreshSession } from "@/lib/auth/client";
import { GoogleMark } from "./GoogleMark";
import { API_BASE, errorMessage, postJson } from "./authApi";
import styles from "./auth.module.css";

export type { Portal };

interface PortalAuthProps {
  portal: Portal;
  label: string;
  initialError?: string | null;
  initialNotice?: string | null;
  /** Trang quay lại sau khi đăng nhập (đã qua safeNext). */
  next?: string;
  /** Mặc định theo cổng (khách thuê/chủ nhà tự đăng ký); tab Field Host/Admin truyền `false`. */
  allowSignup?: boolean;
}

interface LoginData {
  user?: Pick<SessionUser, "hostRoles">;
}

/**
 * Login (+ signup where allowed) for one role, by Google or email + password.
 * Admin is email + password only and cannot sign up.
 * Field Host: Admin creates the account, so login only.
 */
export function PortalAuth({ portal, label, initialError, initialNotice, next, allowSignup }: PortalAuthProps) {
  const router = useRouter();
  const canSignup = allowSignup ?? portal !== "admin";
  const canGoogle = portal !== "admin"; // Admin chỉ đăng nhập email + mật khẩu
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? errorMessage(initialError) : null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [loading, setLoading] = useState(false);
  const googleHint = useGoogleHint();

  async function enter(roles?: HostRoleCode[]) {
    // Store phiên ở client chỉ tự tải 1 lần mỗi lần mở trang; không đọc lại ở đây thì header vẫn "chưa đăng nhập".
    await refreshSession();
    router.push(next ?? (portal === "host" ? hostHome(roles ?? []) : PORTAL_HOME[portal]));
    router.refresh();
  }

  // Google chạy hoàn toàn ở backend (PKCE): điều hướng trình duyệt, không dùng fetch.
  // `loginHint` = email Google đã dùng trước đó → Google chọn sẵn đúng tài khoản đó.
  function handleGoogle(loginHint?: string) {
    setError(null);
    setLoading(true);
    const hint = loginHint ? `&login_hint=${encodeURIComponent(loginHint)}` : "";
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- /api/v1 là backend (rewrite), không phải trang Next
    window.location.assign(`${API_BASE}/auth/google?portal=${portal}${hint}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login" ? { email, password, portal } : { email, password, fullName, portal };
      const { ok, data, code } = await postJson<LoginData>(path, body);
      if (!ok) return setError(errorMessage(code));
      return enter(data.user?.hostRoles);
    } finally {
      setLoading(false);
    }
  }

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data, code } = await postJson<LoginData>("/auth/demo-login", { portal });
      if (!ok) return setError(errorMessage(code));
      enter(data.user?.hostRoles);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.cardHeading}>
        {mode === "login" ? `Đăng nhập ${label}` : `Đăng ký ${label}`}
      </h1>

      {demoEnabled && (
      <div
        style={{
          margin: "0 0 16px 0",
          padding: "12px 14px",
          background: "linear-gradient(135deg, rgba(214,154,70,0.12) 0%, rgba(20,48,58,0.06) 100%)",
          border: "1px solid rgba(214,154,70,0.35)",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-ink)", letterSpacing: "0.03em" }}>
            ⚡ TRẢI NGHIỆM NHANH (1-CLICK DEMO)
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 10, lineHeight: 1.4 }}>
          Thử nghiệm ngay giao diện {label} mà không cần đăng ký tài khoản mới:
        </p>
        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          style={{
            width: "100%",
            padding: "9px 14px",
            background: "var(--accent)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            boxShadow: "0 2px 6px rgba(214,154,70,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {portal === "tenant" && "👉 Vào ngay vai Khách thuê (AI Matchmaker)"}
          {portal === "landlord" && "👉 Vào ngay Dashboard Chủ nhà (4 Tenets)"}
          {portal === "host" && "👉 Vào ngay Dashboard Field Host (SLA 3m)"}
          {portal === "admin" && "👉 Vào ngay Dashboard Quản trị (BI & SLA)"}
        </button>
      </div>
      )}

      {canGoogle && (
        <>
          {googleHint ? (
            <>
              <button
                type="button"
                className={`${styles.googleButton} ${styles.googleAccount}`}
                onClick={() => handleGoogle(googleHint.email)}
                disabled={loading}
              >
                <GoogleMark />
                <span className={styles.googleAccountText}>
                  <span className={styles.googleAccountName}>Tiếp tục bằng tên {hintDisplayName(googleHint)}</span>
                  <span className={styles.googleAccountEmail}>{googleHint.email}</span>
                </span>
              </button>
              <button type="button" className={styles.linkButton} onClick={() => handleGoogle()} disabled={loading}>
                Dùng tài khoản Google khác
              </button>
            </>
          ) : (
            <button type="button" className={styles.googleButton} onClick={() => handleGoogle()} disabled={loading}>
              <GoogleMark />
              {mode === "login" ? "Đăng nhập với Google" : "Đăng ký với Google"}
            </button>
          )}
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
        <p className={styles.errorBanner} role="alert" style={{ margin: "14px 0" }}>
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
