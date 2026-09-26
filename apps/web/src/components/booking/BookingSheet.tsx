"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, ChevronLeft, MessageCircleMore, Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { ZaloBubble } from "@/components/zalo/ZaloThread";
import { createBooking, requestOtp, verifyOtp } from "@/lib/mock/actions";
import { dayLabel, fmtDateTime, fmtPhone, fmtTime, isValidVnPhone, normalizePhone, weekday } from "@/lib/mock/format";
import { slotsForDay } from "@/lib/mock/selectors";
import { SLOT_TIMES, bookableDays } from "@/lib/mock/slots";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostForUnit, unitAddress, type Unit } from "@/lib/mock/units";
import { useDemoUser } from "@/lib/mock/useRole";
import { useNow } from "@/lib/useNow";
import styles from "./BookingSheet.module.css";

type Step = "slot" | "info" | "otp" | "done";
const STEP_LABEL: Record<Exclude<Step, "done">, string> = { slot: "Chọn giờ", info: "Thông tin", otp: "Xác thực Zalo" };

interface BookingSheetProps {
  unit: Unit;
  open: boolean;
  onClose: () => void;
}

export function BookingSheet({ unit, open, onClose }: BookingSheetProps) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title={`Đặt lịch xem căn ${unitAddress(unit)}`} hideClose={false}>
      {open && <Flow unit={unit} onClose={onClose} />}
    </Modal>
  );
}

