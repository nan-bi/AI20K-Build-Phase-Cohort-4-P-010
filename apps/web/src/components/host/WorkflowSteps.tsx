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
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { hostApi } from "@/lib/host/api";
import { hostErrorText } from "@/lib/host/logic";
import type { DoorAccessView, HostViewingDetail } from "@/lib/host/types";
import { useHostAction } from "@/lib/host/useHostAction";
import { dayLabel, fmtPhone, fmtTime } from "@/lib/mock/format";
import styles from "./Workflow.module.css";

interface StepProps {
  v: HostViewingDetail;
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

const DEPOSIT_TEXT: Record<string, string> = {
  PENDING_PAYMENT: "Khách đã đồng ý điều khoản, đang chờ quét VietQR",
  UNC_PENDING_REVIEW: "Đang đối soát chuyển khoản",
  PAID_HOLDING: "Đã nhận cọc 2.000.000đ — căn đang được giữ",
  QR_EXPIRED: "Mã VietQR đã hết hạn, khách cần tạo lại",
  CONVERTED_TO_CONTRACT: "Cọc đã chuyển thành tiền cọc bảo đảm",
  REFUNDED: "Cọc đã hoàn",
  FORFEITED: "Khách mất cọc do hết hạn giữ chỗ",
};

// ─── 1. Đón khách tại sảnh ────────────────────────────────────────────────────────────────────

export function GreetStep({ v, now }: StepProps) {
  const { busy, run } = useHostAction(v.ref);
  const slotMs = Date.parse(v.slot);
  const lobby = v.status === "lobby";
  const overdue = v.canNoShow;
  const t = v.timeline;
  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Footprints size={22} />}
        title={`Đón khách tại sảnh toà ${v.unit.building}`}
        hint="Xuống sảnh trước giờ hẹn 10 phút, mặc đồng phục VinStay và mang thẻ cư dân."
      />

      <div
        className={`${styles.presence} ${lobby ? styles.presenceOn : t.lateRequestedAt ? styles.presenceLate : ""}`}
        role="status"
      >
        {lobby ? <CheckCircle2 size={22} /> : <Clock size={22} />}
        <div>
          <b>{lobby ? "Khách đã có mặt tại sảnh" : t.lateRequestedAt ? "Khách xin trễ 10 phút" : "Khách chưa báo có mặt"}</b>
          <p className="small">
            {lobby && t.lobbyCheckInAt
              ? `Khách bấm "Tôi đã tới sảnh" lúc ${fmtTime(t.lobbyCheckInAt)}. Hãy xuống đón ngay.`
              : t.lateRequestedAt
                ? "Khách đang trên đường tới sảnh. Ca trực có thể giải phóng nếu quá 15 phút sau giờ hẹn."
                : slotMs > now
                  ? `Còn ${mmss(slotMs - now)} tới giờ hẹn ${fmtTime(v.slot)}.`
                  : `Đã qua giờ hẹn ${Math.floor((now - slotMs) / 60_000)} phút.`}
          </p>
        </div>
      </div>

      <ul className={styles.checklist}>
        <li className={t.reminderSentAt ? styles.ok : ""}>
          <AlarmClock size={16} />
          {t.reminderSentAt
            ? `Đã ghi nhận nhắc hẹn T-10 lúc ${fmtTime(t.reminderSentAt)}`
            : "Nhắc hẹn T-10 tự ghi nhận khi còn 10 phút tới giờ hẹn (mở bảng lịch lúc đó, hoặc bấm tay bên dưới)"}
        </li>
        <li className={t.confirmedAt ? styles.ok : ""}>
          <BadgeCheck size={16} /> SĐT khách đã xác thực OTP Zalo: {v.tenant.phone ? fmtPhone(v.tenant.phone) : "—"}
        </li>
      </ul>

