"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GoogleMark } from "./GoogleMark";
import { RfidVerifyStep } from "./RfidVerifyStep";
import { GoogleAccountChooser, type GoogleAccount } from "./GoogleAccountChooser";
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
  const canGoogle = true; // Cho phép đăng nhập bằng Google trên tất cả các vai trò

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? errorMessage(initialError) : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingRfid, setPendingRfid] = useState<string | null>(null);
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [boundPortalTarget, setBoundPortalTarget] = useState<string | null>(null);

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

    // 1. Nếu Supabase đã cấu hình OAuth, kích hoạt trực tiếp Google OAuth với select_account
    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: callbackUrl(),
            queryParams: {
              prompt: "select_account",
              access_type: "offline",
            },
          },
        });
        if (!error) return; // Google OAuth redirect đang diễn ra
      } catch (err) {
        console.warn("Supabase Google OAuth fallback to Account Chooser:", err);
      }
    }

    // 2. Chế độ tiện ích: Mở bảng chọn tài khoản Google đã lưu trên máy
    setLoading(false);
    setShowGoogleChooser(true);
  }

  const handleGoogleAccountSelect = async (account: GoogleAccount) => {
    setShowGoogleChooser(false);
    setLoading(true);
    setError(null);
    setBoundPortalTarget(null);
    try {
      const { ok, data } = await postJson("/api/auth/login", {
        email: account.email,
        fullName: account.name,
        portal,
        provider: "google",
      });
      if (ok) {
        return enter();
      }
      if (data?.boundRole) {
        setBoundPortalTarget(data.boundRole);
      }
      setError(data?.message || errorMessage(data?.error ?? "oauth_failed"));
    } catch {
      setError("Đăng nhập bằng Google thất bại");
    } finally {
      setLoading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBoundPortalTarget(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { ok, data } = await postJson("/api/auth/login", { email, password, portal });
        if (!ok) {
          if (data?.boundRole) setBoundPortalTarget(data.boundRole);
          return setError(data?.message || errorMessage(data?.error));
        }
        if (portal === "host" && data.needsRfidVerification) return setPendingRfid(data.hostId);
        return enter();
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl(), data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          const { ok, data: body } = await postJson("/api/auth/complete", { portal });
          if (!ok) return setError(errorMessage(body.error));
          if (portal === "host" && body.needsRfidVerification) return setPendingRfid(body.hostId);
          return enter();
        }
        setNotice(`Đã gửi email xác nhận tới ${email}. Bấm vào liên kết trong email để hoàn tất đăng ký.`);
      } catch (err: unknown) {
        // Dev fallback if Supabase is offline or mock
        const { ok, data } = await postJson("/api/auth/login", { email, password, portal });
        if (ok) return enter();
        const msg = err instanceof Error ? err.message : "Đăng ký thất bại";
        setError(errorMessage(data?.error ?? msg));
      }
    } finally {
      setLoading(false);
    }
  }

  const handleQuickDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail =
        portal === "tenant"
          ? "khachthue.demo@vinstay.vn"
          : portal === "landlord"
          ? "chunha.oceanpark@vinstay.vn"
          : portal === "host"
          ? "host.s218@vinstay.vn"
          : "admin@vinstay.vn";
      await postJson("/api/auth/login", {
        email: demoEmail,
        password: "vinstay-demo-pass",
        portal,
      });
      enter();
    } catch {
      setError("Không thể khởi tạo phiên demo");
    } finally {
      setLoading(false);
    }
  };

  if (pendingRfid) {
    return <RfidVerifyStep hostId={pendingRfid} onDone={enter} />;
  }

  return (
    <>
      <h1 className={styles.cardHeading}>
        {mode === "login" ? `Đăng nhập ${label}` : `Đăng ký ${label}`}
      </h1>

      {/* Quick Demo 1-Click Login Card */}
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
        <div style={{ margin: "14px 0" }}>
          <p className={styles.errorBanner} role="alert" style={{ marginBottom: boundPortalTarget ? 10 : 0 }}>
            {error}
          </p>
          {boundPortalTarget && (
            <button
              type="button"
              onClick={() => {
                const targetUrl =
                  boundPortalTarget === "host"
                    ? "/admin/login?tab=host"
                    : boundPortalTarget === "admin"
                    ? "/admin/login?tab=admin"
                    : `/login?tab=${boundPortalTarget}`;
                router.push(targetUrl);
                setError(null);
                setBoundPortalTarget(null);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              }}
            >
              👉 Bấm để chuyển ngay sang Cổng {boundPortalTarget === "landlord" ? "Chủ nhà" : boundPortalTarget === "tenant" ? "Khách thuê" : boundPortalTarget}
            </button>
          )}
        </div>
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

      {showGoogleChooser && (
        <GoogleAccountChooser
          portal={portal}
          portalLabel={label}
          onSelect={handleGoogleAccountSelect}
          onClose={() => setShowGoogleChooser(false)}
        />
      )}
    </>
  );
}
