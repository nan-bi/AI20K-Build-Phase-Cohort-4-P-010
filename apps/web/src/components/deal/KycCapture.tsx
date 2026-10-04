"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Check,
  ImagePlus,
  ScanText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { tenantApi, errorText } from "@/lib/tenant/api";
import type {
  EkycScanResult,
  TenantContract,
} from "@/lib/tenant/types";
import { toast } from "@/components/ui/Toast";
import styles from "./Deal.module.css";

type Slot = "front" | "back" | "face";
type Photos = Record<Slot, string | null>;

const SLOT_LABEL: Record<Slot, string> = {
  front: "Mặt trước CCCD",
  back: "Mặt sau CCCD",
  face: "Ảnh chân dung",
};

const LOW_CONFIDENCE_THRESHOLD = 0.85;

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sampleImage(slot: Slot, name: string): string {
  const svg =
    slot === "front"
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#efe6d2"/><rect x="0" y="0" width="320" height="34" rx="14" fill="#c9502f" opacity=".9"/><text x="160" y="22" font-size="13" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">CĂN CƯỚC CÔNG DÂN</text><rect x="16" y="52" width="82" height="106" rx="6" fill="#b9c7c4"/><circle cx="57" cy="88" r="20" fill="#8aa09c"/><rect x="30" y="112" width="54" height="34" rx="14" fill="#8aa09c"/><text x="112" y="70" font-size="9" font-family="sans-serif" fill="#555">Họ và tên / Full name</text><text x="112" y="86" font-size="13" font-family="sans-serif" font-weight="700" fill="#222">${name}</text><rect x="112" y="102" width="150" height="6" rx="3" fill="#cdbfa2"/><rect x="112" y="118" width="120" height="6" rx="3" fill="#cdbfa2"/><rect x="112" y="134" width="170" height="6" rx="3" fill="#cdbfa2"/></svg>`
      : slot === "back"
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" rx="14" fill="#e8dfca"/><rect x="18" y="20" width="44" height="34" rx="6" fill="#d7b64f"/><rect x="18" y="74" width="284" height="6" rx="3" fill="#c7b995"/><rect x="18" y="92" width="240" height="6" rx="3" fill="#c7b995"/><rect x="18" y="110" width="260" height="6" rx="3" fill="#c7b995"/><rect x="220" y="128" width="64" height="52" fill="#222"/><rect x="18" y="150" width="180" height="10" rx="3" fill="#8a7f66"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#cfe0e2"/><circle cx="120" cy="96" r="42" fill="#8aa9ad"/><path d="M36 240c0-52 38-84 84-84s84 32 84 84z" fill="#8aa9ad"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface CaptureProps {
  slot: Slot;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled: boolean;
  name: string;
}