      {overdue && (
        <div className={styles.warn}>
          <CircleAlert size={18} />
          <div>
            <b>Quá 15 phút, khách chưa có mặt</b>
            <p className="small">Giải phóng ca để nhận khách khác.</p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => void run(() => hostApi.noShow(v.ref), "Đã giải phóng ca trực", (d) => d)}
            >
              Giải phóng ca (khách bỏ hẹn)
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={busy}
        onClick={() => void run(() => hostApi.receive(v.ref), `Đã ghi nhận lượt dẫn khách lúc ${fmtTime(new Date())}`, (d) => d)}
      >
        <Footprints size={19} /> Đã đón khách — bắt đầu dẫn
      </button>

      {v.status === "confirmed" && (
        <div className={styles.demoRow}>
          <button
            type="button"
            className={styles.demo}
            disabled={busy || !v.canRemind || Boolean(t.reminderSentAt)}
            onClick={() => void run(() => hostApi.remind(v.ref), "Đã ghi nhận nhắc hẹn T-10", (d) => d)}
          >
            Ghi nhận nhắc hẹn T-10
          </button>
          {!v.canRemind && <span className="xs muted">(chỉ trong 10 phút trước giờ hẹn)</span>}
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

export function NotInterestedModal({
  v,
  open,
  onClose,
  title,
  cta,
}: {
  v: HostViewingDetail;
  open: boolean;
  onClose: () => void;
  title: string;
  cta: string;
}) {
  const { busy, run } = useHostAction(v.ref);
  const [reason, setReason] = useState(NOT_DECIDED[0]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title={title}
      description="Ca xem được đóng và ghi lý do vào nhật ký."
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy}
          onClick={async () => {
            const res = await run(() => hostApi.notInterested(v.ref, reason), "Đã kết thúc buổi xem", (d) => d);
            if (res.ok) onClose();
          }}
        >
          {cta}
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
  );
}

export function ViewStep({ v, now }: StepProps) {
  const { busy, run } = useHostAction(v.ref);
  const [emergency, setEmergency] = useState(false);
  const [decline, setDecline] = useState(false);
  // CẤM lưu PIN vào kho lưu trữ của trình duyệt hay cache truy vấn: chỉ giữ trong state của component, mất khi rời trang.
  const [door, setDoor] = useState<DoorAccessView | null>(null);
  const smart = v.unit.lockType === "ELECTRONIC_PIN";
  const doorLeft = door ? Date.parse(door.expiresAt) - now : 0;
  const pinVisible = Boolean(door?.pin) && doorLeft > 0;

  async function openDoor() {
    const res = await run(() => hostApi.openDoor(v.ref), "Đã mở quyền truy cập mã cửa", (d) => d.viewing);
    if (res.ok) setDoor(res.data.door);
    else if (res.code === "door_code_missing") setEmergency(true);
  }

  async function revealAgain() {
    const res = await run(() => hostApi.doorCode(v.ref));
    if (res.ok) setDoor(res.data);
    else if (res.code === "door_code_missing") setEmergency(true);
  }

  if (v.status === "receiving") {
    return (
      <section className={`card ${styles.step}`}>
        <StepHead
          icon={<DoorOpen size={22} />}
          title="Dẫn khách lên phòng"
          hint="Dẫn khách tới trước cửa căn hộ rồi bấm nút xác nhận để lấy mã mở cửa."
        />

        {v.timeline.receivingAt && (
          <div className={styles.presence} role="status">
            <Footprints size={20} />
            <div>
              <b>Đang dẫn khách</b>
              <p className="small">Bắt đầu dẫn khách lúc {fmtTime(v.timeline.receivingAt)}.</p>
            </div>
          </div>
        )}

        <div className={styles.lockInfo}>
          <p className="small" style={{ lineHeight: 1.6 }}>
            Quẹt thẻ cư dân lên tầng {v.unit.floor}, tới trước cửa căn {v.unit.code.slice(-2)} rồi bấm nút dưới.
            {!smart && ` Nhận chìa tại quầy phân khu ${v.unit.zone}.`}
          </p>
        </div>

        <button type="button" className="btn btn-amber btn-lg btn-block" disabled={busy} onClick={() => void openDoor()}>
          <DoorOpen size={19} /> Đã tới cửa — lấy mã cửa
        </button>
        <p className="muted xs">Khi bạn bấm xác nhận, hệ thống cấp mã mở cửa và ghi lượt mở cửa vào nhật ký để chủ nhà xem lại.</p>
        <EmergencyModal v={v} smart={smart} open={emergency} onClose={() => setEmergency(false)} />
      </section>
    );
  }

  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Lock size={22} />}
        title="Xem phòng cùng khách"
        hint="Khách xem thoải mái, không ép cọc. Khi khách ưng ý, bấm “Khách muốn cọc”."
      />

      {smart ? (
        <div className={`${styles.code} ${pinVisible ? "" : styles.codeGone}`}>
          <span className="small">Mã cửa căn {v.unit.code.slice(-2)}</span>
          {pinVisible ? (
            <>
              <b className={`num ${styles.digits}`}>{door!.pin!.split("").join(" ")} #</b>
              <span className="small">Tự ẩn sau {mmss(doorLeft)}</span>
            </>
          ) : (
            <>
              <b className={styles.expired}>{door ? "Mã đã ẩn sau 10 phút" : "Mã đang được ẩn"}</b>
              <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => void revealAgain()}>
                <KeyRound size={15} /> Xem lại mã
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.code}>
          <KeyRound size={26} />
          <b>Dùng chìa cơ đã nhận tại quầy phân khu {v.unit.zone}</b>
          <span className="small">Trả chìa sau khi kết thúc buổi xem.</span>
        </div>
      )}

      <ul className={styles.notified}>
        <li>
          <CheckCircle2 size={15} /> Đã ghi lượt mở cửa{v.doorRevealedAt ? ` lúc ${fmtTime(v.doorRevealedAt)}` : ""} vào nhật ký của chủ nhà
        </li>
      </ul>

      <button type="button" className={styles.sos} onClick={() => setEmergency(true)}>
        <LifeBuoy size={17} /> Không mở được cửa? Hỗ trợ khẩn cấp
      </button>

      <div className={styles.decide}>
        <button
          type="button"
          className="btn btn-success btn-lg btn-block"
          disabled={busy}
          onClick={() => void run(() => hostApi.startDeposit(v.ref), "Khách đã được chuyển sang bước cọc trên app của họ", (d) => d)}
        >
          <BadgeCheck size={20} /> Khách muốn cọc
        </button>
        <button type="button" className="btn btn-quiet btn-block" onClick={() => setDecline(true)}>
          Khách chưa quyết định
        </button>
      </div>

      <EmergencyModal v={v} smart={smart} open={emergency} onClose={() => setEmergency(false)} />
      <NotInterestedModal v={v} open={decline} onClose={() => setDecline(false)} title="Khách chưa quyết định" cta="Kết thúc buổi xem" />
    </section>
  );
}

function EmergencyModal({ v, smart, open, onClose }: { v: HostViewingDetail; smart: boolean; open: boolean; onClose: () => void }) {
  const { busy, run } = useHostAction(v.ref);
  async function send(kind: "smart_lock" | "physical_key") {
    const res = await run(() => hostApi.emergency(v.ref, kind));
    if (res.ok) {
      toast(res.data.message, "success");
      onClose();
    } else {
      toast(hostErrorText(res));
    }
  }
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="Hỗ trợ khẩn cấp" description="Chọn tình huống để ghi vào nhật ký ca xem.">
      <div className={styles.sosList}>
        <button type="button" className="btn btn-quiet btn-block" disabled={!smart || busy} onClick={() => void send("smart_lock")}>
          Khoá điện tử báo lỗi / chưa có mã hợp lệ
        </button>
        <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => void send("physical_key")}>
          Chìa cơ thất lạc
        </button>
      </div>
    </Modal>
  );
}

