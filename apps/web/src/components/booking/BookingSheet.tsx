"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  FileText,
  MapPin,
  MessageCircleMore,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { ZaloBubble } from "@/components/zalo/ZaloThread";
import { createBooking, requestOtp, verifyOtp } from "@/lib/mock/actions";
import { fmtDateTime, fmtPhone, fmtTime, isValidVnPhone, normalizePhone } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostForUnit, unitAddress, type Unit } from "@/lib/mock/units";
import { useDemoUser } from "@/lib/mock/useRole";
import { useNow } from "@/lib/useNow";
import { SlotPicker } from "./SlotPicker";
import styles from "./BookingSheet.module.css";

type Step = "slot" | "info" | "otp" | "done";

const STEPS = [
  { key: "slot", label: "Chọn giờ" },
  { key: "info", label: "Thông tin" },
  { key: "otp", label: "Xác thực Zalo" },
] as const;

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

  const chosen = slot ? new Date(slot) : null;
  const p = normalizePhone(phone);
  const otpNotice = state.notices.find((n) => n.audience === "tenant" && n.toKey === p && n.title === "Mã xác thực VinStay AI");

  const sendOtp = () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Vui lòng nhập họ và tên để Field Host biết xưng hô khi đón bạn.";
    if (!isValidVnPhone(phone)) next.phone = "Số điện thoại chưa hợp lệ. Ví dụ đúng: 0912 345 678.";
    if (!consent) next.consent = "Vui lòng đồng ý điều khoản xác thực để tiếp tục.";
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
        <div className={styles.doneIconWrap}>
          <CheckCircle2 size={36} />
        </div>

        <div>
          <h3 className={styles.doneTitle}>
            Đặt lịch xem nhà thành công!
          </h3>
          <p className={styles.doneSub}>
            Field Host <strong>{host.name}</strong> sẽ xác nhận trong vòng 3 phút. VinStay AI sẽ nhắn thông báo và nút 1-chạm xác nhận có mặt qua Zalo <strong>{fmtPhone(booking.tenant.phone)}</strong>.
          </p>
        </div>

        <div className={styles.ticketCard}>
          <div className={styles.ticketHead}>
            <div className={styles.ticketTag}>
              <Sparkles size={13} />
              <span>VÉ HẸN XEM NHÀ NỘI KHU</span>
            </div>
            <div className={styles.ticketRef}>
              <span className="muted xs">Mã lịch</span>
              <span className={`num ${styles.refCode}`}>{booking.ref}</span>
            </div>
          </div>

          <div className={styles.ticketBody}>
            <div className={styles.ticketItem}>
              <div className={styles.ticketItemLabel}>
                <Calendar size={14} />
                <span>Thời gian hẹn</span>
              </div>
              <div className={styles.ticketItemVal}>{fmtDateTime(booking.slot)}</div>
            </div>

            <div className={styles.ticketItem}>
              <div className={styles.ticketItemLabel}>
                <MapPin size={14} />
                <span>Căn hộ & Toà</span>
              </div>
              <div className={styles.ticketItemVal}>
                {unitAddress(unit)}
                <span className={styles.ticketSubVal}>Sảnh toà {unit.building}</span>
              </div>
            </div>

            <div className={styles.ticketItem}>
              <div className={styles.ticketItemLabel}>
                <User size={14} />
                <span>Field Host phụ trách</span>
              </div>
              <div className={styles.ticketItemVal}>
                {host.name}
                <span className={styles.hostBadgeVerified}>
                  <Check size={11} /> Thẻ cư dân sẵn sàng
                </span>
              </div>
            </div>

            <div className={styles.ticketItem}>
              <div className={styles.ticketItemLabel}>
                <Users size={14} />
                <span>Số người tham quan</span>
              </div>
              <div className={styles.ticketItemVal}>{booking.tenant.persons} người</div>
            </div>
          </div>

          <div className={styles.ticketNotice}>
            <ShieldCheck size={16} className={styles.ticketNoticeIcon} />
            <p className={styles.ticketNoticeText}>
              <strong>Quy chuẩn tiếp đón VinStay AI:</strong> Field Host có mặt tại sảnh toà trước 10 phút, hỗ trợ quẹt thẻ thang máy dẫn lên xem căn trong 60 giây. Tuyệt đối không để bạn phải chờ đợi.
            </p>
          </div>
        </div>

        <div className={styles.doneActions}>
          <Link href={`/booking/${booking.ref}`} className="btn btn-primary btn-lg btn-block">
            Theo dõi trạng thái lịch hẹn
          </Link>
          <button type="button" className="btn btn-quiet btn-block" onClick={onClose}>
            Tiếp tục xem các căn khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.flow}>
      <ol className={styles.progress} aria-label="Các bước đặt lịch">
        {STEPS.map((s, i) => {
          const statusClass = i === stepIndex ? styles.active : i < stepIndex ? styles.completed : "";
          return (
            <li key={s.key} className={`${styles.stepItem} ${statusClass}`} aria-current={i === stepIndex ? "step" : undefined}>
              <div className={styles.stepBar} />
              <div className={styles.stepLabel}>
                <span className={styles.stepNumber}>
                  {i < stepIndex ? <Check size={10} /> : i + 1}
                </span>
                <span>{s.label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {step === "slot" && (
        <>
          <div className={styles.hostRow}>
            <span className={styles.hostAvatar}>{host.name.split(" ").slice(-1)[0][0]}</span>
            <div className={styles.hostInfo}>
              <div className={styles.hostInfoTitle}>
                <span>{host.name} đón bạn tại sảnh toà {unit.building}</span>
                <span className={styles.hostRating}>
                  <Star size={12} fill="currentColor" style={{ color: "var(--amber)", verticalAlign: "-1px" }} />
                  {String(host.rating).replace(".", ",")}
                </span>
              </div>
              <div className={styles.hostSub}>
                Có thẻ cư dân thang máy, quẹt thẻ đưa bạn lên phòng trong 60 giây.
              </div>
            </div>
          </div>

          {now > 0 && (
            <SlotPicker hostId={host.id} now={now} value={slot} onChange={setSlot} />
          )}

          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!slot} onClick={() => setStep("info")}>
            {chosen ? `Tiếp tục với ${fmtTime(chosen)}` : "Chọn một khung giờ"}
          </button>
        </>
      )}

      {step === "info" && (
        <>
          <div className={styles.slotRecapCard}>
            <div className={styles.slotRecapLeft}>
              <div className={styles.slotRecapIcon}>
                <Calendar size={18} />
              </div>
              <div className={styles.slotRecapMeta}>
                <div className={styles.slotRecapTime}>
                  {chosen ? fmtDateTime(chosen) : "Chưa chọn giờ"}
                </div>
                <div className={styles.slotRecapLocation}>
                  Sảnh toà {unit.building} · Host {host.name} đón
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.changeSlotBtn}
              onClick={() => setStep("slot")}
              title="Đổi khung giờ xem nhà"
            >
              <Pencil size={13} />
              <span>Đổi giờ</span>
            </button>
          </div>

          <div className={styles.formBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="booking-name">
                <User size={15} className={styles.labelIcon} />
                <span>Họ và tên người xem</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              <input
                id="booking-name"
                className={`input ${styles.formInput} ${errors.name ? styles.inputError : ""}`}
                autoComplete="name"
                autoFocus
                placeholder="Ví dụ: Nguyễn Văn An"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={!!errors.name}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.formLabel} htmlFor="booking-phone">
                  <Phone size={15} className={styles.labelIcon} />
                  <span>Số điện thoại (nhận Zalo OTP)</span>
                  <span className={styles.requiredStar}>*</span>
                </label>
                <span className={styles.zaloBadge}>Xác thực Zalo</span>
              </div>
              <input
                id="booking-phone"
                className={`input ${styles.formInput} ${errors.phone ? styles.inputError : ""}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                aria-invalid={!!errors.phone}
              />
              {errors.phone ? (
                <span className="field-error">{errors.phone}</span>
              ) : (
                <span className={styles.fieldHint}>
                  Field Host sẽ liên hệ qua Zalo trước 10 phút để đón bạn tại sảnh.
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Users size={15} className={styles.labelIcon} />
                <span>Số người đi xem cùng</span>
              </label>
              <div className={styles.segmentedGroup} role="radiogroup" aria-label="Số người đi xem">
                {[1, 2, 3, 4].map((n) => {
                  const label = n === 4 ? "4+ người" : `${n} người`;
                  const isSelected = persons === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`${styles.segmentedBtn} ${isSelected ? styles.segmentedBtnActive : ""}`}
                      onClick={() => setPersons(n)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.formLabel} htmlFor="booking-note">
                  <FileText size={15} className={styles.labelIcon} />
                  <span>Ghi chú cho Host</span>
                </label>
                <span className={styles.optionalBadge}>Không bắt buộc</span>
              </div>
              <textarea
                id="booking-note"
                className={`textarea ${styles.formTextarea}`}
                rows={2}
                placeholder="Ví dụ: muốn xem kỹ ban công, hướng nắng, mang theo thú cưng..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className={`${styles.securityCard} ${errors.consent ? styles.securityCardError : ""}`}>
              <div className={styles.securityHeader}>
                <ShieldCheck size={18} className={styles.securityIcon} />
                <span className={styles.securityTitle}>Bảo mật thông tin & Cam kết 0% spam môi giới</span>
              </div>
              <p className={styles.securityText}>
                VinStay AI mã hóa số điện thoại, tuyệt đối không chuyển giao cho môi giới tự do làm phiền. SĐT chỉ dùng để Field Host nội khu gửi mã Zalo OTP và đón bạn tại sảnh toà nhà.
              </p>
              <label className={styles.consentLabel}>
                <input
                  type="checkbox"
                  className={styles.consentCheckbox}
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
                  }}
                />
                <span className={styles.consentText}>
                  Tôi đồng ý xác thực số điện thoại và nhận thông báo lịch xem nhà qua Zalo theo Nghị định 13/2023/NĐ-CP.
                </span>
              </label>
              {errors.consent && <span className="field-error">{errors.consent}</span>}
            </div>

            <button type="button" className={`btn btn-primary btn-lg btn-block ${styles.submitBtn}`} onClick={sendOtp}>
              <MessageCircleMore size={18} />
              <span>Tiếp tục xác thực Zalo OTP</span>
            </button>
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <button type="button" className={styles.backBtn} onClick={() => setStep("info")}>
            <ChevronLeft size={16} /> Quay lại sửa thông tin
          </button>

          <div className={styles.otpHeader}>
            <div className={styles.otpBadge}>
              <MessageCircleMore size={14} />
              <span>Zalo OTP</span>
            </div>
            <h3 className={styles.otpTitle}>Nhập mã xác thực 4 số</h3>
            <p className={styles.otpSub}>
              VinStay AI vừa nhắn mã xác thực qua Zalo tới <b className="tnum">{fmtPhone(p)}</b>. Mã có hiệu lực trong 5 phút.
            </p>
          </div>

          <div className={styles.otpInputWrap}>
            <OtpInput value={code} onChange={onCode} error={otpError} autoFocus />
            {otpError && <p className="field-error">Mã chưa đúng. Kiểm tra lại tin nhắn Zalo rồi nhập lại.</p>}
            <button
              type="button"
              className={`btn btn-quiet btn-sm ${styles.resendBtn}`}
              disabled={cooldown > 0}
              onClick={() => {
                requestOtp(p, "booking");
                setCode("");
                setOtpError(false);
                setCooldown(30);
              }}
            >
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP qua Zalo"}
            </button>
          </div>

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
