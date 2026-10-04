"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  IdCard,
  MapPin,
  MessageCircleMore,
  Phone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { toast } from "@/components/ui/Toast";
import { accountApi } from "@/lib/apiClient";
import { fmtDateTime, fmtPhone, isValidVnPhone, normalizePhone } from "@/lib/mock/format";
import { unitAddress, type Unit } from "@/lib/mock/units";
import { useRole, useSession } from "@/lib/auth/client";
import { useNow } from "@/lib/useNow";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { errorText, tenantApi } from "@/lib/tenant/api";
import {
  invalidateTenantBookings,
  invalidateTenantUnit,
  tenantQueries,
} from "@/lib/tenant/queries";
import type { TenantBooking } from "@/lib/tenant/types";
import { SlotPicker } from "./SlotPicker";
import styles from "./BookingSheet.module.css";

type Step = "slot" | "info" | "otp" | "done";

const STEPS_BASE = [
  { key: "slot", label: "Chọn giờ" },
  { key: "info", label: "Thông tin" },
] as const;
const STEP_OTP = { key: "otp", label: "Xác thực Zalo" } as const;

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
  const { user } = useSession();
  const role = useRole();
  const isTenant = role === "tenant";
  const now = useNow(30_000);

  // A3: Busy slots
  const busySlotsQuery = useApiQuery(tenantQueries.busySlots(unit.code || unit.id));
  const busySlots = busySlotsQuery.state.status === "ready" ? busySlotsQuery.state.data.slots : [];

  const [step, setStep] = useState<Step>("slot");
  const [slot, setSlot] = useState<string | null>(null);

  // Profile data
  const [profile, setProfile] = useState<{ fullName?: string; isPhoneVerified?: boolean; phone?: string } | null>(null);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);

  useEffect(() => {
    if (isTenant) {
      accountApi.getProfile().then((res) => {
        if (res.ok && res.data) {
          setProfile(res.data);
          const fullName = res.data.fullName;
          if (fullName) setNameInput((prev) => prev ?? fullName);
        }
      });
    }
  }, [isTenant]);

  const defaultName = isTenant ? user?.fullName ?? "" : "";
  const defaultPhone = profile?.phone ?? "";
  const name = nameInput ?? defaultName;
  const phone = phoneInput ?? defaultPhone;

  const [persons, setPersons] = useState(1);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMsg, setOtpErrorMsg] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<TenantBooking | null>(null);

  // Bỏ qua OTP chỉ khi tài khoản đã xác thực SĐT VÀ số đang nhập đúng là số đó (backend kiểm lại lần nữa).
  const canSkip = Boolean(
    profile?.isPhoneVerified && profile.phone && normalizePhone(phone) === normalizePhone(profile.phone),
  );
  const steps = canSkip ? STEPS_BASE : [...STEPS_BASE, STEP_OTP];

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const chosen = slot ? new Date(slot) : null;
  const p = normalizePhone(phone);

  const handleSendOtp = async () => {
    setSubmitting(true);
    setOtpError(false);
    setOtpErrorMsg(null);
    try {
      const res = await tenantApi.sendOtp(p, "TENANT_VIEWING");
      if (res.ok) {
        setDevCode(res.data.devCode ?? null);
        setCode("");
        setCooldown(30);
        setStep("otp");
      } else {
        const msg = errorText(res);
        toast(msg);
        setErrors((prev) => ({ ...prev, phone: msg }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateAndProceed = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Vui lòng nhập họ và tên để Field Host biết xưng hô khi đón bạn.";
    if (!isValidVnPhone(phone)) next.phone = "Số điện thoại chưa hợp lệ. Ví dụ đúng: 0912 345 678.";
    setErrors(next);
    if (Object.keys(next).length || !slot) return;

    if (canSkip) {
      setSubmitting(true);
      try {
        const res = await tenantApi.createBooking({
          unitCode: unit.code || unit.id,
          slot,
          contactName: name,
          phone: p,
          partySize: persons,
          note: note.trim() || undefined,
        });
        if (res.ok) {
          invalidateTenantBookings();
          invalidateTenantUnit(unit.code || unit.id);
          setBooking(res.data);
          setStep("done");
          return;
        }
        if (res.code === "otp_required") {
          // Cần xác thực OTP
          await handleSendOtp();
          return;
        }
        toast(errorText(res));
      } finally {
        setSubmitting(false);
      }
    } else {
      await handleSendOtp();
    }
  };

  const onCode = async (v: string) => {
    setCode(v);
    setOtpError(false);
    setOtpErrorMsg(null);
    if (v.length === 4 && slot) {
      setSubmitting(true);
      try {
        const verifyRes = await tenantApi.verifyOtp(p, v, "TENANT_VIEWING");
        if (!verifyRes.ok) {
          setOtpError(true);
          setOtpErrorMsg(errorText(verifyRes));
          return;
        }

        const bookRes = await tenantApi.createBooking({
          unitCode: unit.code || unit.id,
          slot,
          contactName: name,
          phone: p,
          partySize: persons,
          note: note.trim() || undefined,
          actionToken: verifyRes.data.actionToken,
        });

        if (bookRes.ok) {
          invalidateTenantBookings();
          invalidateTenantUnit(unit.code || unit.id);
          setBooking(bookRes.data);
          setStep("done");
        } else {
          setOtpError(true);
          setOtpErrorMsg(errorText(bookRes));
          toast(errorText(bookRes));
        }
      } finally {
        setSubmitting(false);
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
            Field Host nội khu sẽ nhận ca trong vòng 3 phút. VinStay AI sẽ nhắn thông báo và nút 1-chạm xác nhận có mặt qua Zalo <strong>{fmtPhone(booking.contact.phoneMasked || p)}</strong>.
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
                <span>Field Host tiếp đón</span>
              </div>
              <div className={styles.ticketItemVal}>
                {booking.host?.name || "Field Host nội khu"}
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
              <div className={styles.ticketItemVal}>{booking.contact.persons} người</div>
            </div>
          </div>

          <div className={styles.ticketNotice} style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Clock size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--kelp)" }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <strong>Đến đúng giờ hẹn</strong> — Vui lòng đến đúng giờ để không ảnh hưởng lịch của người khác.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <IdCard size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--lagoon)" }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <strong>Mang theo giấy tờ</strong> — Mang theo CMND/CCCD để đối chiếu khi cần thiết.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CalendarX size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--coral)" }} />
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <strong>Huỷ lịch trước 2 giờ</strong> — Vui lòng huỷ hoặc đổi lịch trước ít nhất 2 giờ.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.doneActions}>
          <Link href={`/booking/${booking.ref}`} className="btn btn-primary btn-lg btn-block">
            Xem lịch hẹn chi tiết
          </Link>
          <button type="button" className="btn btn-quiet btn-block" onClick={onClose}>
            Tiếp tục xem các căn khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sheet}>
      {/* Khối Thông tin căn hộ thu gọn */}
      <div className={styles.unitSummary}>
        <div className={styles.unitLeft}>
          <h4 className={styles.unitAddr}>{unitAddress(unit)}</h4>
          <p className="muted xs">Sảnh toà {unit.building} · Đón tiếp tại sảnh</p>
        </div>
      </div>

      {/* Thanh tiến trình Stepper */}
      <div className={styles.stepperWrap}>
        <div className={styles.stepper}>
          {steps.map((s, idx) => {
            const isCompleted = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div
                key={s.key}
                className={`${styles.stepItem} ${isCompleted ? styles.stepCompleted : ""} ${
                  isCurrent ? styles.stepCurrent : ""
                }`}
              >
                <div className={styles.stepCircle}>{isCompleted ? <Check size={12} /> : idx + 1}</div>
                <span className={styles.stepLabel}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {step === "slot" && (
        <>
          <SlotPicker now={now} value={slot} onChange={setSlot} busySlots={busySlots} />

          <button
            type="button"
            className={`btn btn-primary btn-lg btn-block ${styles.submitBtn}`}
            disabled={!slot}
            onClick={() => setStep("info")}
          >
            <span>Tiếp tục: Nhập thông tin</span>
          </button>
        </>
      )}

      {step === "info" && (
        <>
          {chosen && (
            <div className={styles.chosenTimeBanner}>
              <Clock size={16} className={styles.bannerIcon} />
              <div className={styles.bannerText}>
                <strong className={styles.bannerVal}>{fmtDateTime(chosen.toISOString())}</strong>
              </div>
              <button type="button" className={styles.editBtn} onClick={() => setStep("slot")}>
                Đổi giờ
              </button>
            </div>
          )}

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="booking-name">
                <User size={15} className={styles.labelIcon} />
                <span>Họ và tên người xem</span>
                <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="booking-name"
                type="text"
                className={`input ${styles.formInput} ${errors.name ? styles.inputError : ""}`}
                placeholder="Ví dụ: Nguyễn Văn A"
                value={name}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="booking-phone">
                <Phone size={15} className={styles.labelIcon} />
                <span>Số điện thoại nhận tin Zalo</span>
                <span className={styles.requiredMark}>*</span>
              </label>
              <input
                id="booking-phone"
                type="tel"
                className={`input ${styles.formInput} ${errors.phone ? styles.inputError : ""}`}
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
              />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
              <p className="xs muted" style={{ marginTop: 4 }}>
                {canSkip
                  ? "✓ Số này đã xác thực với tài khoản của bạn, không cần nhập mã OTP."
                  : "VinStay AI sẽ gửi mã xác thực và thông báo đón tại sảnh qua số Zalo này."}
              </p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <Users size={15} className={styles.labelIcon} />
              <span>Số người cùng đi xem</span>
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

          <button
            type="button"
            className={`btn btn-primary btn-lg btn-block ${styles.submitBtn}`}
            disabled={submitting}
            onClick={validateAndProceed}
          >
            {canSkip ? (
              <>
                <CheckCircle2 size={18} />
                <span>{submitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}</span>
              </>
            ) : (
              <>
                <MessageCircleMore size={18} />
                <span>{submitting ? "Đang gửi OTP..." : "Tiếp tục xác thực Zalo OTP"}</span>
              </>
            )}
          </button>
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
            {otpError && <p className="field-error">{otpErrorMsg || "Mã chưa đúng. Kiểm tra lại tin nhắn Zalo rồi nhập lại."}</p>}
            <button
              type="button"
              className={`btn btn-quiet btn-sm ${styles.resendBtn}`}
              disabled={cooldown > 0 || submitting}
              onClick={handleSendOtp}
            >
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP qua Zalo"}
            </button>
          </div>

          {/* Khung Tin Zalo mô phỏng (charter & SPEC-P04 §3.4) */}
          <div className={styles.demoZalo}>
            <p className="xs muted">
              <CalendarCheck size={13} style={{ verticalAlign: "-2px" }} /> Bản demo: tin Zalo mô phỏng bạn sẽ nhận
            </p>
            <div style={{ background: "var(--card-bg, #fff)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
              {devCode ? (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  [VinStay AI] Mã OTP xác thực đặt lịch xem phòng của bạn là:{" "}
                  <strong style={{ fontSize: 16, color: "var(--primary)" }}>{devCode}</strong>. Hiệu lực trong 5 phút.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Mã xác thực đã được gửi qua Zalo tới số điện thoại {fmtPhone(p)}.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
