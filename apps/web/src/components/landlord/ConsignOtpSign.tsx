"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { OtpInput } from "@/components/ui/OtpInput";
import { fmtPhone, isValidVnPhone, normalizePhone } from "@/lib/format";
import { errorText, landlordApi } from "@/lib/landlord/api";
import type { Consignment, SignOtpInfo } from "@/lib/landlord/types";

interface ConsignOtpSignProps {
  /** Đã tick cam đoan quyền sở hữu (Điều 2) — chưa tick thì khóa nút ký. */
  warranted: boolean;
  /** SĐT đã xác thực của tài khoản (`0901234567`). Có ⇒ ký thẳng không cần OTP; muốn đổi số mới phải OTP. null ⇒ phải nhập số + OTP. */
  verifiedPhone: string | null;
  /** Bảo đảm hồ sơ ký gửi (bản nháp) đã tồn tại; trả id, hoặc null kèm thông báo lỗi qua `onError`. */
  ensureDraft: () => Promise<string | null>;
  onSigned: (c: Consignment) => void;
  onError: (message: string) => void;
}

const RESEND_SECONDS = 60;

/** `0901234567` → `0901 *** 567` (không để lộ số đầy đủ trên màn hình). */
const maskLocal = (p: string) => (p.length >= 7 ? `${p.slice(0, 4)} *** ${p.slice(-3)}` : p);

/**
 * Ký ủy quyền. Số đã xác thực của tài khoản ⇒ KHÔNG cần OTP (xác thực một lần cho mỗi số, như khách đặt lịch).
 * Đổi sang số khác, hoặc tài khoản chưa có số ⇒ nhập số → gửi mã Zalo → nhập 4 số là ký.
 */
export function ConsignOtpSign({ warranted, verifiedPhone, ensureDraft, onSigned, onError }: ConsignOtpSignProps) {
  const [changing, setChanging] = useState(false);
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

  // Dùng số của tài khoản (không OTP) khi đã xác thực và người dùng chưa chọn đổi số.
  const useAccountPhone = !!verifiedPhone && !changing;
  const phoneOk = useAccountPhone || isValidVnPhone(phone);

  const signNow = async () => {
    setBusy(true);
    onError("");
    const draftId = await ensureDraft();
    if (!draftId) {
      setBusy(false);
      return;
    }
    const res = await landlordApi.signConsignment(draftId, { ownershipWarranted: true });
    setBusy(false);
    if (!res.ok) {
      onError(errorText(res, "Không ký được ủy quyền."));
      return;
    }
    onSigned(res.data);
  };

  const send = async () => {
    setBusy(true);
    onError("");
    const draftId = await ensureDraft();
    if (!draftId) {
      setBusy(false);
      return;
    }
    setId(draftId);
    const res = await landlordApi.sendSignOtp(draftId, normalizePhone(phone));
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
    const res = await landlordApi.signConsignment(id, { ownershipWarranted: true, otp, phone: normalizePhone(phone) });
    setBusy(false);
    if (!res.ok) {
      setWrong(true);
      setCode("");
      onError(errorText(res, "Mã chưa đúng. Nhập lại theo tin Zalo."));
      return;
    }
    onSigned(res.data);
  };

  if (useAccountPhone) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="muted small">
          Ký bằng số đã xác thực của bạn: <b className="tnum">{maskLocal(verifiedPhone!)}</b>. Không cần nhập mã OTP.
        </p>
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!warranted || busy} onClick={signNow}>
          <MessageCircleMore size={18} /> Ký ủy quyền
        </button>
        <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => setChanging(true)}>
          Dùng số điện thoại khác
        </button>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label className="field">
          <span className="label">{verifiedPhone ? "Số điện thoại mới nhận mã OTP" : "Số điện thoại nhận mã OTP"}</span>
          <input className="input" inputMode="tel" autoComplete="tel" placeholder="0901 234 567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <span className="muted xs" style={{ marginTop: 4 }}>
            Số này chỉ dùng để nhận mã ký ủy quyền và lưu (mã hoá AES-256) trong hồ sơ ký gửi này, không gắn vào tài khoản.
          </span>
        </label>
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!warranted || !phoneOk || busy} onClick={send}>
          <MessageCircleMore size={18} /> Gửi mã OTP để ký ủy quyền
        </button>
        {verifiedPhone && (
          <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => { setChanging(false); setPhone(""); }}>
            Quay lại dùng số {maskLocal(verifiedPhone)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="muted small">
        Mã 4 số đã gửi tới <b className="tnum">{info.maskedPhone ?? fmtPhone(normalizePhone(phone))}</b>. Nhập mã để ký ủy quyền.
      </p>
      <OtpInput value={code} error={wrong} autoFocus disabled={busy} onChange={(v) => { setCode(v); setWrong(false); if (v.length === 4) void sign(v); }} />
      <button type="button" className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} disabled={cooldown > 0 || busy} onClick={send}>
        {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã"}
      </button>
    </div>
  );
}
