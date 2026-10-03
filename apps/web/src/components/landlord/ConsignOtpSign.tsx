"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { fmtPhone, isValidVnPhone, normalizePhone } from "@/lib/mock/format";
import { errorText, landlordApi } from "@/lib/landlord/api";
import type { Consignment, SignOtpInfo } from "@/lib/landlord/types";

interface ConsignOtpSignProps {
  /** Đã tick cam đoan quyền sở hữu (Điều 2) — chưa tick thì khóa nút gửi mã. */
  warranted: boolean;
  /** Hồ sơ chủ nhà chưa có SĐT xác thực: phải nhập SĐT, OTP đúng sẽ gắn số này vào hồ sơ. */
  needPhone: boolean;
  /** Bảo đảm hồ sơ ký gửi (bản nháp) đã tồn tại; trả id, hoặc null kèm thông báo lỗi qua `onError`. */
  ensureDraft: () => Promise<string | null>;
  onSigned: (c: Consignment) => void;
  onError: (message: string) => void;
}

const RESEND_SECONDS = 60;

/** Ký ủy quyền bằng OTP Zalo gửi tới SĐT chủ nhà: tạo nháp → gửi mã → nhập 4 số là ký. */
export function ConsignOtpSign({ warranted, needPhone, ensureDraft, onSigned, onError }: ConsignOtpSignProps) {
  const [phone, setPhone] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [info, setInfo] = useState<SignOtpInfo | null>(null);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const phoneOk = !needPhone || isValidVnPhone(phone);

  const send = async () => {
    setBusy(true);
    onError("");
    const draftId = await ensureDraft();
    if (!draftId) {
      setBusy(false);
      return;
    }
    setId(draftId);
    const res = await landlordApi.sendSignOtp(draftId, needPhone ? normalizePhone(phone) : undefined);
    setBusy(false);
    if (!res.ok) {
      onError(errorText(res, "Không gửi được mã OTP."));
      return;
    }
    setInfo(res.data);
    setCode("");
    setWrong(false);
    setCooldown(RESEND_SECONDS);
  };

  const sign = async (otp: string) => {
    if (!id) return;
    setBusy(true);
    onError("");
    const res = await landlordApi.signConsignment(id, { ownershipWarranted: true, otp, ...(needPhone ? { phone: normalizePhone(phone) } : {}) });
    setBusy(false);
    if (!res.ok) {
      setWrong(true);
      setCode("");
      onError(errorText(res, "Mã chưa đúng. Nhập lại theo tin Zalo."));
      return;
    }
    onSigned(res.data);
  };

  if (!info) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {needPhone && (
          <label className="field">
            <span className="label">Số điện thoại nhận mã OTP</span>
            <input className="input" inputMode="tel" autoComplete="tel" placeholder="0901 234 567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <span className="muted xs" style={{ marginTop: 4 }}>
              Số này sẽ được xác thực và gắn vào hồ sơ chủ nhà của bạn (mã hoá AES-256).
            </span>
          </label>
        )}
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!warranted || !phoneOk || busy} onClick={send}>
          <MessageCircleMore size={18} /> Gửi mã OTP để ký ủy quyền
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="muted small">
        Mã 4 số đã gửi qua Zalo tới <b className="tnum">{info.maskedPhone ?? fmtPhone(normalizePhone(phone))}</b>. Nhập mã để ký ủy quyền.
      </p>
      <OtpInput value={code} error={wrong} autoFocus disabled={busy} onChange={(v) => { setCode(v); setWrong(false); if (v.length === 4) void sign(v); }} />
      <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} disabled={cooldown > 0 || busy} onClick={send}>
        {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã"}
      </button>
      {info.devCode && (
        <p className="xs muted" style={{ padding: 10, border: "1px dashed #b7cdee", borderRadius: 12, background: "#eef4fc" }}>
          Môi trường thử nghiệm: mã OTP là <b className="tnum">{info.devCode}</b>
        </p>
      )}
    </div>
  );
}
