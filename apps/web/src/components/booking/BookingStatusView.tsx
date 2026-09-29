"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Clock,
  FileCheck,
  FileText,
  MapPin,
  MapPinCheck,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { VietQR } from "@/components/payment/VietQR";
import { ZaloThread } from "@/components/zalo/ZaloThread";
import { UnitCard } from "@/components/unit/UnitCard";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { KycCapture } from "@/components/deal/KycCapture";
import { LeaseForm } from "@/components/deal/LeaseForm";
import {
  cancelBooking,
  confirmDepositPaid,
  demoExpireHold,
  rateHost,
  rescheduleBooking,
  sendReminder,
  tenantAcceptDepositTerms,
  tenantCheckIn,
  tenantRunningLate,
} from "@/lib/mock/actions";
import { DEFAULT_HOUSEHOLD, HOLD_DAYS, HOLD_MS, allInCost } from "@/lib/mock/cost";
import {
  dayLabel,
  fmtDateTime,
  fmtPhone,
  fmtTime,
  normalizePhone,
  vnd,
  weekday,
} from "@/lib/mock/format";
import {
  bookingByRef,
  canTenantModify,
  isHoldForfeited,
  isOpenTicket,
  noticesFor,
  similarUnits,
} from "@/lib/mock/selectors";
import { ownsBooking } from "@/lib/mock/selectors-tenant";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostById, unitAddress, unitById, zoneById, type Unit } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import { SlotPicker } from "./SlotPicker";
import { STATUS_META, TERMINAL, buildTimeline } from "./status";
import styles from "./Booking.module.css";

