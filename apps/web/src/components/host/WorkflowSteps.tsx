"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlarmClock,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Clock,
  DoorOpen,
  FileText,
  Footprints,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { DepositAgreementDoc } from "@/components/deal/DepositAgreementDoc";
import { PrintDocButton } from "@/components/deal/PrintDocButton";
import {
  confirmDepositPaid,
  hostConfirmViewing,
  hostEmergency,
  hostMarkNoShow,
  hostNotInterested,
  hostStartDeposit,
  hostStartReceiving,
  sendReminder,
  tenantCheckIn,
} from "@/lib/mock/actions";
import { HOLD_DAYS } from "@/lib/mock/cost";
import { dayLabel, fmtTime, vnd } from "@/lib/mock/format";
import { holdDaysLeft, hostEarnings, isHoldForfeited } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostById, zoneById, type Unit } from "@/lib/mock/units";
import styles from "./Workflow.module.css";

interface StepProps {
  booking: Booking;
  unit: Unit;
  now: number;
}

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function StepHead({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <header className={styles.stepHead}>
      <span className={styles.stepIcon}>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p className="muted small">{hint}</p>
      </div>
    </header>
  );
}

// ─── 1. Đón khách tại sảnh ────────────────────────────────────────────────────────────────────

export function GreetStep({ booking, unit, now }: StepProps) {
  const slotMs = new Date(booking.slot).getTime();
  const lobby = booking.status === "lobby";
  const overdue = booking.status === "confirmed" && now - slotMs > 15 * 60_000;
  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Footprints size={22} />}
        title={`Đón khách tại sảnh toà ${unit.building}`}
        hint="Xuống sảnh trước giờ hẹn 10 phút, mặc đồng phục VinStay và mang thẻ cư dân."
      />

      <div
        className={`${styles.presence} ${lobby ? styles.presenceOn : booking.lateRequested ? styles.presenceLate : ""}`}
        role="status"
      >
        {lobby ? <CheckCircle2 size={22} /> : <Clock size={22} />}
        <div>
          <b>{lobby ? "Khách đã có mặt tại sảnh" : booking.lateRequested ? "Khách xin trễ 10 phút" : "Khách chưa báo có mặt"}</b>
          <p className="small">
            {lobby && booking.lobbyAt
              ? `Khách bấm "Tôi đã tới sảnh" lúc ${fmtTime(booking.lobbyAt)}. Hãy xuống đón ngay.`
              : booking.lateRequested
                ? "Khách đang trên đường tới sảnh. Ca trực tự giải phóng nếu quá 15 phút sau giờ hẹn."
                : slotMs > now
                  ? `Còn ${mmss(slotMs - now)} tới giờ hẹn ${fmtTime(booking.slot)}.`
                  : `Đã qua giờ hẹn ${Math.floor((now - slotMs) / 60_000)} phút.`}
          </p>
        </div>
      </div>

      <ul className={styles.checklist}>
        <li className={booking.reminderSentAt ? styles.ok : ""}>
          <AlarmClock size={16} />
          {booking.reminderSentAt
            ? `Đã gửi nhắc hẹn kép T-10 lúc ${fmtTime(booking.reminderSentAt)}: push cho bạn và Zalo có nút 1-chạm cho khách`
            : "Nhắc hẹn kép T-10 sẽ tự gửi khi còn 10 phút tới giờ hẹn"}
        </li>
        <li className={booking.confirmedAt ? styles.ok : ""}>
          <BadgeCheck size={16} /> SĐT khách đã xác thực OTP Zalo: {booking.tenant.phone.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3")}
        </li>
      </ul>

      {overdue && (
        <div className={styles.warn}>
          <CircleAlert size={18} />
          <div>
            <b>Quá 15 phút, khách chưa có mặt</b>
            <p className="small">Giải phóng ca để nhận khách khác. SĐT khách sẽ bị gắn cờ uy tín.</p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                hostMarkNoShow(booking.id);
                toast("Đã giải phóng ca trực");
              }}
            >
              Giải phóng ca (khách bỏ hẹn)
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={() => {
          hostStartReceiving(booking.id);
          toast(`Đã ghi nhận lượt dẫn khách lúc ${fmtTime(new Date())}`, "success");
        }}
      >
        <Footprints size={19} /> Bắt đầu dẫn khách
      </button>

      {booking.status === "confirmed" && (
        <div className={styles.demoRow}>
          <span className="xs muted">Demo</span>
          {!booking.reminderSentAt && (
            <button type="button" className={styles.demo} onClick={() => sendReminder(booking.id)}>
              Gửi nhắc hẹn T-10 ngay
            </button>
          )}
          <button type="button" className={styles.demo} onClick={() => tenantCheckIn(booking.id)}>
            Giả lập khách bấm “Tôi đã có mặt”
          </button>
        </div>
      )}
    </section>
  );
}

