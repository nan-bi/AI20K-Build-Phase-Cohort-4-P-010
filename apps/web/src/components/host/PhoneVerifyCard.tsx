"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { refreshSession } from "@/lib/auth/client";
import { hostApi, invalidateHostMe, type HostMe } from "@/lib/host/api";
import { errorText } from "@/lib/tenant/api";
import styles from "./Host.module.css";

/**
 * Field Host tự xác thực SĐT bằng OTP Zalo (Admin không nhập SĐT hộ). Dùng API có sẵn:
 * `POST /auth/otp/send` (PHONE_VERIFY) → `POST /auth/phone/verify`.
 */
export function PhoneVerifyCard({ me, onVerified }: { me: HostMe; onVerified: () => void }) {
  const [editing, setEditing] = useState(!me.isPhoneVerified);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await hostApi.sendPhoneOtp(phone.trim());
    setBusy(false);
    if (!res.ok) return setError(errorText(res));
    setDevCode(res.data.devCode ?? null);
    setSent(true);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await hostApi.verifyPhone(phone.trim(), code.trim());
    setBusy(false);
    if (!res.ok) return setError(errorText(res));
    toast("Đã xác thực số điện thoại", "success");
    setSent(false);
    setCode("");
    setPhone("");
    setEditing(false);
    invalidateHostMe();
    await refreshSession();
    onVerified();
  }

  const verified = me.isPhoneVerified && Boolean(me.phone);
  const showForm = !verified || editing;

  return (
    <Section
      title="Số điện thoại"
      description="Dùng để nhận nhắc hẹn T-10 phút, thông báo ca xem và OTP Zalo."
      actions={<StatusBadge tone={verified ? "ok" : "warn"}>{verified ? "Đã xác thực" : "Chưa xác thực"}</StatusBadge>}
    >
      {verified && !editing ? (
        <p>
          Số đang dùng: <b className="tnum">{me.phone}</b>{" "}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>
            Đổi số
          </button>
        </p>
      ) : (
        showForm && (
          <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <ol className={styles.phoneSteps}>
              <li className={!sent ? styles.phoneStepOn : ""}>1. Nhập số Zalo</li>
              <li className={sent ? styles.phoneStepOn : ""}>2. Nhập mã 4 số</li>
            </ol>
            <label className="field">
              Số điện thoại Zalo
              <input
                className="input"
                inputMode="tel"
                placeholder="09xx xxx xxx"
                value={phone}
                disabled={busy || sent}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {!sent ? (
              <button type="button" className="btn btn-primary" disabled={busy || phone.trim().length < 9} onClick={send}>
                Gửi mã xác thực
              </button>
            ) : (
              <>
                <p className="muted small">
                  Đã gửi mã 4 số tới Zalo <b className="tnum">{phone.trim()}</b>.{" "}
                  <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => { setSent(false); setCode(""); setDevCode(null); }}>
                    Đổi số / gửi lại
                  </button>
                </p>
                {devCode && (
                  <p className="text-sm">
                    Chế độ demo: chưa có nhà cung cấp OTP nên mã là <b className="tnum">{devCode}</b>.
                  </p>
                )}
                <label className="field">
                  Mã 4 số
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={4}
                    value={code}
                    disabled={busy}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <button type="button" className="btn btn-primary" disabled={busy || code.length !== 4} onClick={verify}>
                  Xác thực
                </button>
              </>
            )}
            {verified && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setSent(false); setCode(""); setPhone(""); }}>
                Huỷ
              </button>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )
      )}
    </Section>
  );
}
