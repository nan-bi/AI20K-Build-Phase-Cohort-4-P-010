"use client";

import { CheckCircle2 } from "lucide-react";
import { HOLD_DAYS, RATES, allInCost } from "@/lib/mock/cost";
import { fmtDateTime, maskPhone, vnd } from "@/lib/mock/format";
import type { AgreementParty, Booking } from "@/lib/mock/types";
import { hostById, zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Deal.module.css";

interface DepositAgreementDocProps {
  booking: Booking;
  unit: Unit;
  party?: AgreementParty;
  draft?: boolean;
}

/**
 * Văn bản Thỏa thuận đặt cọc giữ chỗ căn hộ (mẫu pháp lý chuẩn Điều 328 BLDS 2015).
 * Có id="print-doc" để in trực tiếp thành PDF sạch.
 */
export function DepositAgreementDoc({
  booking,
  unit,
  party,
  draft = false,
}: DepositAgreementDocProps) {
  const host = hostById(booking.hostId);
  const zone = zoneById(unit.zoneId);
  const cost = allInCost(unit, {
    persons: booking.tenant.persons,
    motorbikes: 1,
    cars: 0,
  });

  const bParty = party ?? booking.agreement?.party;
  const dep = booking.deposit ?? {
    amount: RATES.holdingDeposit,
    qrRef: "VQ-MOCK",
    paidAt: undefined,
    expiresAt: undefined,
  };

  const docId = booking.agreement?.docId ?? (draft ? "—" : `COC-${booking.ref}`);
  const signedAt = booking.agreement?.signedAt;
  const signature = booking.agreement?.signature;

  return (
    <article
      id="print-doc"
      className={styles.paper}
      aria-label={`Thỏa thuận đặt cọc giữ chỗ căn hộ ${HOLD_DAYS} ngày`}
    >
      {draft && <div className={styles.watermark}>BẢN NHÁP</div>}

      <header className={styles.paperHead}>
        <h3 className={styles.paperTitle}>
          THỎA THUẬN ĐẶT CỌC GIỮ CHỖ CĂN HỘ ({HOLD_DAYS} NGÀY)
        </h3>
        <p className={styles.paperMeta}>
          Mã thỏa thuận: <b>{docId}</b> · Căn hộ: <b>{unit.code}</b>
          <br />
          Thời hạn giữ chỗ: đến{" "}
          <b>{dep.expiresAt ? fmtDateTime(dep.expiresAt) : `${HOLD_DAYS} ngày sau khi chuyển cọc`}</b>
        </p>
      </header>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>BÊN A (NỀN TẢNG QUẢN LÝ / ĐẠI DIỆN CHỦ CĂN)</h4>
        <p>
          <b>NỀN TẢNG VINSTAY AI</b> — Đại diện chủ sở hữu theo Hợp đồng ủy quyền ký gửi độc quyền.
          <br />
          Chuyên viên phụ trách khu vực: {host?.name ?? "Field Host"}
          {host?.rfid ? ` · Thẻ cư dân: ${host.rfid}` : ""}
          <br />
          Địa chỉ giao dịch: Phân khu {zone.name}, Khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội.
        </p>
      </div>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>BÊN B (KHÁCH ĐẶT CỌC GIỮ CHỖ)</h4>
        <p>
          Họ và tên: <b>{bParty?.fullName || booking.tenant.name}</b>
          <br />
          Số CMND / CCCD: <b>{bParty?.idNumber || "—"}</b>
          <br />
          Số điện thoại: <b>{bParty?.phone || booking.tenant.phone}</b>
          <br />
          Địa chỉ thường trú: {bParty?.address || "Chưa cập nhật"}
        </p>
      </div>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>ĐIỀU 1. ĐỐI TƯỢNG VÀ THÔNG TIN CĂN HỘ</h4>
        <p>
          Bên A đồng ý nhận tiền đặt cọc giữ chỗ và khóa trạng thái giao dịch căn hộ mã hiệu{" "}
          <b>{unit.code}</b> (Tòa {unit.building}, Tầng {unit.floor}), diện tích tim tường{" "}
          <b>{unit.areaM2} m²</b>, phân khu {zone.name}, Khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội.
          <br />
          Giá thuê công bố: <b>{vnd(unit.rent)}đ/tháng</b>. All-in Cost dự toán:{" "}
          <b>{vnd(cost.total)}đ/tháng</b> (đã bao gồm phí quản lý, phí gửi xe máy và ước tính điện nước).
        </p>
      </div>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>ĐIỀU 2. SỐ TIỀN CỌC VÀ PHƯƠNG THỨC THANH TOÁN</h4>
        <p>
          Số tiền đặt cọc giữ căn: <b>{vnd(dep.amount)}đ</b> (Hai triệu đồng chẵn).
          <br />
          Hình thức thanh toán: Chuyển khoản qua cổng VietQR động gắn mã định danh giao dịch{" "}
          <b>{dep.qrRef}</b> gạch nợ tự động vào tài khoản ủy thác của nền tảng.
          {dep.paidAt && (
            <>
              <br />
              Thời điểm hệ thống đối soát tự động ghi nhận thanh toán:{" "}
              <b>{fmtDateTime(dep.paidAt)}</b>.
            </>
          )}
        </p>
      </div>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>
          ĐIỀU 3. QUY CHẾ CHUYỂN ĐỔI TIỀN CỌC VÀ XỬ LÝ VI PHẠM (ĐIỀU 328 BLDS 2015)
        </h4>
        <p>
          1. <b>Chuyển đổi thành Tiền cọc bảo đảm:</b> Khi Bên B tiến hành ký Hợp đồng thuê căn hộ
          chính thức trong thời hạn giữ chỗ {HOLD_DAYS} ngày, toàn bộ khoản cọc {vnd(dep.amount)}đ sẽ được
          chuyển đổi 100% thành một phần của Tiền Cọc Bảo Đảm Tài Sản &amp; Nội Thất (Security Deposit).
          Khoản tiền này được giữ nguyên suốt kỳ hạn thuê và hoàn lại 100% khi thanh lý hợp đồng;{" "}
          <b>tuyệt đối không khấu trừ vào tiền thuê tháng đầu tiên</b>.
        </p>
        <p>
          2. <b>Mất cọc do lỗi Bên B:</b> Trong thời hạn giữ chỗ {HOLD_DAYS} ngày, nếu Bên B không thực
          hiện xác minh CCCD (eKYC) hoặc từ chối ký Hợp đồng thuê chính thức mà không do sự kiện bất khả
          kháng theo luật định, Bên B sẽ bị mất khoản tiền cọc 2.000.000đ theo quy định tại Khoản 2 Điều
          328 Bộ luật Dân sự 2015. Căn hộ sẽ tự động mở lại cho khách thuê khác.
        </p>
        <p>
          3. <b>Bồi thường do lỗi Bên A hoặc Chủ nhà:</b> Trường hợp Bên A hoặc Chủ căn hộ từ chối cho Bên
          B thuê mà không có lý do chính đáng hoặc hiện trạng căn hộ sai lệch nghiêm trọng so với thông tin
          thẩm định công bố, Bên A có trách nhiệm hoàn trả 100% số tiền cọc đã nhận và bồi thường một khoản
          tiền tương đương 2.000.000đ cho Bên B trong vòng 02 giờ làm việc.
        </p>
      </div>

      <div className={styles.paperSection}>
        <h4 className={styles.paperSectionTitle}>ĐIỀU 4. BẢO MẬT VÀ DỮ LIỆU CÁ NHÂN</h4>
        <p>
          Mọi dữ liệu cá nhân (ảnh CCCD, số điện thoại, thông tin hợp đồng) được VinStay AI mã hóa theo
          tiêu chuẩn AES-256 tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, tuyệt đối không
          tiết lộ cho bên thứ ba ngoài mục đích thực hiện giao dịch cho thuê.
        </p>
      </div>

      <footer className={styles.signatures}>
        <div className={styles.signParty}>
          <span className={styles.signRole}>ĐẠI DIỆN BÊN A</span>
          <span className={styles.signNote}>Nền tảng VinStay AI</span>
          <div className={styles.signBox}>
            <span className={styles.signStamp}>
              <CheckCircle2 size={14} /> Chữ ký số nền tảng
            </span>
            <span className={styles.signMeta}>Chứng thư số: VSA-CA-2026</span>
          </div>
        </div>

        <div className={styles.signParty}>
          <span className={styles.signRole}>NGƯỜI ĐẶT CỌC (BÊN B)</span>
          <span className={styles.signNote}>{bParty?.fullName || booking.tenant.name}</span>
          <div className={styles.signBox}>
            {signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature} alt="Chữ ký Bên B" className={styles.signImg} />
            ) : signedAt ? (
              <span className={styles.signStamp}>
                <CheckCircle2 size={14} /> Đã ký điện tử
              </span>
            ) : (
              <span className="muted small">Chưa ký</span>
            )}
            {signedAt && (
              <span className={styles.signMeta}>
                Ký lúc {fmtDateTime(signedAt)}
                <br />
                OTP Zalo {maskPhone(bParty?.phone || booking.tenant.phone)}
              </span>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}