// ─── 2. Xem phòng & mở cửa ────────────────────────────────────────────────────────────────────

const NOT_DECIDED = [
  "Khách cần bàn với gia đình",
  "Khách muốn xem thêm căn khác",
  "Giá chưa phù hợp",
  "Khách chưa cần thuê ngay",
];

export function ViewStep({ booking, unit, now }: StepProps) {
  const [emergency, setEmergency] = useState(false);
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState(NOT_DECIDED[0]);
  const smart = unit.lock === "smart";
  const zone = zoneById(unit.zoneId);

  // Khi đang ở trạng thái receiving (chưa tới cửa mở phòng)
  if (booking.status === "receiving") {
    return (
      <section className={`card ${styles.step}`}>
        <StepHead
          icon={<DoorOpen size={22} />}
          title="Dẫn khách lên phòng"
          hint="Dẫn khách tới trước cửa căn hộ rồi bấm nút xác nhận để lấy mã mở cửa."
        />

        {booking.receivingAt && (
          <div className={styles.presence} role="status">
            <Footprints size={20} />
            <div>
              <b>Đang dẫn khách</b>
              <p className="small">Bắt đầu dẫn khách lúc {fmtTime(booking.receivingAt)}.</p>
            </div>
          </div>
        )}

        <div className={styles.lockInfo}>
          <p className="small" style={{ lineHeight: 1.6 }}>
            Quẹt thẻ cư dân lên tầng {unit.floor}, tới trước cửa căn {unit.door} rồi bấm nút dưới.
            {!smart && ` Nhận chìa tại quầy phân khu ${zone.short}.`}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-amber btn-lg btn-block"
          onClick={() => {
            hostConfirmViewing(booking.id);
            toast("Đã mở quyền truy cập mã cửa", "success");
          }}
        >
          <DoorOpen size={19} /> Đã tới cửa — lấy mã cửa
        </button>
        <p className="muted xs">Khi bạn bấm xác nhận, hệ thống cấp mã mở cửa và tự động thông báo cho chủ nhà qua Zalo.</p>
      </section>
    );
  }

  // Khi đã ở trạng thái viewing (đã mở cửa, đang xem phòng)
  const exp = booking.doorCodeExpiresAt ? new Date(booking.doorCodeExpiresAt).getTime() : 0;
  const left = exp - now;

  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Lock size={22} />}
        title="Xem phòng cùng khách"
        hint="Khách xem thoải mái, không ép cọc. Khi khách ưng ý, bấm “Khách cọc căn này”."
      />

      {smart ? (
        <div className={`${styles.code} ${left <= 0 ? styles.codeGone : ""}`}>
          <span className="small">Mã cửa căn {unit.door}</span>
          {left > 0 ? (
            <>
              <b className={`num ${styles.digits}`}>{booking.doorCode?.split("").join(" ")} #</b>
              <span className="small">Tự ẩn sau {mmss(left)}</span>
            </>
          ) : (
            <b className={styles.expired}>Mã đã ẩn sau 10 phút</b>
          )}
        </div>
      ) : (
        <div className={styles.code}>
          <KeyRound size={26} />
          <b>Dùng chìa cơ đã nhận tại quầy phân khu {zone.short}</b>
          <span className="small">Trả chìa sau khi kết thúc buổi xem.</span>
        </div>
      )}

      <ul className={styles.notified}>
        <li>
          <CheckCircle2 size={15} /> Đã báo chủ nhà qua Zalo{booking.viewingAt ? ` lúc ${fmtTime(booking.viewingAt)}` : ""}
        </li>
        <li>
          <CheckCircle2 size={15} /> Đã ghi lượt mở cửa lên bảng điều khiển Admin
        </li>
      </ul>

      <button type="button" className={styles.sos} onClick={() => setEmergency(true)}>
        <LifeBuoy size={17} /> Không mở được cửa? Hỗ trợ khẩn cấp
      </button>

      <div className={styles.decide}>
        <button
          type="button"
          className="btn btn-success btn-lg btn-block"
          onClick={() => {
            hostStartDeposit(booking.id);
            toast("Đã gửi yêu cầu cọc sang app của khách", "success");
          }}
        >
          <BadgeCheck size={20} /> Khách cọc căn này
        </button>
        <button type="button" className="btn btn-quiet btn-block" onClick={() => setDecline(true)}>
          Khách chưa quyết định
        </button>
      </div>

      <Modal
        open={emergency}
        onClose={() => setEmergency(false)}
        variant="sheet"
        title="Hỗ trợ khẩn cấp"
        description="Chọn tình huống, hệ thống báo đúng người xử lý."
      >
        <div className={styles.sosList}>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            disabled={!smart}
            onClick={() => {
              hostEmergency(booking.id, "smart_lock");
              setEmergency(false);
              toast("Đang kết nối cuộc gọi bảo mật tới chủ nhà để lấy mã khẩn cấp", "success");
            }}
          >
            Khoá điện tử báo lỗi: gọi bảo mật tới chủ nhà
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              hostEmergency(booking.id, "physical_key");
              setEmergency(false);
              toast("Area Lead sẽ mang chìa dự phòng tới trong ≤ 5 phút", "success");
            }}
          >
            Chìa cơ thất lạc: báo Area Lead mang chìa dự phòng
          </button>
        </div>
      </Modal>

      <Modal
        open={decline}
        onClose={() => setDecline(false)}
        variant="sheet"
        title="Khách chưa quyết định"
        description="Zalo sẽ cảm ơn khách kèm gợi ý 2 căn tương đương."
        footer={
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              hostNotInterested(booking.id, reason);
              setDecline(false);
            }}
          >
            Kết thúc buổi xem
          </button>
        }
      >
        <div className={styles.sosList}>
          {NOT_DECIDED.map((r) => (
            <label key={r} className="check">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </Modal>
    </section>
  );
}

// ─── 3. Chờ cọc (AwaitDepositStep - KHÔNG có VietQR) ──────────────────────────────────────────

export function AwaitDepositStep({ booking }: StepProps) {
  const consentOk = Boolean(booking.depositConsentAt);
  const paidOk = Boolean(booking.deposit?.paidAt);

  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Clock size={22} />}
        title="Đang chờ khách thanh toán cọc"
        hint={`Khách đồng ý điều khoản và quét VietQR trên lịch hẹn ${booking.ref} của họ. Căn tự khoá ${HOLD_DAYS} ngày khi tiền về.`}
      />

      <div className={styles.waiting} role="status">
        <LoaderCircle size={22} className={styles.spin} />
        <div>
          <b>Đang chờ khách quét VietQR trên thiết bị của họ</b>
          <p className="small">
            Khoản cọc 2.000.000đ sẽ chuyển vào tài khoản định danh nền tảng và giữ căn trong {HOLD_DAYS} ngày.
          </p>
        </div>
      </div>

      <ul className={styles.checklist}>
        <li className={consentOk ? styles.ok : ""}>
          {consentOk ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          <span>
            {consentOk
              ? `Khách đã đồng ý điều khoản cọc lúc ${fmtTime(booking.depositConsentAt!)}`
              : "Khách đang đọc và đồng ý điều khoản đặt cọc"}
          </span>
        </li>
        <li className={paidOk ? styles.ok : ""}>
          {paidOk ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          <span>
            {paidOk
              ? `Ngân hàng đã báo có lúc ${fmtTime(booking.deposit!.paidAt!)}`
              : "Đang chờ chuyển khoản 2.000.000đ"}
          </span>
        </li>
      </ul>

      <p className="muted small">
        Khoản 2.000.000đ chuyển 100% thành một phần của Tiền cọc bảo đảm tài sản khi ký hợp đồng chính thức, tuyệt đối không trừ vào tiền thuê tháng đầu.
      </p>

      <div className={styles.demoRow}>
        <span className="xs muted">Demo</span>
        <button
          type="button"
          className={styles.demo}
          disabled={!consentOk}
          onClick={() => {
            confirmDepositPaid(booking.id, "webhook");
            toast(`Ngân hàng báo có: căn đã khoá ${HOLD_DAYS} ngày`, "success");
          }}
        >
          Giả lập ngân hàng báo có
        </button>
        {!consentOk && (
          <span className="xs muted" style={{ fontStyle: "italic" }}>
            (Chờ khách đồng ý điều khoản trên app)
          </span>
        )}
        <button
          type="button"
          className={styles.demo}
          onClick={() => {
            confirmDepositPaid(booking.id, "host_receipt");
            toast("Đã xác nhận thấy UNC: căn chuyển sang giữ tạm để đối soát");
          }}
        >
          Webhook chậm: xác nhận đã thấy UNC
        </button>
      </div>
    </section>
  );
}

// ─── 4. Chờ ký thỏa thuận cọc (AwaitAgreementStep - holding) ────────────────────────────────────

export function AwaitAgreementStep({ booking, now }: StepProps) {
  const daysLeft = holdDaysLeft(booking, now);

  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<ShieldCheck size={22} />}
        title="Căn đã khoá giữ chỗ"
        hint={`Căn đã khoá ${HOLD_DAYS} ngày cho khách ${booking.tenant.name}.`}
      />

      <div className={styles.presence} role="status">
        <CheckCircle2 size={22} />
        <div>
          <b>Căn đã khoá · còn {daysLeft} ngày</b>
          <p className="small">
            Khách đang điền thông tin và ký Thỏa thuận đặt cọc trên app của khách.
          </p>
        </div>
      </div>

      <ul className={styles.checklist}>
        <li className={styles.ok}>
          <CheckCircle2 size={16} /> Đã nhận tiền cọc giữ chỗ 2.000.000đ
        </li>
        <li>
          <Clock size={16} /> Đang chờ khách hoàn tất chữ ký điện tử trên điện thoại
        </li>
      </ul>

      <p className="muted small">
        Host không cần ký hộ. Hệ thống sẽ tự động cập nhật ngay khi khách ký xong thỏa thuận cọc.
      </p>
    </section>
  );
}