// ─── 3. Chờ cọc (CHỈ ĐỌC — khách tự quét VietQR, Host không đụng tiền) ──────────────────────────

export function AwaitDepositStep({ v }: StepProps) {
  const [decline, setDecline] = useState(false);
  const dep = v.deposit;
  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<Clock size={22} />}
        title="Đang chờ khách thanh toán cọc"
        hint={`Khách đồng ý điều khoản và quét VietQR trên lịch hẹn ${v.ref} của họ. Căn tự khoá khi tiền về qua webhook ngân hàng.`}
      />

      <div className={styles.waiting} role="status">
        <LoaderCircle size={22} className={styles.spin} />
        <div>
          <b>{dep ? (DEPOSIT_TEXT[dep.status] ?? dep.status) : "Đang chờ khách quét VietQR trên thiết bị của họ"}</b>
          <p className="small">Khoản cọc 2.000.000đ vào tài khoản định danh nền tảng. Bạn không cần (và không thể) xác nhận thanh toán thay khách.</p>
        </div>
      </div>

      <p className="muted small">
        Khoản 2.000.000đ chuyển 100% thành một phần của Tiền cọc bảo đảm tài sản khi ký hợp đồng chính thức, tuyệt đối không trừ vào tiền thuê tháng đầu.
      </p>

      <button type="button" className="btn btn-quiet btn-block" onClick={() => setDecline(true)}>
        Khách không cọc nữa
      </button>
      <NotInterestedModal v={v} open={decline} onClose={() => setDecline(false)} title="Khách không cọc nữa" cta="Đóng ca xem" />
    </section>
  );
}

