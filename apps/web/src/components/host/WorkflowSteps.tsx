"use client";

import Link from "next/link";
import { useState } from "react";
import { AlarmClock, BadgeCheck, CheckCircle2, CircleAlert, Clock, DoorOpen, Footprints, KeyRound, LifeBuoy, LoaderCircle, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { VietQR } from "@/components/payment/VietQR";
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
import { dayLabel, fmtTime, vnd } from "@/lib/mock/format";
import { hostEarnings } from "@/lib/mock/selectors";
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
      <StepHead icon={<Footprints size={22} />} title={`Đón khách tại sảnh toà ${unit.building}`} hint="Xuống sảnh trước giờ hẹn 10 phút, mặc đồng phục VinStay và mang thẻ cư dân." />

      <div className={`${styles.presence} ${lobby ? styles.presenceOn : booking.lateRequested ? styles.presenceLate : ""}`} role="status">
        {lobby ? <CheckCircle2 size={22} /> : <Clock size={22} />}
        <div>
          <b>{lobby ? "Khách đã có mặt tại sảnh" : booking.lateRequested ? "Khách xin trễ 10 phút" : "Khách chưa báo có mặt"}</b>
          <p className="small">
            {lobby && booking.lobbyAt
              ? `Khách bấm nút Zalo lúc ${fmtTime(booking.lobbyAt)}. Hãy xuống đón ngay.`
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
          {booking.reminderSentAt ? `Đã gửi nhắc hẹn kép T-10 lúc ${fmtTime(booking.reminderSentAt)}: push cho bạn và Zalo có nút 1-chạm cho khách` : "Nhắc hẹn kép T-10 sẽ tự gửi khi còn 10 phút tới giờ hẹn"}
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
            <button type="button" className="btn btn-danger btn-sm" onClick={() => { hostMarkNoShow(booking.id); toast("Đã giải phóng ca trực"); }}>
              Giải phóng ca (khách bỏ hẹn)
            </button>
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => hostStartReceiving(booking.id)}>
        <Footprints size={19} /> Bắt đầu tiếp đón
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

// ─── 2. Lên phòng và mở cửa ───────────────────────────────────────────────────────────────────

export function LiftStep({ booking, unit }: StepProps) {
  const [checks, setChecks] = useState([false, false, false]);
  const zone = zoneById(unit.zoneId);
  const smart = unit.lock === "smart";
  const items = [
    `Quẹt thẻ cư dân mở cửa an ninh sảnh toà ${unit.building}`,
    `Quẹt thẻ chọn tầng ${unit.floor} trong thang máy`,
    smart ? `Dẫn khách tới trước cửa căn ${unit.door}` : `Nhận chìa cơ tại quầy phân khu ${zone.short} rồi dẫn khách tới cửa căn ${unit.door}`,
  ];
  return (
    <section className={`card ${styles.step}`}>
      <StepHead icon={<DoorOpen size={22} />} title="Lên phòng và mở cửa" hint="Mã cửa chỉ hiện khi bạn đứng trước cửa và bấm xác nhận. Không dùng hộp khoá treo cửa." />
      <ul className={styles.tasks}>
        {items.map((t, i) => (
          <li key={t}>
            <label className="check">
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))} />
              <span>{t}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.lockInfo}>
        {smart ? <Smartphone size={18} /> : <KeyRound size={18} />}
        <span>{smart ? "Căn dùng khoá điện tử: mã số hiện ngay trên màn hình này sau khi bạn xác nhận và tự ẩn sau 10 phút." : `Căn dùng chìa cơ do quầy phân khu ${zone.short} giữ. Báo Area Lead nếu chìa không mở được.`}</span>
      </div>
      <button type="button" className="btn btn-amber btn-lg btn-block" disabled={!checks.every(Boolean)} onClick={() => hostConfirmViewing(booking.id)}>
        <DoorOpen size={19} /> Xác nhận xem phòng
      </button>
      <p className="muted xs">Khi bạn xác nhận, Zalo báo chủ nhà và Admin biết căn vừa được mở để đón khách.</p>
    </section>
  );
}

// ─── 3. Xem phòng & kết quả ───────────────────────────────────────────────────────────────────

const NOT_DECIDED = ["Khách cần bàn với gia đình", "Khách muốn xem thêm căn khác", "Giá chưa phù hợp", "Khách chưa cần thuê ngay"];

