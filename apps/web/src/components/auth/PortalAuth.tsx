"use client";

import { useState } from "react";
import { PORTAL_HOME, hostHome, type HostRoleCode, type Portal, type SessionUser } from "@/lib/auth/portals";
import { hintDisplayName, useGoogleHint } from "@/lib/auth/googleHint";
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
  const canSignup = allowSignup ?? portal !== "admin";
  const canGoogle = portal !== "admin"; // Admin chỉ đăng nhập email + mật khẩu

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? errorMessage(initialError) : null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [loading, setLoading] = useState(false);
  const googleHint = useGoogleHint();

  function enter(roles?: HostRoleCode[]) {
    // Tải lại toàn trang: cookie phiên mới + store phiên ở client + router cache đều được làm mới đồng bộ.
    // `router.push` rồi `router.refresh()` liền nhau có thể bị chồng lệnh (proxy chờ backend trả phiên) khiến UI kẹt ở trang đăng nhập.
    window.location.assign(next ?? (portal === "host" ? hostHome(roles ?? []) : PORTAL_HOME[portal]));
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
      enter(data.user?.hostRoles);
      return;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Máy chủ đăng nhập phản hồi quá lâu. Kiểm tra backend rồi thử lại.");
      } else {
        setError("Không kết nối được máy chủ đăng nhập. Kiểm tra backend đang chạy rồi thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className={styles.cardHeading}>
        {mode === "login" ? `Đăng nhập ${label}` : `Đăng ký ${label}`}
      </h1>

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
          {loading ? (mode === "login" ? "Đang đăng nhập…" : "Đang tạo tài khoản…") : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
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