// ─── 5. Chờ hợp đồng thuê (AwaitLeaseStep - signed) ───────────────────────────────────────────

export function AwaitLeaseStep({ booking, unit, now }: StepProps) {
  const forfeited = isHoldForfeited(booking, now);
  const daysLeft = holdDaysLeft(booking, now);
  const hasKyc = Boolean(booking.kyc);
  const hasMismatch = Boolean(booking.kyc?.mismatch);

  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<FileText size={22} />}
        title="Thỏa thuận đặt cọc đã ký"
        hint={`Khách đã ký thỏa thuận cọc mã ${booking.agreement?.docId ?? booking.ref}.`}
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrintDocButton />
      </div>

      <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--r)" }}>
        <DepositAgreementDoc booking={booking} unit={unit} />
      </div>

      {forfeited ? (
        <div className={styles.warn} role="alert">
          <ShieldAlert size={20} />
          <div>
            <b>Hết hạn giữ căn — khách mất cọc, căn đã mở lại.</b>
            <p className="small">Thời hạn {HOLD_DAYS} ngày đã kết thúc mà khách chưa ký Hợp đồng thuê.</p>
          </div>
        </div>
      ) : (
        <div className={styles.presence} role="status">
          <Clock size={20} />
          <div>
            <b>Còn {daysLeft} ngày để khách làm hợp đồng thuê</b>
            <p className="small">
              Khách sẽ tự thực hiện eKYC (xác minh CCCD 2 mặt) và ký số hợp đồng thuê trên app của khách. Hết hạn mà chưa ký thì khách mất cọc và căn tự mở lại.
            </p>
          </div>
        </div>
      )}

      <ul className={styles.checklist}>
        <li className={styles.ok}>
          <CheckCircle2 size={16} /> Đã ký Thỏa thuận đặt cọc
        </li>
        {hasKyc && !hasMismatch && (
          <li className={styles.ok}>
            <CheckCircle2 size={16} /> Khách đã xác minh CCCD
          </li>
        )}
        {hasMismatch && (
          <li style={{ color: "var(--amber-700, #b45309)" }}>
            <CircleAlert size={16} /> Thông tin CCCD lệch với thỏa thuận cọc — Admin đang kiểm tra
          </li>
        )}
        {!hasKyc && !forfeited && (
          <li>
            <Clock size={16} /> Đang chờ khách thực hiện eKYC và ký HĐ thuê trên điện thoại
          </li>
        )}
      </ul>
    </section>
  );
}