export function ViewStep({ booking, unit, now }: StepProps) {
  const [emergency, setEmergency] = useState(false);
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState(NOT_DECIDED[0]);
  const exp = booking.doorCodeExpiresAt ? new Date(booking.doorCodeExpiresAt).getTime() : 0;
  const left = exp - now;
  const smart = unit.lock === "smart";
  return (
    <section className={`card ${styles.step}`}>
      <StepHead icon={<Lock size={22} />} title="Xem phòng cùng khách" hint="Khách xem thoải mái, không ép cọc. Khi khách ưng ý, bấm “Khách chốt”." />

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
          <b>Dùng chìa cơ đã nhận tại quầy phân khu</b>
          <span className="small">Trả chìa sau khi xem xong.</span>
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
        <button type="button" className="btn btn-success btn-lg btn-block" onClick={() => hostStartDeposit(booking.id)}>
          <BadgeCheck size={20} /> Khách chốt căn này
        </button>
        <button type="button" className="btn btn-quiet btn-block" onClick={() => setDecline(true)}>
          Khách chưa quyết định
        </button>
      </div>

      <Modal open={emergency} onClose={() => setEmergency(false)} variant="sheet" title="Hỗ trợ khẩn cấp" description="Chọn tình huống, hệ thống báo đúng người xử lý.">
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

// ─── 4. Cọc VietQR ────────────────────────────────────────────────────────────────────────────

export function DepositStep({ booking, now }: StepProps) {
  const dep = booking.deposit!;
  const temp = dep.tempHoldUntil ? new Date(dep.tempHoldUntil).getTime() : 0;
  return (
    <section className={`card ${styles.step}`}>
      <StepHead icon={<ShieldCheck size={22} />} title="Thu cọc giữ chỗ 24 giờ" hint="Đưa mã cho khách quét bằng app ngân hàng. Tiền vào tài khoản định danh của nền tảng." />
      <VietQR amount={dep.amount} content={dep.content} qrRef={dep.qrRef} />

      <div className={styles.waiting} role="status">
        <LoaderCircle size={20} className={styles.spin} />
        <div>
          <b>{temp > now ? "Đã giữ tạm căn 30 phút" : "Đang chờ tiền về"}</b>
          <p className="small">{temp > now ? `Còn ${mmss(temp - now)} để đối soát UNC. Căn được giữ tạm trong lúc kiểm tra.` : "Webhook ngân hàng thường xác nhận trong 10 giây. Căn tự khoá 24 giờ khi tiền về."}</p>
        </div>
      </div>

      <p className="muted small">Khoản 2.000.000đ chuyển 100% thành Tiền cọc bảo đảm khi ký hợp đồng thuê, không trừ vào tiền thuê tháng đầu.</p>

      <div className={styles.demoRow}>
        <span className="xs muted">Demo</span>
        <button type="button" className={styles.demo} onClick={() => { confirmDepositPaid(booking.id, "webhook"); toast("Ngân hàng báo có: căn đã khoá 24 giờ", "success"); }}>
          Giả lập ngân hàng báo có
        </button>
        {!dep.tempHoldUntil && (
          <button type="button" className={styles.demo} onClick={() => { confirmDepositPaid(booking.id, "host_receipt"); toast("Đã giữ tạm căn 30 phút để đối soát UNC"); }}>
            Webhook chậm: xác nhận đã thấy UNC
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Hoàn tất & đóng ─────────────────────────────────────────────────────────────────────────

export function DoneStep({ booking, unit }: StepProps) {
  const state = useMock();
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
      <p className="muted xs">Tự động cộng vào ví tuần này theo cấu hình của Admin. Việc tiếp theo: hẹn khách lập Hộ chiếu bàn giao số 10 hạng mục khi nhận nhà.</p>
      <div className={styles.row2}>
        <Link href="/host/dispatch" className="btn btn-quiet">
          Về lịch
        </Link>
        <Link href="/host/earnings" className="btn btn-primary">
          Xem thu nhập
        </Link>
      </div>
    </section>
  );
}

export function ClosedStep({ booking, now }: StepProps) {
  const label: Record<string, string> = { completed: "Buổi xem đã kết thúc", no_show: "Khách bỏ hẹn, ca đã giải phóng", cancelled: "Lịch đã bị huỷ", rejected: "Bạn đã từ chối ticket này" };
  return (
    <section className={`card ${styles.step}`}>
      <h2>{label[booking.status]}</h2>
      {booking.closedReason && <p className="muted">{booking.closedReason}</p>}
      <p className="muted small">Lịch {booking.ref} · {fmtTime(booking.slot)} {dayLabel(booking.slot, now).toLowerCase()}</p>
      <Link href="/host/dispatch" className="btn btn-primary">
        Về danh sách lịch
      </Link>
    </section>
  );
}
