"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { refreshSession } from "@/lib/auth/client";
import { hostApi, invalidateHostMe, type HostMe } from "@/lib/host/api";
import { errorText } from "@/lib/tenant/api";

/**
 * Field Host tự xác thực SĐT bằng OTP Zalo (Admin không nhập SĐT hộ). Dùng API có sẵn:
 * `POST /auth/otp/send` (PHONE_VERIFY) → `POST /auth/phone/verify`.
 */
export function PhoneVerifyCard({ me, onVerified }: { me: HostMe; onVerified: () => void }) {
  const [editing, setEditing] = useState(!me.isPhoneVerified);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await hostApi.sendPhoneOtp(phone.trim());
    setBusy(false);
    if (!res.ok) return setError(errorText(res));
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

  return (
    <Section title="Số điện thoại">
      {me.isPhoneVerified && me.phone && !editing ? (
        <p>
          <b>{me.phone}</b> <StatusBadge tone="ok">Đã xác thực</StatusBadge>{" "}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>
            Đổi số
          </button>
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
          {!me.isPhoneVerified && (
            <p className="muted small">Chưa xác thực. Cần số thật để nhận nhắc hẹn T-10 phút và thông báo ca xem.</p>
          )}
          <label className="field">
            Số điện thoại Zalo
            <input
              className="input"
              inputMode="tel"
              placeholder="09xx xxx xxx"
              value={phone}
              disabled={busy || Boolean(sent)}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {!sent ? (
            <button type="button" className="btn btn-primary" disabled={busy || phone.trim().length < 9} onClick={send}>
              Gửi mã
            </button>
          ) : (
            <>
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
          {me.isPhoneVerified && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(false)}>
              Huỷ
            </button>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