// ─── 6. Hoàn tất & đóng ───────────────────────────────────────────────────────────────────────

export function DoneStep({ booking, unit }: StepProps) {
  const state = useMock();
  const [showDoc, setShowDoc] = useState(false);
  const host = hostById(booking.hostId)!;
  const e = hostEarnings(state, host, state.fees);
  const commission = Math.round(state.fees.dealCommission * e.multiplier);

  return (
    <section className={`card ${styles.step} ${styles.doneCard}`}>
      <span className={styles.bigCheck}>
        <CheckCircle2 size={40} />
      </span>
      <h2>Chốt deal thành công</h2>
      <p className="muted">
        Hợp đồng {booking.lease?.docId} đã ký số. Căn {unit.code} chuyển sang “đã cho thuê”; chủ nhà và Admin đã nhận thông báo.
      </p>

      {booking.agreement && (
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          style={{ alignSelf: "center" }}
          onClick={() => setShowDoc(true)}
        >
          <FileText size={15} /> Xem thỏa thuận cọc
        </button>
      )}

      <dl className={styles.payout}>
        <div>
          <dt>Hoa hồng chốt cọc</dt>
          <dd className="num">
            {vnd(commission)}đ
            {e.multiplier > 1 && <span className="muted xs"> (×{String(e.multiplier).replace(".", ",")} vì đánh giá ≥ 4,8★)</span>}
          </dd>
        </div>
        <div>
          <dt>Thù lao lượt dẫn</dt>
          <dd className="num">{vnd(state.fees.baseViewingFee)}đ</dd>
        </div>
      </dl>
      <p className="muted xs">
        Tự động cộng vào ví tuần này theo cấu hình của Admin. Việc tiếp theo: hẹn khách lập Hộ chiếu bàn giao số 10 hạng mục khi nhận nhà.
      </p>
      <div className={styles.row2}>
        <Link href="/host/dispatch" className="btn btn-quiet">
          Về lịch
        </Link>
        <Link href="/host/earnings" className="btn btn-primary">
          Xem thu nhập
        </Link>
      </div>

      <Modal
        open={showDoc}
        onClose={() => setShowDoc(false)}
        variant="wide"
        title="Thỏa thuận đặt cọc"
        footer={<PrintDocButton />}
      >
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <DepositAgreementDoc booking={booking} unit={unit} />
        </div>
      </Modal>
    </section>
  );
}

export function ClosedStep({ booking, now }: StepProps) {
  const label: Record<string, string> = {
    completed: "Buổi xem đã kết thúc",
    no_show: "Khách bỏ hẹn, ca đã giải phóng",
    cancelled: "Lịch đã bị huỷ",
    rejected: "Bạn đã từ chối ticket này",
  };
  return (
    <section className={`card ${styles.step}`}>
      <h2>{label[booking.status]}</h2>
      {booking.closedReason && <p className="muted">{booking.closedReason}</p>}
      <p className="muted small">
        Lịch {booking.ref} · {fmtTime(booking.slot)} {dayLabel(booking.slot, now).toLowerCase()}
      </p>
      <Link href="/host/dispatch" className="btn btn-primary">
        Về danh sách lịch
      </Link>
    </section>
  );
}