// ─── 4. Chờ hợp đồng thuê (holding — CHỈ ĐỌC) ───────────────────────────────────────────────────

export function AwaitLeaseStep({ v, now }: StepProps) {
  const expires = v.deposit?.holdExpiresAt ? Date.parse(v.deposit.holdExpiresAt) : null;
  const hoursLeft = expires ? Math.max(0, Math.ceil((expires - now) / 3_600_000)) : null;
  return (
    <section className={`card ${styles.step}`}>
      <StepHead
        icon={<FileText size={22} />}
        title="Đã cọc giữ chỗ"
        hint={`Khách đã thanh toán cọc giữ chỗ 2.000.000đ qua VietQR (lịch ${v.ref}).`}
      />
      <div className={styles.presence} role="status">
        <Clock size={20} />
        <div>
          <b>{hoursLeft == null ? "Đang chờ khách làm hợp đồng thuê" : `Còn ${hoursLeft} giờ để khách làm hợp đồng thuê`}</b>
          <p className="small">
            Khách tự thực hiện eKYC (xác minh CCCD 2 mặt) và ký số hợp đồng thuê trên app của khách. Hết hạn mà chưa ký thì khách mất cọc và căn tự mở lại.
          </p>
        </div>
      </div>
      {v.contract && (
        <ul className={styles.checklist}>
          <li className={styles.ok}>
            <CheckCircle2 size={16} /> Hợp đồng thuê đã được tạo ({v.contract.status})
          </li>
        </ul>
      )}
    </section>
  );
}

// ─── 5. Hoàn tất & đóng ───────────────────────────────────────────────────────────────────────

export function DoneStep({ v }: StepProps) {
  return (
    <section className={`card ${styles.step} ${styles.doneCard}`}>
      <span className={styles.bigCheck}>
        <CheckCircle2 size={40} />
      </span>
      <h2>Chốt deal thành công</h2>
      <p className="muted">
        Căn {v.unit.code} đã được thuê. Việc tiếp theo: hẹn khách lập Hộ chiếu bàn giao số 10 hạng mục khi nhận nhà.
      </p>
      <div className={styles.row2}>
        <Link href="/host/dispatch" className="btn btn-primary">
          Về lịch
        </Link>
      </div>
    </section>
  );
}

export function ClosedStep({ v, now }: StepProps) {
  const label: Record<string, string> = {
    completed: "Buổi xem đã kết thúc",
    no_show: "Khách bỏ hẹn, ca đã giải phóng",
    cancelled: "Lịch đã bị huỷ",
    rejected: "Lịch đã bị từ chối",
  };
  return (
    <section className={`card ${styles.step}`}>
      <h2>{label[v.status] ?? "Ca đã đóng"}</h2>
      {v.closedReason && <p className="muted">{v.closedReason}</p>}
      <p className="muted small">
        Lịch {v.ref} · {fmtTime(v.slot)} {dayLabel(v.slot, now).toLowerCase()}
      </p>
      <Link href="/host/dispatch" className="btn btn-primary">
        Về danh sách lịch
      </Link>
    </section>
  );
}