function CaptureSlot({ slot, value, onChange, disabled, name }: CaptureProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.captureCard}>
      <div
        className={`${styles.shotPreview} ${slot === "face" ? styles.shotFace : ""}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={SLOT_LABEL[slot]}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className={styles.shotEmpty}>
            <Camera size={26} />
            <span className="muted xs">{SLOT_LABEL[slot]}</span>
          </div>
        )}
      </div>

      <div className={styles.slotActions}>
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture={slot === "face" ? "user" : "environment"}
          style={{ display: "none" }}
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const url = URL.createObjectURL(f);
              onChange(url);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <Camera size={14} /> Chụp
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled}
          onClick={() => onChange(sampleImage(slot, name))}
          title="Nạp ảnh mẫu để thử nghiệm nhanh không cần máy ảnh"
        >
          <ImagePlus size={14} /> Mẫu
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Xóa
          </button>
        )}
      </div>
    </div>
  );
}

export interface KycCaptureProps {
  refCode: string;
  contactName: string;
  minLeaseMonths?: number;
  onSuccess: (contract: TenantContract) => void;
  onCancel?: () => void;
}

export function KycCapture({
  refCode,
  contactName,
  minLeaseMonths = 6,
  onSuccess,
  onCancel,
}: KycCaptureProps) {
  const [photos, setPhotos] = useState<Photos>({
    front: null,
    back: null,
    face: null,
  });
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"capture" | "scanning" | "review">(
    "capture",
  );

  // Scan result state
  const [scanResult, setScanResult] = useState<EkycScanResult | null>(null);
  const [fields, setFields] = useState<EkycScanResult["fields"]>({
    fullName: "",
    idNumber: "",
    dob: "",
    issuedDate: "",
    address: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Confirmations
  const [checkedLow, setCheckedLow] = useState(false);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);

  // Lease terms state (3 fields)
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [months, setMonths] = useState(Math.max(12, minLeaseMonths));
  const [paymentCycle, setPaymentCycle] = useState<1 | 3 | 6>(1);
  const [submitting, setSubmitting] = useState(false);

  const readyToScan = Boolean(
    photos.front && photos.back && photos.face && consent,
  );

  const handleStartScan = async () => {
    if (!readyToScan) return;
    setPhase("scanning");

    const res = await tenantApi.scanEkyc(refCode, "PRIVACY-2026.10-v1");
    if (!res.ok || !res.data) {
      setPhase("capture");
      toast(errorText(res, "Không thể quét CCCD. Vui lòng thử lại."));
      return;
    }

    setScanResult(res.data);
    setFields(res.data.fields);
    setPhase("review");
  };

  const handleFieldEdit = (key: keyof EkycScanResult["fields"], value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  };

  // Determine low confidence keys
  const conf = scanResult?.confidence || {};
  const lowKeys = Object.entries(conf)
    .filter(([k, score]) => (score as number) < LOW_CONFIDENCE_THRESHOLD && !touched.has(k))
    .map(([k]) => k);

  // Name mismatch check
  const isNameMismatch =
    Boolean(fields.fullName) &&
    normalizeString(fields.fullName) !== normalizeString(contactName);

  const handleSubmitAll = async () => {
    if (!scanResult) return;
    if (lowKeys.length > 0 && !checkedLow) return;
    if (isNameMismatch && !mismatchConfirmed) return;

    setSubmitting(true);
    const res = await tenantApi.submitEkyc(refCode, {
      scanId: scanResult.scanId,
      consentVersion: "PRIVACY-2026.10-v1",
      fields,
      confirmedLowConfidence: lowKeys.length > 0 ? true : false,
      confirmedNameMismatch: isNameMismatch ? true : undefined,
      lease: {
        startDate,
        months: Number(months),
        paymentCycle,
      },
    });
    setSubmitting(false);

    if (res.ok && res.data) {
      toast("Xác lập hợp đồng thuê thành công!", "success");
      onSuccess(res.data.contract);
    } else {
      toast(errorText(res, "Không thể xác lập hợp đồng. Vui lòng thử lại."));
    }
  };

  return (
    <div className={styles.kycWrap}>
      {phase === "capture" && (
        <>
          <div className={styles.lead}>
            <p className="small muted" style={{ margin: "0 0 10px" }}>
              Chụp 2 mặt CCCD và ảnh chân dung để AI đối soát danh tính. Ảnh chỉ xử lý tại chỗ và không được lưu trữ theo quy chuẩn <b>Zero-Storage</b>.
            </p>
          </div>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "10px 12px",
              background: "var(--paper-2)",
              borderRadius: "var(--r)",
              fontSize: 13,
              lineHeight: 1.45,
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Tôi đồng ý cho VinStay AI xử lý dữ liệu sinh trắc học và CCCD để đối soát danh tính theo <b>Nghị định 13/2023/NĐ-CP</b> (Phiên bản PRIVACY-2026.10-v1).
            </span>
          </label>

          <div className={styles.grid}>
            {(["front", "back", "face"] as Slot[]).map((slot) => (
              <CaptureSlot
                key={slot}
                slot={slot}
                value={photos[slot]}
                disabled={!consent}
                name={contactName}
                onChange={(url) =>
                  setPhotos((prev) => ({ ...prev, [slot]: url }))
                }
              />
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={!readyToScan}
              onClick={handleStartScan}
            >
              <ScanText size={18} /> Bóc tách thông tin bằng AI
            </button>
            {!consent && (
              <p className="muted xs" style={{ marginTop: 6, textAlign: "center" }}>
                Vui lòng tích đồng ý xử lý dữ liệu trước khi chụp ảnh.
              </p>
            )}
          </div>
        </>
      )}

      {phase === "scanning" && (
        <div className={styles.scanningBox} role="status">
          <div className={styles.scanLine} />
          <p style={{ margin: 0 }}>
            <b>AI đang xử lý hình ảnh CCCD…</b>
            <br />
            <span className="muted small">
              Nhận diện chip, bóc tách họ tên, số định danh cá nhân và so khớp sinh trắc học khuôn mặt.
            </span>
          </p>
        </div>
      )}

      {phase === "review" && (
        <>
          <div className={styles.faceOk}>
            <ShieldCheck size={18} /> Khuôn mặt khớp ảnh trên CCCD:{" "}
            <b className="num">
              {scanResult ? Math.round(scanResult.faceMatch * 100) : 96}%
            </b>
          </div>

          {/* Cảnh báo lệch tên nếu có */}
          {isNameMismatch && (
            <div className={styles.mismatchCard}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  marginBottom: 6,
                }}
              >
                <TriangleAlert
                  size={18}
                  style={{
                    color: "var(--danger)",
                    flex: "none",
                    marginTop: 2,
                  }}
                />
                <div>
                  <b style={{ color: "var(--danger)" }}>
                    Họ tên trên CCCD khác họ tên lúc đặt lịch
                  </b>
                  <p className="small" style={{ margin: "2px 0 0" }}>
                    Thông tin họ tên trên thẻ CCCD vừa quét khác với thông tin bạn đã cung cấp khi đặt lịch hẹn.
                  </p>
                </div>
              </div>

              <table className={styles.mismatchTable}>
                <thead>
                  <tr>
                    <th>Trường dữ liệu</th>
                    <th>Lúc đặt lịch</th>
                    <th>CCCD vừa bóc tách</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Họ và tên</td>
                    <td><b>{contactName}</b></td>
                    <td style={{ color: "var(--danger)" }}>
                      <b>{fields.fullName}</b>
                    </td>
                  </tr>
                </tbody>
              </table>

              <label className="check" style={{ fontSize: 13, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={mismatchConfirmed}
                  onChange={(e) => setMismatchConfirmed(e.target.checked)}
                />
                <span>Tôi xác nhận thông tin CCCD là đúng và chấp nhận đối soát bổ sung.</span>
              </label>
            </div>
          )}

          {/* Form thông tin bóc tách */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              margin: "14px 0",
            }}
          >
            {(
              [
                ["fullName", "Họ và tên"],
                ["idNumber", "Số CCCD (12 chữ số)"],
                ["dob", "Ngày sinh (DD/MM/YYYY)"],
                ["issuedDate", "Ngày cấp (DD/MM/YYYY)"],
                ["address", "Nơi thường trú"],
              ] as [keyof EkycScanResult["fields"], string][]
            ).map(([k, label]) => {
              const c = (conf as Record<string, number>)[k];
              const isLow =
                c !== undefined &&
                c < LOW_CONFIDENCE_THRESHOLD &&
                !touched.has(k);
              return (
                <label key={k} className="field">
                  <span
                    className="label"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{label}</span>
                    {c !== undefined && (
                      <span
                        className={`badge ${isLow ? "badge-danger" : "badge-ok"}`}
                        style={{ fontSize: 11 }}
                      >
                        {Math.round(c * 100)}%
                      </span>
                    )}
                  </span>
                  <input
                    className="input"
                    value={fields[k]}
                    onChange={(e) => handleFieldEdit(k, e.target.value)}
                    style={
                      isLow
                        ? {
                            borderColor: "var(--danger)",
                            background: "var(--danger-050)",
                          }
                        : undefined
                    }
                  />
                  {isLow && (
                    <span className="field-error">
                      Độ tin cậy thấp: vui lòng đối chiếu và sửa lại nếu cần.
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {lowKeys.length > 0 && (
            <div
              className="alert alert-warning"
              style={{ fontSize: 13, marginBottom: 12 }}
            >
              <label className="check" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={checkedLow}
                  onChange={(e) => setCheckedLow(e.target.checked)}
                />
                <span>
                  Tôi đã kiểm tra các trường có độ tin cậy dưới 85% khớp với thẻ CCCD gốc.
                </span>
              </label>
            </div>
          )}

          {/* ─── 3 TRƯỜNG ĐIỀU KHOẢN THUÊ ─── */}
          <div
            className="card"
            style={{
              padding: 14,
              background: "var(--paper-2)",
              borderRadius: "var(--r)",
              margin: "14px 0",
            }}
          >
            <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>
              Điều khoản thuê căn hộ
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label className="field" style={{ margin: 0 }}>
                <span className="label">Ngày bắt đầu thuê</span>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  min={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span className="label">Thời hạn thuê</span>
                <select
                  className="input"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                >
                  <option value={minLeaseMonths}>
                    {minLeaseMonths} tháng (Tối thiểu)
                  </option>
                  {minLeaseMonths < 12 && <option value={12}>12 tháng (1 năm)</option>}
                  <option value={24}>24 tháng (2 năm)</option>
                  <option value={36}>36 tháng (3 năm)</option>
                </select>
              </label>
            </div>

            <label className="field" style={{ margin: "10px 0 0" }}>
              <span className="label">Kỳ hạn thanh toán tiền thuê</span>
              <select
                className="input"
                value={paymentCycle}
                onChange={(e) =>
                  setPaymentCycle(Number(e.target.value) as 1 | 3 | 6)
                }
              >
                <option value={1}>Thanh toán từng tháng (1 tháng/lần)</option>
                <option value={3}>Thanh toán theo quý (3 tháng/lần)</option>
                <option value={6}>Thanh toán nửa năm (6 tháng/lần)</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              disabled={
                submitting ||
                (lowKeys.length > 0 && !checkedLow) ||
                (isNameMismatch && !mismatchConfirmed)
              }
              onClick={handleSubmitAll}
            >
              <Check size={18} />{" "}
              {submitting
                ? "Đang xác lập hợp đồng..."
                : "Xác nhận & Ký hợp đồng điện tử"}
            </button>
            {onCancel && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={onCancel}
                disabled={submitting}
              >
                Đóng
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
