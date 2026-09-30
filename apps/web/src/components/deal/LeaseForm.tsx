"use client";

import { useState } from "react";
import { FileSignature, Plus, Trash2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { signLease } from "@/lib/mock/actions";
import { RATES, type PaymentCycle } from "@/lib/mock/cost";
import { vnd } from "@/lib/mock/format";
import { HOUSE_RULES } from "@/lib/mock/house-rules";
import type { Booking, Occupant } from "@/lib/mock/types";
import { zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Deal.module.css";

interface LeaseFormProps {
  booking: Booking;
  unit: Unit;
  now: number;
  onSigned?: () => void;
}

const iso = (ms: number) => new Date(ms).toISOString();

const POPULAR_BANKS = [
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
];

export function LeaseForm({ booking, unit, now, onSigned }: LeaseFormProps) {
  const minStart = new Date(now);
  const [startDate, setStartDate] = useState(() => iso(now + 2 * 86_400_000).slice(0, 10));
  const [months, setMonths] = useState(Math.max(12, unit.minMonths));
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>(1);

  // Người cùng ở (0..5)
  const [occupants, setOccupants] = useState<Occupant[]>([]);

  // Tài khoản hoàn cọc
  const initialHolderName = (booking.kyc?.fullName || booking.tenant.name).toUpperCase();
  const [selectedBank, setSelectedBank] = useState(POPULAR_BANKS[0]);
  const [customBank, setCustomBank] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [holderName, setHolderName] = useState(initialHolderName);

  // Nội quy modal/toggle
  const [showRules, setShowRules] = useState(false);

  // Chữ ký & Đồng thuận
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [consentElectronicSign, setConsentElectronicSign] = useState(false);

  // Lỗi form
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tenantName = booking.kyc?.fullName || booking.tenant.name;
  const idNumber = booking.kyc?.idNumber || "—";
  const zone = zoneById(unit.zoneId);

  // Dự toán tài chính
  const securityDeposit = unit.rent;
  const rentAmount = unit.rent * paymentCycle;
  const holdingPaid = booking.deposit?.amount ?? RATES.holdingDeposit;
  const topUpDeposit = Math.max(0, securityDeposit - holdingPaid);
  const totalFirstPayment = rentAmount + topUpDeposit;

  const handleAddOccupant = () => {
    if (occupants.length >= 5) return;
    setOccupants([...occupants, { fullName: "", idOrDob: "", phone: "" }]);
  };

  const handleRemoveOccupant = (index: number) => {
    setOccupants(occupants.filter((_, i) => i !== index));
  };

  const handleOccupantChange = (index: number, field: keyof Occupant, value: string) => {
    const next = [...occupants];
    next[index] = { ...next[index], [field]: value };
    setOccupants(next);
  };

  const handleSubmit = () => {
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const bankName = selectedBank === "Khác" ? customBank.trim() : selectedBank;
    if (!bankName) {
      errors.bankName = "Vui lòng chọn hoặc nhập tên ngân hàng.";
    }
    if (!/^\d{6,19}$/.test(accountNo.trim())) {
      errors.accountNo = "Số tài khoản nhận hoàn cọc phải gồm 6-19 chữ số.";
    }
    if (!holderName.trim()) {
      errors.holderName = "Vui lòng nhập tên chủ tài khoản.";
    }

    for (let i = 0; i < occupants.length; i++) {
      const occ = occupants[i];
      if (!occ.fullName.trim()) {
        errors[`occ_${i}_name`] = "Vui lòng nhập họ tên người cùng ở.";
      }
      if (!occ.idOrDob.trim()) {
        errors[`occ_${i}_id`] = "Vui lòng nhập số CCCD hoặc ngày sinh.";
      }
      if (occ.phone && !/^0\d{9}$/.test(occ.phone.trim())) {
        errors[`occ_${i}_phone`] = "Số điện thoại không đúng định dạng 10 số.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Vui lòng kiểm tra lại các thông tin chưa hợp lệ.");
      return;
    }

    const res = signLease(booking.id, {
      startDate,
      months,
      paymentCycle,
      occupants,
      refundAccount: {
        bankName,
        accountNo: accountNo.trim(),
        holderName: holderName.trim(),
      },
      signature: signatureData || undefined,
    });

    if (res.ok) {
      onSigned?.();
    } else {
      if (res.code === "holder_mismatch") {
        setFieldErrors({ holderName: "Tên chủ tài khoản phải trùng họ tên trên CCCD." });
      }
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
          Kiểm tra thông tin thuê, khai báo người ở cùng, thiết lập tài khoản hoàn cọc và ký điện tử.
        </p>
      </header>

      {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

      {/* 1. Khối Thời hạn */}
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

      {/* 2. Khối Kỳ thanh toán */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Kỳ thanh toán tiền thuê</div>
        <div className={styles.radioRow}>
          {[1, 3, 6].map((cycle) => (
            <label key={cycle} className="radio" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input
                type="radio"
                name="paymentCycle"
                value={cycle}
                checked={paymentCycle === cycle}
                onChange={() => setPaymentCycle(cycle as PaymentCycle)}
              />
              <span>Thanh toán {cycle} tháng/lần (Điều 3.2 HĐ thuê)</span>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Khối Người cùng cư trú */}
      <div className={styles.formSection}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div className={styles.formSectionTitle} style={{ margin: 0 }}>Người cùng cư trú ({occupants.length}/5)</div>
          {occupants.length < 5 && (
            <button type="button" className="btn btn-sm btn-quiet" onClick={handleAddOccupant}>
              <Plus size={15} /> Thêm người
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Dùng để đăng ký tạm trú và cấp thẻ cư dân (Điều 3 Thỏa thuận cọc, Điều 11 HĐ thuê).
        </p>

        {occupants.map((occ, idx) => (
          <div key={idx} className={styles.occupantCard}>
            <div className={styles.occupantInputs}>
              <div>
                <input
                  className="input"
                  placeholder="Họ và tên người ở"
                  value={occ.fullName}
                  onChange={(e) => handleOccupantChange(idx, "fullName", e.target.value)}
                />
                {fieldErrors[`occ_${idx}_name`] && (
                  <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors[`occ_${idx}_name`]}</span>
                )}
              </div>
              <div>
                <input
                  className="input"
                  placeholder="Số CCCD hoặc Ngày sinh"
                  value={occ.idOrDob}
                  onChange={(e) => handleOccupantChange(idx, "idOrDob", e.target.value)}
                />
                {fieldErrors[`occ_${idx}_id`] && (
                  <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors[`occ_${idx}_id`]}</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-quiet"
                style={{ color: "var(--danger)", padding: 6 }}
                onClick={() => handleRemoveOccupant(idx)}
                aria-label="Xoá người này"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div style={{ marginTop: 6 }}>
              <input
                className="input"
                placeholder="Số điện thoại (tuỳ chọn)"
                value={occ.phone || ""}
                onChange={(e) => handleOccupantChange(idx, "phone", e.target.value)}
              />
              {fieldErrors[`occ_${idx}_phone`] && (
                <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors[`occ_${idx}_phone`]}</span>
              )}
            </div>
          </div>
        ))}
        {occupants.length === 0 && (
          <p className="muted small" style={{ fontStyle: "italic", margin: "4px 0 10px" }}>
            Không có người ở cùng (Khách thuê ở một mình).
          </p>
        )}
      </div>

      {/* 4. Khối Tài khoản nhận hoàn cọc */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Tài khoản ngân hàng nhận hoàn cọc</div>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Phải trùng 100% họ tên trên CCCD để hoàn cọc tự động khi thanh lý hợp đồng.
        </p>

        <div className={styles.leaseGrid}>
          <label className="field">
            <span className="label">Ngân hàng</span>
            <select
              className="input"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value="Khác">Ngân hàng khác...</option>
            </select>
          </label>

          {selectedBank === "Khác" && (
            <label className="field">
              <span className="label">Tên ngân hàng</span>
              <input
                className="input"
                placeholder="Nhập tên ngân hàng"
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
              />
              {fieldErrors.bankName && (
                <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors.bankName}</span>
              )}
            </label>
          )}

          <label className="field">
            <span className="label">Số tài khoản</span>
            <input
              className="input"
              placeholder="Nhập 6–19 chữ số"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
            />
            {fieldErrors.accountNo && (
              <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors.accountNo}</span>
            )}
          </label>

          <label className="field">
            <span className="label">Tên chủ tài khoản (in hoa)</span>
            <input
              className="input"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value.toUpperCase())}
            />
            {fieldErrors.holderName && (
              <span className="small" style={{ color: "var(--danger)" }}>{fieldErrors.holderName}</span>
            )}
          </label>
        </div>
      </div>

      {/* 5. Khối Dự toán tài chính đợt đầu */}
      <div className={styles.depositBreakdown}>
        <div style={{ fontWeight: 600, color: "var(--ink-950)", marginBottom: 8 }}>
          Dự toán tài chính nhận bàn giao căn hộ {unit.code} ({zone.name}):
        </div>

        <div className={styles.breakdownRow}>
          <span className="muted">Tiền thuê kỳ 1 ({paymentCycle} tháng):</span>
          <b>{vnd(rentAmount)}đ</b>
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
          <span className="muted">Phần cọc bảo đảm còn thiếu:</span>
          <b>{vnd(topUpDeposit)}đ</b>
        </div>

        <div className={styles.breakdownTotal}>
          <span>Tổng thanh toán kỳ đầu trước khi nhận nhà:</span>
          <span style={{ color: "var(--lagoon-700)" }}>{vnd(totalFirstPayment)}đ</span>
        </div>
      </div>

      {/* 6. Khối Điều khoản chính (chỉ đọc) */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Điều khoản chính hợp đồng</div>
        <ul className="small" style={{ paddingLeft: 18, margin: "8px 0 12px", lineHeight: 1.6, color: "var(--ink-2)" }}>
          <li>
            Tiền thuê <b>{vnd(unit.rent)}đ/tháng</b>, cố định suốt hợp đồng; thanh toán qua VietQR với nội dung <code>VSA {unit.code} THANH TOAN TIEN THUE KY [số kỳ]</code>.
          </li>
          <li>
            Tiền cọc bảo đảm <b>{vnd(securityDeposit)}đ</b>, đã gồm 2.000.000đ cọc giữ chỗ chuyển đổi 100%; không trừ vào tiền thuê.
          </li>
          <li>
            Chậm thanh toán: ân hạn và lãi chậm trả theo mức ghi trong hợp đồng; quá hạn dài có thể bị tạm dừng mã cửa và chấm dứt hợp đồng (Điều 3.4).
          </li>
          <li>
            Cố ý phá hoại, lãng phí điện nước hoặc bỏ trốn: bồi hoàn phần vượt cọc trong 05 ngày làm việc, quá hạn chịu 0,05%/ngày; có thể bị tố giác theo Điều 178 Bộ luật Hình sự (Điều 13).
          </li>
          <li>
            Tuân thủ nội quy căn hộ.{" "}
            <button
              type="button"
              className="btn btn-quiet"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", fontSize: 12, verticalAlign: "middle" }}
              onClick={() => setShowRules(!showRules)}
            >
              <BookOpen size={13} /> {showRules ? "Ẩn nội quy" : "Xem 6 nội quy căn hộ"} {showRules ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </li>
        </ul>

        {showRules && (
          <div className={styles.rulesBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Nội quy căn hộ (6 mục bắt buộc tuân thủ):</div>
            <ol style={{ paddingLeft: 16, margin: 0 }}>
              {HOUSE_RULES.map((rule) => (
                <li key={rule.id} style={{ marginBottom: 6 }}>
                  <b>{rule.title}:</b> {rule.body} <span className="muted" style={{ fontSize: 11 }}>({rule.source})</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: "var(--r-control)", marginTop: 14, marginBottom: 14, fontSize: 13 }}>
        <div>Bên thuê: <b>{tenantName}</b> · Số CCCD: <b>{idNumber}</b></div>
        <div className="muted small" style={{ marginTop: 2 }}>
          Thông tin được chứng thực qua eKYC và mã hoá bảo mật AES-256 theo Nghị định 13/2023/NĐ-CP.
        </div>
      </div>

      {/* 7. Khối Chữ ký */}
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
