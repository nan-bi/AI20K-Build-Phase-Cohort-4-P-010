"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { ZaloBubble } from "@/components/zalo/ZaloThread";
import { requestOtp, verifyOtp } from "@/lib/mock/actions";
import { fmtPhone, normalizePhone } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import type { OtpChallenge } from "@/lib/mock/types";
import { useNow } from "@/lib/useNow";

interface OtpSignProps {
  phone: string;
  purpose: OtpChallenge["purpose"];
  /** Nhãn nút gửi mã. */
  sendLabel: string;
  /** Nút bị khoá vì bước trước chưa đủ điều kiện (vd. chưa ký tay). */
  disabled?: boolean;
  onVerified: () => void;
}

/** Ký bằng OTP gửi qua Zalo tới SĐT khách; hiện luôn tin Zalo mô phỏng để demo. */
export function OtpSign({ phone, purpose, sendLabel, disabled, onVerified }: OtpSignProps) {
  const state = useMock();
  const now = useNow(1000);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const p = normalizePhone(phone);
  const notice = state.notices.find((n) => n.audience === "tenant" && n.toKey === p && n.title === "Mã xác thực VinStay AI");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = () => {
    requestOtp(p, purpose);
    setSent(true);
    setCode("");
    setError(false);
    setCooldown(30);
  };

  if (!sent)
    return (
      <button type="button" className="btn btn-primary btn-lg btn-block" disabled={disabled} onClick={send}>
        <MessageCircleMore size={18} /> {sendLabel}
      </button>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="muted small">
        Mã 4 số đã gửi qua Zalo tới <b className="tnum">{fmtPhone(p)}</b>. Khách đọc mã cho bạn hoặc tự nhập.
      </p>
      <OtpInput
        value={code}
        error={error}
        autoFocus
        onChange={(v) => {
          setCode(v);
          setError(false);
          if (v.length === 4) {
            if (verifyOtp(v)) onVerified();
            else setError(true);
          }
        }}
      />
      {error && <p className="field-error">Mã chưa đúng. Nhập lại theo tin Zalo.</p>}
      <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} disabled={cooldown > 0} onClick={send}>
        {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã"}
      </button>
      {notice && now > 0 && (
        <div style={{ padding: 10, border: "1px dashed #b7cdee", borderRadius: 12, background: "#eef4fc" }}>
          <p className="xs muted" style={{ marginBottom: 6 }}>
            Bản demo: tin Zalo mô phỏng khách nhận được
          </p>
          <ZaloBubble notice={notice} now={now} />
        </div>
      )}
    </div>
  );
}