function duration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} giờ ${m % 60} phút` : `${Math.floor(h / 24)} ngày ${h % 24} giờ`;
}

const HANDYMEN = [
  { trade: "Điện, nước", name: "Thợ điện nước khu Sapphire", note: "Phản hồi trong ngày" },
  { trade: "Điều hòa, tủ lạnh", name: "Điện lạnh Ocean Park", note: "Có bảo hành 3 tháng" },
  { trade: "Khoá cửa", name: "Khoá cửa 24h nội khu", note: "Mở khoá, thay ổ" },
];

export function BookingStatusView({ refCode }: { refCode: string }) {
  const state = useMock();
  const now = useNow(1000);
  const [modal, setModal] = useState<"cancel" | "reschedule" | "expireConfirm" | "leaseWizard" | null>(null);

  if (!state.ready || !now) {
    return (
      <div className={`wrap ${styles.page}`}>
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  const booking = bookingByRef(state, refCode);

  if (!booking) {
    return (
      <div className={`wrap ${styles.notFound}`}>
        <h1 className={styles.h1}>Không tìm thấy lịch hẹn</h1>
        <p className="muted">
          Không có lịch hẹn nào mang mã {refCode}. Kiểm tra lại mã trong tin Zalo của bạn.
        </p>
        <Link href="/booking" className="btn btn-primary">
          Kiểm tra lịch xem
        </Link>
      </div>
    );
  }

  if (!ownsBooking(state, booking)) {
    return (
      <div className={`wrap ${styles.notFound}`}>
        <h1 className={styles.h1}>Lịch hẹn không thuộc tài khoản này</h1>
        <p className="muted">
          Vui lòng đăng nhập bằng số điện thoại đã dùng để đặt lịch, hoặc kiểm tra lại mã lịch hẹn.
        </p>
        <Link href="/booking" className="btn btn-primary">
          Về lịch của tôi
        </Link>
      </div>
    );
  }

  const unit = unitById(booking.unitId)!;
  const zone = zoneById(unit.zoneId);
  const host = hostById(booking.hostId)!;
  const meta = STATUS_META[booking.status];
  const steps = buildTimeline(booking);
  const terminal = TERMINAL.includes(booking.status);
  const current = terminal ? -1 : steps.findIndex((s) => !s.done);
  const slotMs = new Date(booking.slot).getTime();
  const slaLeft = 180_000 - (now - new Date(booking.createdAt).getTime());
  const notices = noticesFor(state, "tenant", booking.tenant.phone).filter((n) => !n.bookingId || n.bookingId === booking.id);
  const editable = canTenantModify(booking, now);
  const similar = terminal ? similarUnits(state, unit, 2) : [];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Sảnh toà ${unit.building} Vinhomes Ocean Park`)}`;
  const forfeited = isHoldForfeited(booking, now);

  return (
    <div className={`wrap ${styles.page}`}>
      <nav className="small muted" aria-label="Đường dẫn">
        <Link href="/booking" className="link">
          Lịch xem của tôi
        </Link>{" "}
        / {booking.ref}
      </nav>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={`card ${styles.hero} ${styles[`tone-${meta.tone}`]}`}>
            <div className={styles.heroTop}>
              <div>
                <p className="muted small">Mã lịch hẹn</p>
                <p className={`num ${styles.ref}`}>{booking.ref}</p>
              </div>
              <span className={`badge ${meta.badge}`}>{meta.label}</span>
            </div>
            <h1 className={styles.headline}>{meta.headline}</h1>
            <p className="muted">
              {booking.status === "rejected" && booking.closedReason
                ? `${meta.body} (${booking.closedReason})`
                : meta.body}
            </p>

            {booking.status === "pending" && (
              <p className={styles.clock}>
                <Clock size={16} />
                {isOpenTicket(booking)
                  ? `Đang tìm Field Host rảnh lúc ${fmtTime(booking.slot)}`
                  : slaLeft > 0
                    ? `Host sẽ xác nhận trong khoảng ${Math.ceil(slaLeft / 60_000)} phút nữa`
                    : "Đã quá 3 phút: yêu cầu đang được chuyển cho Host lân cận trong bán kính 500m"}
              </p>
            )}

            {booking.status === "confirmed" && (
              <p className={styles.clock}>
                <Clock size={16} />
                {slotMs > now ? `Còn ${duration(slotMs - now)} tới giờ hẹn` : "Đã tới giờ hẹn"}
              </p>
            )}

            {/* ─── KHỐI VIỆC CẦN LÀM (THEO SPEC-P05 §2.3) ─── */}

            {/* 1. closing & chưa đồng ý điều khoản: DepositTerms */}
            {booking.status === "closing" && !booking.depositConsentAt && (
              <DepositTermsBox bookingId={booking.id} />
            )}

            {/* 2. closing & đã đồng ý: VietQR */}
            {booking.status === "closing" && booking.depositConsentAt && booking.deposit && (
              <div className={styles.qr} style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                <VietQR
                  amount={booking.deposit.amount}
                  content={booking.deposit.content}
                  qrRef={booking.deposit.qrRef}
                />
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <b style={{ color: "var(--ink)" }}>Đang chờ thanh toán cọc...</b>
                  <p className="muted xs" style={{ maxWidth: 480, margin: "4px auto 0" }}>
                    Chuyển khoản 2.000.000đ vào tài khoản định danh nền tảng. Căn tự động khoá {HOLD_DAYS} ngày ngay khi ngân hàng báo có.
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                  <button
                    type="button"
                    className={styles.demoBtn}
                    onClick={() => {
                      confirmDepositPaid(booking.id, "webhook");
                      toast(`Ngân hàng báo có: căn đã khoá ${HOLD_DAYS} ngày`, "success");
                    }}
                  >
                    Demo: Giả lập ngân hàng báo có
                  </button>
                </div>
              </div>
            )}

            {/* 3. holding & chưa forfeited: Countdown + Action làm HĐ */}
            {booking.status === "holding" && !forfeited && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <CountdownBanner
                  expiresAt={booking.deposit?.expiresAt}
                  now={now}
                  onExpireDemo={() => setModal("expireConfirm")}
                />
                <div className="card" style={{ padding: 16, background: "var(--surface)", marginTop: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <b style={{ fontSize: 16 }}>Căn hộ đang được giữ chỗ cho bạn</b>
                    <p className="muted xs" style={{ margin: "4px 0 0" }}>
                      Khoản cọc 2.000.000đ đã nhận. Bạn có thể tiến hành xác minh CCCD (eKYC) và ký Hợp đồng thuê căn hộ.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg btn-block"
                    onClick={() => setModal("leaseWizard")}
                  >
                    <FileCheck size={18} /> Làm hợp đồng thuê căn hộ
                  </button>
                </div>
              </div>
            )}

            {/* 4. Forfeited: Hết hạn giữ căn */}
            {forfeited && (
              <div className="card" style={{ padding: 16, background: "var(--coral-50, #fff5f5)", border: "1px solid var(--coral-200, #fed7d7)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "var(--coral-800, #9b2c2c)" }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b style={{ fontSize: 16 }}>Đã hết hạn giữ căn</b>
                    <p style={{ fontSize: 13.5, margin: "4px 0 10px" }}>
                      Thời hạn giữ chỗ {HOLD_DAYS} ngày đã kết thúc. Khoản cọc 2.000.000đ không được hoàn lại theo quy định đặt cọc (Điều 328 Bộ luật Dân sự 2015). Căn hộ đã được mở lại cho khách khác.
                    </p>
                    <Link href={`/units/${unit.id}?book=1`} className="btn btn-amber btn-sm">
                      Đặt lịch căn khác
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* THÔNG TIN CĂN HỘ & HOST */}
            <div className={styles.unitRow}>
              <Link href={`/units/${unit.id}`} className={styles.thumb} aria-label={`Xem căn ${unitAddress(unit)}`}>
                <VerifiedPhoto unit={unit} sizes="140px" stamp="none" className={styles.thumbFrame} />
              </Link>
              <dl className={styles.facts}>
                <div>
                  <dt>Căn hộ</dt>
                  <dd>{unitAddress(unit)}</dd>
                  <dd className="muted small">{zone.name}</dd>
                </div>
                <div>
                  <dt>Thời gian</dt>
                  <dd>
                    {fmtTime(booking.slot)} · {weekday(booking.slot)}, {fmtDateTime(booking.slot).split(" · ")[1]}
                  </dd>
                  <dd className="muted small">{dayLabel(booking.slot, now)}</dd>
                </div>
                <div>
                  <dt>Field Host</dt>
                  {isOpenTicket(booking) ? (
                    <>
                      <dd className="muted">Đang phân bổ...</dd>
                      <dd className="muted small">Tự động chọn Host gần nhất</dd>
                    </>
                  ) : (
                    <>
                      <dd>{host.name}</dd>
                      <dd className="muted small">
                        <Star size={12} fill="currentColor" style={{ color: "var(--amber)", verticalAlign: "-1px" }} />{" "}
                        {String(host.rating).replace(".", ",")}
                        {booking.confirmedAt && ` · ${fmtPhone(host.phone)}`}
                      </dd>
                    </>
                  )}
                </div>
              </dl>
            </div>

            {/* CÁC NÚT HÀNH ĐỘNG DÀNH CHO KHÁCH */}
            <div className={styles.actions} style={{ alignItems: "center" }}>
              {/* Nút chính "Tôi đã tới sảnh" */}
              {booking.status === "confirmed" && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    tenantCheckIn(booking.id);
                    toast("Đã báo Host — Host đang xuống sảnh đón bạn", "success");
                  }}
                >
                  <MapPinCheck size={18} /> Tôi đã tới sảnh
                </button>
              )}

              {booking.status === "lobby" && (
                <span className="badge badge-kelp" style={{ padding: "8px 14px", fontSize: 13.5 }}>
                  <Check size={14} /> Đã báo có mặt lúc {fmtTime(booking.lobbyAt ?? booking.createdAt)}
                </span>
              )}

              <a className="btn btn-quiet btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={15} /> Chỉ đường tới sảnh {unit.building}
              </a>

              {booking.confirmedAt && (
                <a className="btn btn-quiet btn-sm" href={`tel:${normalizePhone(host.phone)}`}>
                  <Phone size={15} /> Gọi Host
                </a>
              )}

              {/* Đổi giờ & Huỷ lịch */}
              {(booking.status === "pending" || booking.status === "confirmed") && (
                <>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    disabled={!editable}
                    onClick={() => setModal("reschedule")}
                    title={!editable ? "Chỉ đổi/huỷ được trước giờ hẹn ít nhất 2 giờ" : undefined}
                  >
                    Đổi giờ
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={!editable}
                    onClick={() => setModal("cancel")}
                    title={!editable ? "Chỉ đổi/huỷ được trước giờ hẹn ít nhất 2 giờ" : undefined}
                  >
                    Huỷ lịch
                  </button>
                  {!editable && (
                    <span className="xs muted" style={{ display: "block", width: "100%" }}>
                      Chỉ đổi/huỷ được trước giờ hẹn ít nhất 2 giờ — gọi Host nếu cần.
                    </span>
                  )}
                </>
              )}

              {terminal && (
                <Link href={`/units/${unit.id}?book=1`} className="btn btn-amber btn-sm">
                  Đặt lịch khác
                </Link>
              )}
            </div>

            {/* Nút Demo thông báo Zalo */}
            {booking.status === "confirmed" && !booking.reminderSentAt && (
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => {
                  sendReminder(booking.id);
                  toast("Đã gửi tin nhắc hẹn Zalo", "success");
                }}
              >
                Demo: gửi tin nhắc hẹn Zalo
              </button>
            )}
          </section>

          {/* HỒ SƠ CỦA BẠN (KHI ĐÃ KÝ HỢP ĐỒNG HOẶC eKYC) */}
          {(booking.lease || booking.kyc) && (
            <section className={`card ${styles.block}`}>
              <h2>Hồ sơ của bạn</h2>
              <ul className={styles.docs}>
                {booking.lease && (
                  <li>
                    <FileText size={18} />
                    <div>
                      <b>Hợp đồng thuê {booking.lease.docId}</b>
                      <p className="muted small">
                        {booking.lease.months} tháng · {vnd(booking.lease.rent)}đ/tháng · cọc bảo đảm gồm 2.000.000đ
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => window.print()}
                    >
                      In Hợp đồng
                    </button>
                  </li>
                )}
                {booking.kyc && (
                  <li>
                    <Check size={18} />
                    <div>
                      <b>CCCD đã xác minh (eKYC)</b>
                      <p className="muted small">Mã hoá AES-256, đối soát khớp với thông tin đặt lịch</p>
                    </div>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* DANH BẠ THỢ KỸ THUẬT */}
          {booking.lease && (
            <section className={`card ${styles.block}`}>
              <h2>Danh bạ thợ kỹ thuật ngoài</h2>
              <p className="muted small">
                VinStay và Field Host không nhận sửa chữa. Bạn và thợ tự thoả thuận giá và trách nhiệm.
              </p>
              <ul className={styles.docs}>
                {HANDYMEN.map((h) => (
                  <li key={h.trade}>
                    <Wrench size={18} />
                    <div>
                      <b>{h.trade}</b>
                      <p className="muted small">
                        {h.name} · {h.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ĐÁNH GIÁ FIELD HOST */}
          {!booking.rating &&
            ["viewing", "closing", "holding", "leased", "completed"].includes(booking.status) && (
              <section className={`card ${styles.block}`}>
                <h2>Đánh giá Field Host {host.name}</h2>
                <div className={styles.stars} role="radiogroup" aria-label="Chấm sao">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      aria-label={`${n} sao`}
                      onClick={() => {
                        rateHost(booking.id, n);
                        toast("Cảm ơn bạn đã đánh giá", "success");
                      }}
                    >
                      <Star size={30} />
                    </button>
                  ))}
                </div>
              </section>
            )}

          {/* CĂN TƯƠNG ĐƯƠNG */}
          {similar.length > 0 && (
            <section>
              <h2 className={styles.h2}>Căn tương đương bạn có thể xem</h2>
              <div className={styles.similar}>
                {similar.map((u) => (
                  <UnitCard key={u.id} unit={u} cost={allInCost(u, DEFAULT_HOUSEHOLD)} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CỘT PHỤ (TIMELINE & ZALO) */}
        <aside className={styles.side}>
          <section className={`card ${styles.block}`} aria-label="Tiến trình">
            <h2>Tiến trình</h2>
            <ol className={styles.timeline}>
              {steps.map((s, i) => (
                <li
                  key={s.key}
                  className={`${s.done ? styles.done : ""} ${i === current ? styles.current : ""}`}
                  aria-current={i === current ? "step" : undefined}
                >
                  <span className={styles.dot}>{s.done && <Check size={12} strokeWidth={3} />}</span>
                  <div>
                    <b>{s.label}</b>
                    <p className="muted xs">{s.at && s.done ? fmtDateTime(s.at) : s.hint}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Tin nhắn Zalo">
            <h2 className={styles.h2s}>Tin Zalo gửi tới {fmtPhone(booking.tenant.phone)}</h2>
            <ZaloThread
              notices={notices}
              now={now}
              onAction={(_, a) => (a.id === "arrived" ? tenantCheckIn(booking.id) : tenantRunningLate(booking.id))}
              actionsDisabled={booking.status !== "confirmed"}
              empty="Chưa có tin nhắn nào."
              maxHeight={520}
            />
          </section>
        </aside>
      </div>

      {/* MODAL HUỶ LỊCH */}
      <CancelModal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        onConfirm={(reason) => {
          const res = cancelBooking(booking.id, reason);
          if (!res.ok) toast(res.reason);
          else {
            setModal(null);
            toast("Đã huỷ lịch xem", "success");
          }
        }}
      />

      {/* MODAL ĐỔI GIỜ */}
      <RescheduleModal
        open={modal === "reschedule"}
        onClose={() => setModal(null)}
        now={now}
        onConfirm={(slot) => {
          const res = rescheduleBooking(booking.id, slot);
          if (!res.ok) toast(res.reason);
          else {
            setModal(null);
            toast("Đã đổi giờ, Host sẽ xác nhận lại", "success");
          }
        }}
      />

      {/* MODAL XÁC NHẬN TUA HẾT HẠN GIỮ CĂN (DEMO) */}
      <Modal
        open={modal === "expireConfirm"}
        onClose={() => setModal(null)}
        title="Xác nhận tua hết hạn giữ căn"
        description="Thao tác demo: căn hộ sẽ chuyển sang trạng thái hết hạn, khách mất cọc 2.000.000đ và căn được mở lại."
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-quiet" onClick={() => setModal(null)}>
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                demoExpireHold(booking.id);
                setModal(null);
                toast("Đã tua hết hạn giữ căn", "success");
              }}
            >
              Tua hết hạn ngay
            </button>
          </div>
        }
      >
        <p className="small muted">
          Sau khi hết hạn, bạn sẽ thấy thông báo forfeited theo đúng quy chuẩn Điều 328 Bộ luật Dân sự 2015.
        </p>
      </Modal>

      {/* MODAL LEASE WIZARD */}
      <Modal
        open={modal === "leaseWizard"}
        onClose={() => setModal(null)}
        variant="wide"
        title="Làm hợp đồng thuê căn hộ"
        description={`Ký hợp đồng thuê chính thức căn ${unitAddress(unit)}`}
      >
        <LeaseWizardFlow booking={booking} unit={unit} now={now} onDone={() => setModal(null)} />
      </Modal>
    </div>
  );
}

// ─── COMPONENT CON: ĐIỀU KHOẢN CỌC ────────────────────────────────────────────────────────────

function DepositTermsBox({ bookingId }: { bookingId: string }) {
  const [consent, setConsent] = useState(false);

  return (
    <div
      className="card"
      style={{
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--r)",
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <ShieldCheck size={22} style={{ color: "var(--kelp)" }} />
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Điều khoản đặt cọc giữ căn</h3>
      </div>

      <ul style={{ paddingLeft: 20, margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)" }}>
        <li>Khoản tiền cọc <b>2.000.000 VNĐ</b> được nộp vào tài khoản định danh của nền tảng VinStay AI.</li>
        <li>Căn hộ được khóa trạng thái giữ chỗ trong vòng <b>{HOLD_DAYS} ngày</b> kể từ khi nhận tiền.</li>
        <li>Quá thời hạn {HOLD_DAYS} ngày mà khách thuê không tiến hành ký Hợp đồng thuê thì mất tiền cọc theo <b>Điều 328 Bộ luật Dân sự 2015</b>.</li>
        <li>Khi ký Hợp đồng thuê chính thức, khoản tiền này được chuyển đổi 100% thành một phần của <b>Tiền cọc bảo đảm tài sản</b> (Security Deposit), tuyệt đối không trừ vào tiền thuê tháng đầu tiên.</li>
      </ul>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "10px 12px",
          background: "var(--paper-2)",
          borderRadius: "var(--r)",
          cursor: "pointer",
          fontSize: 13,
          lineHeight: 1.45,
          marginBottom: 14,
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>
          Tôi đồng ý điều khoản đặt cọc giữ căn theo <b>Điều 328 Bộ luật Dân sự 2015</b> và cho phép VinStay AI xử lý dữ liệu cá nhân theo <b>Nghị định 13/2023/NĐ-CP</b>.
        </span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={!consent}
        onClick={() => {
          const res = tenantAcceptDepositTerms(bookingId);
          if (!res.ok) toast(res.reason);
          else toast("Đã đồng ý điều khoản, vui lòng quét VietQR để chuyển tiền cọc", "success");
        }}
      >
        <Check size={18} /> Đồng ý và lấy mã VietQR
      </button>
    </div>
  );
}

// ─── COMPONENT CON: COUNTDOWN BANNER ──────────────────────────────────────────────────────────

function CountdownBanner({
  expiresAt,
  now,
  onExpireDemo,
}: {
  expiresAt?: string;
  now: number;
  onExpireDemo: () => void;
}) {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return (
      <div className="card" style={{ padding: 12, background: "var(--coral-50)", color: "var(--coral-800)" }}>
        <b>Đã hết hạn giữ căn</b>
      </div>
    );
  }

  const d = Math.floor(diff / (24 * 3600 * 1000));
  const h = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const s = Math.floor((diff % 60000) / 1000);

  const timeLeftText = d >= 1 ? `Còn ${d} ngày ${h} giờ` : `Còn ${h} giờ ${m} phút ${s} giây`;
  const pct = Math.min(100, Math.max(0, ((HOLD_MS - diff) / HOLD_MS) * 100));

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--amber-50, #fef8ee)",
        border: "1px solid var(--amber-200, #fce1b2)",
        borderRadius: "var(--r)",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Clock size={18} style={{ color: "var(--amber-700, #b45309)" }} />
          <b style={{ fontSize: 16, color: "var(--amber-900, #78350f)" }}>{timeLeftText}</b>
        </div>
        <button type="button" className={styles.demoBtn} onClick={onExpireDemo}>
          Demo: Tua hết hạn giữ căn
        </button>
      </div>

      <div style={{ height: 6, background: "var(--amber-200, #fce1b2)", borderRadius: 999, overflow: "hidden", margin: "8px 0" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--amber-600, #d97706)", transition: "width 0.3s ease" }} />
      </div>

      <p className="xs muted" style={{ margin: 0 }}>
        Giữ căn tới <b>{fmtDateTime(expiresAt)}</b>. Quá thời hạn này mà chưa hoàn tất ký Hợp đồng thuê thì căn hộ tự động mở lại.
      </p>
    </div>
  );
}

// ─── COMPONENT CON: LEASE WIZARD FLOW ─────────────────────────────────────────────────────────

function LeaseWizardFlow({
  booking,
  unit,
  now,
  onDone,
}: {
  booking: Booking;
  unit: Unit;
  now: number;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"kyc" | "lease">(booking.kyc ? "lease" : "kyc");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn btn-sm ${step === "kyc" ? "btn-primary" : "btn-quiet"}`}
          onClick={() => setStep("kyc")}
        >
          1. Xác minh CCCD (eKYC) {booking.kyc && <Check size={14} />}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${step === "lease" ? "btn-primary" : "btn-quiet"}`}
          disabled={!booking.kyc}
          onClick={() => setStep("lease")}
        >
          2. Ký Hợp đồng thuê {booking.lease && <Check size={14} />}
        </button>
      </div>

      {step === "kyc" && (
        <KycCapture
          booking={booking}
          onDone={() => {
            toast("Đã lưu kết quả eKYC", "success");
            setStep("lease");
          }}
        />
      )}

      {step === "lease" && (
        <LeaseForm
          booking={booking}
          unit={unit}
          now={now}
          onSigned={() => {
            toast("Ký hợp đồng thuê thành công!", "success");
            onDone();
          }}
        />
      )}
    </div>
  );
}

// ─── COMPONENT CON: MODAL CANCEL & RESCHEDULE ─────────────────────────────────────────────────

function CancelModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("Bận việc đột xuất");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Huỷ lịch xem phòng"
      description="Ca trực của Host sẽ được giải phóng ngay."
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Giữ lịch
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onConfirm(reason)}>
            Huỷ lịch
          </button>
        </div>
      }
    >
      <label className="field">
        <span className="label">Lý do huỷ</span>
        <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>Bận việc đột xuất</option>
          <option>Đã chọn được căn khác</option>
          <option>Thay đổi kế hoạch thuê</option>
          <option>Lý do khác</option>
        </select>
      </label>
    </Modal>
  );
}

function RescheduleModal({
  open,
  onClose,
  now,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  now: number;
  onConfirm: (slot: string) => void;
}) {
  const [slot, setSlot] = useState<string | null>(null);
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Đổi giờ xem phòng"
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!slot}
          onClick={() => slot && onConfirm(slot)}
        >
          Xác nhận giờ mới
        </button>
      }
    >
      <SlotPicker
        now={now}
        value={slot}
        onChange={setSlot}
      />
    </Modal>
  );
}
