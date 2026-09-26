"use client";

import { useState } from "react";
import { FilePenLine, FileSignature } from "lucide-react";
import { OtpSign } from "@/components/booking/OtpSign";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { signAgreement, signLease } from "@/lib/mock/actions";
import { fmtDateTime, fmtPhone, vnd } from "@/lib/mock/format";
import { allInCost, RATES } from "@/lib/mock/cost";
import type { Booking } from "@/lib/mock/types";
import { hostById, zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Workflow.module.css";

const iso = (ms: number) => new Date(ms).toISOString();

/** Thỏa thuận đặt cọc giữ chỗ 24h — điền tự động từ OCR CCCD (mẫu legal/02 & docs/HOLDING_DEPOSIT_TEMPLATE.md). */
export function AgreementStep({ booking, unit }: { booking: Booking; unit: Unit }) {
  const host = hostById(booking.hostId)!;
  const k = booking.kyc!;
  const dep = booking.deposit!;
  const cost = allInCost(unit, { persons: booking.tenant.persons, motorbikes: 1, cars: 0 });
  return (
    <section className={`card ${styles.step}`}>
      <header className={styles.stepHead}>
        <span className={styles.stepIcon}>
          <FilePenLine size={22} />
        </span>
        <div>
          <h2>Ký Thỏa thuận đặt cọc</h2>
          <p className="muted small">Thông tin bên B được điền tự động từ CCCD. Khách đọc lại rồi ký bằng OTP Zalo.</p>
        </div>
      </header>

      <article className={styles.paper} aria-label="Thỏa thuận đặt cọc giữ chỗ căn hộ 24 giờ">
        <h3>THỎA THUẬN ĐẶT CỌC GIỮ CHỖ CĂN HỘ (24 GIỜ)</h3>
        <p className={styles.paperMeta}>
          Thời hạn giữ chỗ: đến {dep.expiresAt ? fmtDateTime(dep.expiresAt) : "24 giờ sau khi thanh toán"}
        </p>
        <h4>Bên A: nền tảng VinStay AI / chủ căn hộ</h4>
        <p>
          Field Host {host.name} · {fmtPhone(host.phone)} · thẻ {host.rfid}
        </p>
        <h4>Bên B: khách đặt cọc (từ OCR CCCD)</h4>
        <p>
          {k.fullName} · CCCD {k.idNumber} · cấp {k.issuedDate}
          <br />
          Thường trú: {k.address}
          <br />
          Điện thoại: {fmtPhone(booking.tenant.phone)}
        </p>
        <h4>Điều 1. Căn hộ</h4>
        <p>
          {unit.code} ({unit.building}, tầng {unit.floor}), {unit.layoutLabel} {unit.areaM2} m² tại {zoneById(unit.zoneId).name}, Vinhomes Ocean Park. Giá thuê {vnd(unit.rent)}đ/tháng; All-in Cost dự toán {vnd(cost.total)}đ/tháng.
        </p>
        <h4>Điều 2. Tiền cọc</h4>
        <p>
          {vnd(dep.amount)}đ (hai triệu đồng chẵn) qua VietQR, mã giao dịch {dep.qrRef}, đối soát tự động {dep.paidAt ? fmtDateTime(dep.paidAt) : ""}.
        </p>
        <h4>Điều 3. Chuyển đổi và xử lý tiền cọc</h4>
        <p>
          Khi ký hợp đồng thuê trong 24 giờ, khoản {vnd(RATES.holdingDeposit)}đ chuyển 100% thành một phần Tiền cọc bảo đảm tài sản và nội thất, giữ nguyên suốt kỳ thuê và hoàn 100% khi thanh lý sau đối soát hiện trạng; <b>không khấu trừ vào tiền thuê tháng đầu</b>.
          Nếu Bên B không ký hợp đồng trong thời hạn giữ chỗ (không do bất khả kháng), Bên B không được hoàn cọc. Nếu chủ nhà từ chối cho thuê hoặc căn sai lệch nghiêm trọng so với thông tin đã kiểm định, Bên A hoàn 100% trong 02 giờ làm việc.
        </p>
        <h4>Điều 4. Dữ liệu cá nhân</h4>
        <p>Ảnh CCCD được mã hoá AES-256 theo Nghị định 13/2023/NĐ-CP, chỉ dùng để lập giao dịch này.</p>
      </article>

      <OtpSign phone={booking.tenant.phone} purpose="agreement" sendLabel="Gửi mã OTP để khách ký" onVerified={() => signAgreement(booking.id)} />
    </section>
  );
}

/** Hợp đồng thuê chính thức: chữ ký tay + OTP → ký số; căn chuyển sang rented. */
export function LeaseStep({ booking, unit, now }: { booking: Booking; unit: Unit; now: number }) {
  const minStart = new Date(now);
  const [startDate, setStartDate] = useState(() => iso(now + 2 * 86_400_000).slice(0, 10));
  const [months, setMonths] = useState(Math.max(12, unit.minMonths));
  const [inked, setInked] = useState(false);
  const security = unit.rent;
  const topUp = Math.max(0, security - RATES.holdingDeposit);
  const firstMonth = unit.rent;
  return (
    <section className={`card ${styles.step}`}>
      <header className={styles.stepHead}>
        <span className={styles.stepIcon}>
          <FileSignature size={22} />
        </span>
        <div>
          <h2>Hợp đồng thuê căn hộ (ký số)</h2>
          <p className="muted small">Khách ký tay trên màn hình rồi xác nhận OTP để tạo chữ ký số.</p>
        </div>
      </header>

      <div className={styles.leaseForm}>
        <label className="field">
          <span className="label">Ngày bắt đầu thuê</span>
          <input className="input" type="date" min={minStart.toISOString().slice(0, 10)} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Thời hạn</span>
          <select className="select" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[6, 12, 24].filter((m) => m >= unit.minMonths).map((m) => (
              <option key={m} value={m}>
                {m} tháng
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className={styles.summary}>
        <div>
          <dt>Tiền thuê hàng tháng</dt>
          <dd className="num">{vnd(unit.rent)}đ</dd>
        </div>
        <div>
          <dt>Tiền cọc bảo đảm (1 tháng)</dt>
          <dd className="num">{vnd(security)}đ</dd>
        </div>
        <div>
          <dt>Đã có từ cọc giữ chỗ</dt>
          <dd className="num">− {vnd(RATES.holdingDeposit)}đ</dd>
        </div>
        <div>
          <dt>Cọc bảo đảm cần bổ sung</dt>
          <dd className="num">{vnd(topUp)}đ</dd>
        </div>
        <div>
          <dt>Tiền thuê tháng đầu (đủ, không trừ cọc)</dt>
          <dd className="num">{vnd(firstMonth)}đ</dd>
        </div>
      </dl>
      <p className="muted xs">
        Khoản 2.000.000đ đã cọc chuyển 100% thành một phần Tiền cọc bảo đảm và không bị khấu trừ vào tiền thuê tháng đầu. Bên thuê: {booking.kyc?.fullName}.
      </p>

      <SignaturePad onChange={setInked} label="Khách ký tên tại đây" />
      <OtpSign
        phone={booking.tenant.phone}
        purpose="lease"
        disabled={!inked}
        sendLabel={inked ? "Gửi mã OTP để ký hợp đồng" : "Khách cần ký tay trước"}
        onVerified={() => signLease(booking.id, { startDate: new Date(startDate).toISOString(), months })}
      />
    </section>
  );
}