function Flow({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const state = useMock();
  const demoUser = useDemoUser();
  const now = useNow(30_000);
  const host = hostForUnit(unit);

  const [step, setStep] = useState<Step>("slot");
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState(state.tenantProfile?.name ?? (demoUser?.role === "tenant" ? demoUser.name : ""));
  const [phone, setPhone] = useState(state.tenantProfile?.phone ?? (demoUser?.role === "tenant" ? (demoUser.phone ?? "") : ""));
  const [persons, setPersons] = useState(1);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({});
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const days = now ? bookableDays(now) : [];
  const day = days[dayIdx];
  const options = day && now ? slotsForDay(state, host.id, day, now) : [];
  const chosen = slot ? new Date(slot) : null;

  const p = normalizePhone(phone);
  const otpNotice = state.notices.find((n) => n.audience === "tenant" && n.toKey === p && n.title === "Mã xác thực VinStay AI");

  const sendOtp = () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Nhập họ tên để Host biết gọi bạn là gì.";
    if (!isValidVnPhone(phone)) next.phone = "Số điện thoại chưa đúng. Ví dụ: 0912 345 678.";
    if (!consent) next.consent = "Bạn cần đồng ý để tiếp tục.";
    setErrors(next);
    if (Object.keys(next).length) return;
    requestOtp(p, "booking");
    setCode("");
    setOtpError(false);
    setCooldown(30);
    setStep("otp");
  };

  const onCode = (v: string) => {
    setCode(v);
    setOtpError(false);
    if (v.length === 4) {
      if (verifyOtp(v) && slot) {
        setBooking(createBooking({ unitId: unit.id, slot, name, phone: p, persons, note }));
        setStep("done");
      } else {
        setOtpError(true);
      }
    }
  };

  const stepIndex = step === "slot" ? 0 : step === "info" ? 1 : 2;

  if (step === "done" && booking) {
    return (
      <div className={styles.done}>
        <span className={styles.doneIcon}>
          <CheckCircle2 size={44} />
        </span>
        <h3 className={styles.doneTitle}>Cảm ơn {booking.tenant.name.split(" ").slice(-1)[0]}, mình đã nhận yêu cầu của bạn</h3>
        <p className="muted">Field Host sẽ xác nhận trong vòng 3 phút. VinStay AI sẽ nhắn lại chi tiết người đón, vị trí sảnh và nút “Tôi đã có mặt tại sảnh” qua Zalo {fmtPhone(booking.tenant.phone)}.</p>
        <dl className={styles.summary}>
          <div>
            <dt>Mã lịch hẹn</dt>
            <dd className={`num ${styles.ref}`}>{booking.ref}</dd>
          </div>
          <div>
            <dt>Căn hộ</dt>
            <dd>{unitAddress(unit)}</dd>
          </div>
          <div>
            <dt>Thời gian</dt>
            <dd>{fmtDateTime(booking.slot)}</dd>
          </div>
          <div>
            <dt>Field Host</dt>
            <dd>{host.name}</dd>
          </div>
        </dl>
        <div className={styles.doneActions}>
          <Link href={`/booking/${booking.ref}`} className="btn btn-primary btn-lg btn-block">
            Theo dõi lịch hẹn
          </Link>
          <button type="button" className="btn btn-quiet btn-block" onClick={onClose}>
            Tiếp tục xem căn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.flow}>
      <ol className={styles.progress} aria-label="Các bước đặt lịch">
        {(Object.keys(STEP_LABEL) as (keyof typeof STEP_LABEL)[]).map((k, i) => (
          <li key={k} className={i <= stepIndex ? styles.on : ""} aria-current={i === stepIndex ? "step" : undefined}>
            <span />
            {STEP_LABEL[k]}
          </li>
        ))}
      </ol>

      {step === "slot" && (
        <>
          <div className={styles.hostRow}>
            <span className={styles.hostAvatar}>{host.name.split(" ").slice(-1)[0][0]}</span>
            <p className="small">
              <strong>{host.name}</strong> đón bạn tại sảnh toà {unit.building} <Star size={12} fill="currentColor" style={{ color: "var(--amber)", verticalAlign: "-1px" }} />{" "}
              {String(host.rating).replace(".", ",")}
              <br />
              <span className="muted">Có thẻ cư dân thang máy, đưa bạn lên phòng trong khoảng 60 giây.</span>
            </p>
          </div>

          <div className={styles.days} role="radiogroup" aria-label="Chọn ngày xem">
            {days.map((d, i) => (
              <button key={d.toISOString()} type="button" role="radio" aria-checked={i === dayIdx} className={`${styles.day} ${i === dayIdx ? styles.daySel : ""}`} onClick={() => { setDayIdx(i); setSlot(null); }}>
                <span className="xs">{i === 0 && dayLabel(d, now) === "Hôm nay" ? "Hôm nay" : weekday(d)}</span>
                <b className="num">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}</b>
              </button>
            ))}
          </div>

          {(["morning", "afternoon"] as const).map((part) => (
            <div key={part}>
              <h4 className={styles.part}>{part === "morning" ? "Buổi sáng" : "Buổi chiều"}</h4>
              <div className={styles.slots}>
                {options
                  .filter((o) => (SLOT_TIMES[part] as readonly string[]).includes(o.time))
                  .map((o) => (
                    <button key={o.iso} type="button" disabled={!o.available} aria-pressed={slot === o.iso} className={`${styles.slot} ${slot === o.iso ? styles.slotSel : ""}`} onClick={() => setSlot(o.iso)}>
                      <b className="tnum">{o.time}</b>
                      {!o.available && <span className="xs">{o.reason === "taken" ? "Đã kín" : "Quá gần giờ"}</span>}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <p className="muted xs">Khung giờ khớp ca trực của Host: sáng 08:30–11:30, chiều 14:00–18:00. Mỗi Host chỉ nhận một lịch trong 45 phút để luôn đón bạn đúng giờ.</p>
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!slot} onClick={() => setStep("info")}>
            {chosen ? `Tiếp tục với ${fmtTime(chosen)}` : "Chọn một khung giờ"}
          </button>
        </>
      )}

      {step === "info" && (
        <>
          <button type="button" className={`btn btn-ghost btn-sm ${styles.back}`} onClick={() => setStep("slot")}>
            <ChevronLeft size={16} /> Đổi giờ ({chosen ? fmtDateTime(chosen) : ""})
          </button>
          <label className="field">
            <span className="label">Họ và tên</span>
            <input className="input" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field">
            <span className="label">Số điện thoại (nhận mã qua Zalo)</span>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </label>
          <div className={styles.two}>
            <label className="field">
              <span className="label">Số người đi xem</span>
              <select className="select" value={persons} onChange={(e) => setPersons(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} người
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="label">Ghi chú cho Host (không bắt buộc)</span>
            <textarea className="textarea" rows={2} placeholder="Ví dụ: muốn xem kỹ ban công và máy giặt" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Tôi đồng ý để VinStay AI dùng số điện thoại này xác thực, đặt lịch và gửi tin Zalo theo Nghị định 13/2023/NĐ-CP.</span>
          </label>
          {errors.consent && <span className="field-error">{errors.consent}</span>}
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={sendOtp}>
            <MessageCircleMore size={18} /> Gửi mã xác thực qua Zalo
          </button>
        </>
      )}

      {step === "otp" && (
        <>
          <button type="button" className={`btn btn-ghost btn-sm ${styles.back}`} onClick={() => setStep("info")}>
            <ChevronLeft size={16} /> Sửa số điện thoại
          </button>
          <div>
            <h3 className={styles.otpTitle}>Nhập mã 4 số</h3>
            <p className="muted">
              VinStay AI vừa nhắn mã xác thực qua Zalo tới <b className="tnum">{fmtPhone(p)}</b>. Mã có hiệu lực 5 phút.
            </p>
          </div>
          <OtpInput value={code} onChange={onCode} error={otpError} autoFocus />
          {otpError && <p className="field-error">Mã chưa đúng. Kiểm tra lại tin nhắn Zalo rồi nhập lại.</p>}
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            disabled={cooldown > 0}
            onClick={() => {
              requestOtp(p, "booking");
              setCode("");
              setOtpError(false);
              setCooldown(30);
            }}
          >
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã"}
          </button>

          {otpNotice && (
            <div className={styles.demoZalo}>
              <p className="xs muted">
                <CalendarCheck size={13} style={{ verticalAlign: "-2px" }} /> Bản demo: tin Zalo mô phỏng bạn sẽ nhận
              </p>
              <ZaloBubble notice={otpNotice} now={now} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
