"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AUTH_ERROR_TEXT, ROLE_LABEL, authenticate, loginUrl, postLoginTarget, type AuthError, type Role } from "@/lib/mock/auth";
import { signInAs, useRole } from "@/lib/mock/useRole";
import { PortalTabs } from "./PortalTabs";
import styles from "./authui.module.css";

type PortalTab = "tenant" | "landlord";

interface LoginFormProps {
  next?: string;
  /** Hỗ trợ `?as=` cũ: chuyển thẳng sang cổng Field Host/Admin, giữ `next`. */
  as?: string;
  initialTab?: PortalTab;
}

function resolveError(error: AuthError, identifier: string, password: string): ReactNode {
  if (error !== "wrong_portal") return AUTH_ERROR_TEXT[error];
  const isHost = authenticate(identifier, password, "host").ok;
  return isHost ? (
    <span>
      Tài khoản này dùng cổng Field Host. Đăng nhập tại <Link href="/admin/login">/admin/login</Link> (tab Sale).
    </span>
  ) : (
    <span>
      Tài khoản này dùng cổng quản trị. Đăng nhập tại <Link href="/admin/login">/admin/login</Link>.
    </span>
  );
}

const DEMO_TENANT = { identifier: "minhanh@vinstay.demo", password: "demo1234" };
const DEMO_LANDLORD = { identifier: "hung.nguyen@vinstay.demo", password: "demo1234" };

export function LoginForm({ next, as, initialTab }: LoginFormProps) {
  const router = useRouter();
  const currentRole = useRole();
  const redirectingToOtherPortal = as === "host" || as === "admin";

  const goHome = (role: Role) => {
    router.push(postLoginTarget(role, next));
    router.refresh();
  };

  useEffect(() => {
    if (redirectingToOtherPortal) {
      router.replace(loginUrl(as as Role, next));
      return;
    }
    if (currentRole) goHome(currentRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectingToOtherPortal, as, next, currentRole, router]);

  const [tab, setTab] = useState<PortalTab>(initialTab ?? "tenant");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReactNode | null>(null);

  if (redirectingToOtherPortal || currentRole) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    const result = authenticate(identifier, password, "public");
    if (!result.ok) {
      setSubmitting(false);
      setError(resolveError(result.error, identifier, password));
      return;
    }
    if (result.role !== tab) {
      setSubmitting(false);
      setError(`Tài khoản này là ${ROLE_LABEL[result.role]}. Chuyển sang tab “${ROLE_LABEL[result.role]}” để đăng nhập.`);
      return;
    }
    signInAs(result.role);
    goHome(result.role);
  };

  const onGoogle = async () => {
    setError(null);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    signInAs(tab);
    goHome(tab);
  };

  const fillDemo = (role: "tenant" | "landlord") => {
    const cred = role === "tenant" ? DEMO_TENANT : DEMO_LANDLORD;
    setIdentifier(cred.identifier);
    setPassword(cred.password);
    setError(null);
  };

  return (
    <>
      <PortalTabs
        tabs={[
          { id: "tenant", label: "Khách thuê" },
          { id: "landlord", label: "Chủ nhà" },
        ]}
        active={tab}
        onChange={(next) => {
          setTab(next);
          setError(null);
        }}
      />
      <form key={tab} className={styles.form} onSubmit={onSubmit} noValidate>
        {error && (
          <div className={styles.alert} role="alert">
            {error}
          </div>
        )}
        <Field label="Email hoặc số điện thoại">
          <input
            className="input"
            autoComplete="username"
            value={identifier}
            aria-invalid={!!error}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>
        <div className="field">
          <div className={styles.rowBetween}>
            <span className="label">Mật khẩu</span>
            <Link href="/forgot-password" className={`small ${styles.labelLink}`}>
              Quên mật khẩu?
            </Link>
          </div>
          <PasswordInput autoComplete="current-password" value={password} aria-invalid={!!error} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Ghi nhớ đăng nhập
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        <div className={styles.dividerRow}>hoặc</div>
        <button type="button" className={`btn btn-quiet btn-block ${styles.googleBtn}`} onClick={onGoogle} disabled={submitting}>
          <GoogleMark /> Tiếp tục với Google
        </button>
        <p className={`small ${styles.demoNote}`}>
          Tài khoản dùng thử:{" "}
          <button type="button" className={styles.demoFillBtn} onClick={() => fillDemo(tab)}>
            Điền sẵn ({tab === "tenant" ? "khách thuê" : "chủ nhà"})
          </button>
        </p>
      </form>
    </>
  );
}
