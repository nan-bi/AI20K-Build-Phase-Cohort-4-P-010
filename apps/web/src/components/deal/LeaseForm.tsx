"use client";

import { useState } from "react";
import { FileSignature } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { signLease } from "@/lib/mock/actions";
import { RATES } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import type { Booking } from "@/lib/mock/types";
import { zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Deal.module.css";

interface LeaseFormProps {
  booking: Booking;
  unit: Unit;
  now: number;
  onSigned?: () => void;
}

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Form ký kết Hợp đồng thuê căn hộ chính thức.
 * Điền sẵn thông tin khách từ eKYC, cấu hình kỳ hạn, tính toán tiền cọc bảo đảm, ký tay và tick đồng ý ký điện tử (không OTP).
 */
export function LeaseForm({ booking, unit, now, onSigned }: LeaseFormProps) {
  const minStart = new Date(now);
  const [startDate, setStartDate] = useState(() => iso(now + 2 * 86_400_000).slice(0, 10));
  const [months, setMonths] = useState(Math.max(12, unit.minMonths));
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [consentElectronicSign, setConsentElectronicSign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenantName = booking.kyc?.fullName || booking.tenant.name;
  const idNumber = booking.kyc?.idNumber || "—";
  const zone = zoneById(unit.zoneId);

  // Tiền cọc bảo đảm tài sản = 1 tháng tiền thuê (hoặc cấu hình)
  const securityDeposit = unit.rent;
  // Khoản cọc giữ chỗ 2M đã nộp được chuyển 100% sang Tiền cọc bảo đảm
  const holdingPaid = RATES.holdingDeposit;
  // Số tiền cọc cần nộp thêm
  const topUpDeposit = Math.max(0, securityDeposit - holdingPaid);
  // Tiền thuê tháng đầu tiên phải thanh toán
  const firstMonthRent = unit.rent;
  // Tổng thanh toán đợt đầu lúc nhận nhà
  const totalDueAtMoveIn = firstMonthRent + topUpDeposit;

  const handleSubmit = () => {
    setError(null);
    const res = signLease(booking.id, {
      startDate,
      months,
      signature: signatureData || undefined,
    });

    if (res.ok) {
      onSigned?.();
    } else {
      setError(res.reason || "Ký hợp đồng thuê thất bại.");
    }
  };

  return (
    <div className="card" style={{ padding: "20px 16px" }}>
      <header style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <FileSignature size={20} style={{ color: "var(--lagoon)" }} />
          Hợp đồng thuê căn hộ (Ký số)
        </h3>
        <p className="muted small" style={{ margin: 0 }}>
          Kiểm tra thông tin thuê, ký tay xác thực và tích đồng ý để ký kết hợp đồng thuê căn hộ.
        </p>
      </header>

      {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

      <div className={styles.leaseGrid}>
        <label className="field">
          <span className="label">Ngày bắt đầu thuê</span>
          <input
            className="input"
            type="date"
            min={minStart.toISOString().slice(0, 10)}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Thời hạn hợp đồng</span>
          <select
            className="input"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={6}>6 tháng (Trung hạn)</option>
            <option value={12}>12 tháng (Dài hạn tiêu chuẩn)</option>
            <option value={24}>24 tháng (Cam kết 2 năm)</option>
          </select>
        </label>
      </div>

      <div className={styles.depositBreakdown}>
        <div style={{ fontWeight: 600, color: "var(--ink-950)", marginBottom: 8 }}>
          Dự toán tài chính nhận bàn giao căn hộ {unit.code} ({zone.name}):
        </div>

        <div className={styles.breakdownRow}>
          <span className="muted">Giá thuê hàng tháng:</span>
          <b>{vnd(unit.rent)}đ/tháng</b>
        </div>

        <div className={styles.breakdownRow}>
          <span className="muted">Tiền cọc bảo đảm tài sản &amp; nội thất:</span>
          <b>{vnd(securityDeposit)}đ</b>
        </div>

        <div className={styles.breakdownRow} style={{ color: "var(--ok)", fontSize: 12.5 }}>
          <span>
            ↳ Đã cọc giữ chỗ ({vnd(holdingPaid)}đ chuyển 100% vào cọc bảo đảm, <b>không khấu trừ vào tiền thuê tháng đầu</b>):
          </span>
          <b>-{vnd(holdingPaid)}đ</b>
        </div>

        <div className={styles.breakdownRow}>
          <span className="muted">Tiền cọc bảo đảm cần nộp thêm:</span>
          <b>{vnd(topUpDeposit)}đ</b>
        </div>

        <div className={styles.breakdownRow}>
          <span className="muted">Tiền thuê tháng đầu tiên (kỳ 1):</span>
          <b>{vnd(firstMonthRent)}đ</b>
        </div>

        <div className={styles.breakdownTotal}>
          <span>Tổng thanh toán khi nhận nhà:</span>
          <span style={{ color: "var(--lagoon-700)" }}>{vnd(totalDueAtMoveIn)}đ</span>
        </div>
      </div>

      <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "var(--r-control)", marginBottom: 14, fontSize: 13 }}>
        <div>Bên thuê: <b>{tenantName}</b> · Số CCCD: <b>{idNumber}</b></div>
        <div className="muted small" style={{ marginTop: 2 }}>
          Thông tin được chứng thực qua eKYC và mã hoá bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP.
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span className="label" style={{ marginBottom: 6, display: "block" }}>
          Chữ ký tay điện tử của người thuê:
        </span>
        <SignaturePad
          onChange={setHasSignature}
          onCapture={setSignatureData}
          label="Ký tên người thuê vào khung này"
        />
      </div>

      <label className="check" style={{ fontSize: 13, marginBottom: 16, display: "flex" }}>
        <input
          type="checkbox"
          checked={consentElectronicSign}
          onChange={(e) => setConsentElectronicSign(e.target.checked)}
        />
        <span>
          Tôi đồng ý sử dụng chữ ký điện tử và ký kết Hợp đồng thuê căn hộ này theo quy định pháp luật và Nghị định 13/2023/NĐ-CP.
        </span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={!hasSignature || !consentElectronicSign}
        onClick={handleSubmit}
      >
        Ký kết hợp đồng thuê căn hộ
      </button>
    </div>
  );
}
