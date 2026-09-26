"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Check, Clock, FileText, MapPin, Phone, Star, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { VietQR } from "@/components/payment/VietQR";
import { ZaloThread } from "@/components/zalo/ZaloThread";
import { UnitCard } from "@/components/unit/UnitCard";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { cancelBooking, rateHost, rescheduleBooking, sendReminder, tenantCheckIn, tenantRunningLate } from "@/lib/mock/actions";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { dayLabel, fmtDateTime, fmtPhone, fmtTime, normalizePhone, vnd, weekday } from "@/lib/mock/format";
import { bookableDays } from "@/lib/mock/slots";
import { bookingByRef, noticesFor, similarUnits, slotsForDay } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { hostById, unitAddress, unitById, zoneById } from "@/lib/mock/units";
import { useDemoUser } from "@/lib/mock/useRole";
import { useNow } from "@/lib/useNow";
import { STATUS_META, TERMINAL, buildTimeline } from "./status";
import styles from "./Booking.module.css";

function duration(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} giờ ${m % 60} phút` : `${Math.floor(h / 24)} ngày ${h % 24} giờ`;
}

function downloadIcs(title: string, slot: string, location: string) {
  const start = new Date(slot);
  const end = new Date(start.getTime() + 45 * 60_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VinStay AI//VI", "BEGIN:VEVENT", `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${title}`, `LOCATION:${location}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "lich-xem-phong.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

const HANDYMEN = [
  { trade: "Điện, nước", name: "Thợ điện nước khu Sapphire", note: "Phản hồi trong ngày" },
  { trade: "Điều hòa, tủ lạnh", name: "Điện lạnh Ocean Park", note: "Có bảo hành 3 tháng" },
  { trade: "Khoá cửa", name: "Khoá cửa 24h nội khu", note: "Mở khoá, thay ổ" },
];

export function BookingStatusView({ refCode, phoneParam }: { refCode: string; phoneParam?: string }) {
  const state = useMock();
  const user = useDemoUser();
  const now = useNow(1000);
  const [modal, setModal] = useState<"cancel" | "reschedule" | null>(null);

  if (!state.ready || !now) {
    return (
      <div className={`wrap ${styles.page}`}>
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  const booking = bookingByRef(state, refCode);
  const known = [phoneParam, state.tenantProfile?.phone, user?.role === "tenant" ? user.phone : undefined].filter(Boolean).map((p) => normalizePhone(p!));
  const allowed = !!booking && known.includes(booking.tenant.phone);

  if (!booking || !allowed) {
    return (
      <div className={`wrap ${styles.notFound}`}>
        <h1 className={styles.h1}>{booking ? "Cần xác nhận số điện thoại" : "Không tìm thấy lịch hẹn"}</h1>
        <p className="muted">{booking ? `Để xem lịch ${booking.ref}, hãy nhập mã và số điện thoại đã đặt ở trang kiểm tra.` : `Không có lịch hẹn nào mang mã ${refCode}. Kiểm tra lại mã trong tin Zalo của bạn.`}</p>
        <Link href="/booking" className="btn btn-primary">
          Kiểm tra lịch xem
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
  const editable = booking.status === "pending" || booking.status === "confirmed";
  const similar = terminal ? similarUnits(state, unit, 2) : [];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Sảnh toà ${unit.building} Vinhomes Ocean Park`)}`;

  return (
    <div className={`wrap ${styles.page}`}>
      <nav className="small muted" aria-label="Đường dẫn">
        <Link href="/booking" className="link">Lịch xem của tôi</Link> / {booking.ref}
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
            <p className="muted">{booking.status === "rejected" && booking.closedReason ? `${meta.body} (${booking.closedReason})` : meta.body}</p>

            {booking.status === "pending" && (
              <p className={styles.clock}>
                <Clock size={16} />
                {slaLeft > 0 ? `Host sẽ xác nhận trong khoảng ${Math.ceil(slaLeft / 60_000)} phút nữa` : "Đã quá 3 phút: yêu cầu đang được chuyển cho Host lân cận trong bán kính 500m"}
              </p>
            )}
            {booking.status === "confirmed" && (
              <p className={styles.clock}>
                <Clock size={16} />
                {slotMs > now ? `Còn ${duration(slotMs - now)} tới giờ hẹn` : "Đã tới giờ hẹn"}
              </p>
            )}
            {booking.status === "holding" && booking.deposit?.expiresAt && (
              <p className={styles.clock}>
                <Clock size={16} />
                {new Date(booking.deposit.expiresAt).getTime() > now ? `Còn ${duration(new Date(booking.deposit.expiresAt).getTime() - now)} giữ chỗ để ký hợp đồng thuê` : "Đã hết hạn giữ chỗ"}
              </p>
            )}

            {booking.status === "closing" && booking.deposit && (
              <div className={styles.qr}>
                <VietQR amount={booking.deposit.amount} content={booking.deposit.content} qrRef={booking.deposit.qrRef} />
                <p className="muted xs">Khoản cọc vào tài khoản định danh nền tảng, khoá căn 24 giờ. Khi ký hợp đồng thuê, 2.000.000đ chuyển 100% thành Tiền cọc bảo đảm, không trừ vào tiền thuê tháng đầu.</p>
              </div>
            )}

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
                  <dd>{host.name}</dd>
                  <dd className="muted small">
                    <Star size={12} fill="currentColor" style={{ color: "var(--amber)", verticalAlign: "-1px" }} /> {String(host.rating).replace(".", ",")}
                    {booking.confirmedAt && ` · ${fmtPhone(host.phone)}`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={styles.actions}>
              <a className="btn btn-quiet btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={15} /> Chỉ đường tới sảnh {unit.building}
              </a>
              {editable && (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => downloadIcs(`Xem căn ${unitAddress(unit)}`, booking.slot, `Sảnh toà ${unit.building}, Vinhomes Ocean Park`)}>
                  <CalendarPlus size={15} /> Thêm vào lịch
                </button>
              )}
              {booking.confirmedAt && (
                <a className="btn btn-quiet btn-sm" href={`tel:${normalizePhone(host.phone)}`}>
                  <Phone size={15} /> Gọi Host
                </a>
              )}
              {editable && (
                <>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setModal("reschedule")}>
                    Đổi giờ
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("cancel")}>
                    Huỷ lịch
                  </button>
                </>
              )}
              {terminal && (
                <Link href={`/units/${unit.id}?book=1`} className="btn btn-amber btn-sm">
                  Đặt lịch khác
                </Link>
              )}
            </div>

            {booking.status === "confirmed" && !booking.reminderSentAt && (
              <button type="button" className={styles.demoBtn} onClick={() => sendReminder(booking.id)}>
                Demo: gửi nhắc hẹn T-10 phút ngay
              </button>
            )}
          </section>

          {(booking.agreement || booking.lease) && (
            <section className={`card ${styles.block}`}>
              <h2>Hồ sơ của bạn</h2>
              <ul className={styles.docs}>
                {booking.agreement && (
                  <li>
                    <FileText size={18} />
                    <div>
                      <b>Thỏa thuận đặt cọc {booking.agreement.docId}</b>
                      <p className="muted small">Ký số OTP · {fmtDateTime(booking.agreement.signedAt)}</p>
                    </div>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => toast("Bản PDF mô phỏng: chưa có file thật trong bản demo")}>
                      Tải PDF
                    </button>
                  </li>
                )}
                {booking.lease && (
                  <li>
                    <FileText size={18} />
                    <div>
                      <b>Hợp đồng thuê {booking.lease.docId}</b>
                      <p className="muted small">
                        {booking.lease.months} tháng · {vnd(booking.lease.rent)}đ/tháng · cọc bảo đảm gồm 2.000.000đ
                      </p>
                    </div>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => toast("Bản PDF mô phỏng: chưa có file thật trong bản demo")}>
                      Tải PDF
                    </button>
                  </li>
                )}
                {booking.kyc && (
                  <li>
                    <Check size={18} />
                    <div>
                      <b>CCCD đã xác minh</b>
                      <p className="muted small">Mã hoá AES-256, không chia sẻ với môi giới hay chủ nhà</p>
                    </div>
                  </li>
                )}
              </ul>
            </section>
          )}

          {booking.lease && (
            <section className={`card ${styles.block}`}>
              <h2>Danh bạ thợ kỹ thuật ngoài</h2>
              <p className="muted small">VinStay và Field Host không nhận sửa chữa. Bạn và thợ tự thoả thuận giá và trách nhiệm.</p>
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

          {!booking.rating && ["viewing", "closing", "holding", "signed", "leased", "completed"].includes(booking.status) && (
            <section className={`card ${styles.block}`}>
              <h2>Đánh giá Field Host {host.name}</h2>
              <div className={styles.stars} role="radiogroup" aria-label="Chấm sao">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={false} aria-label={`${n} sao`} onClick={() => { rateHost(booking.id, n); toast("Cảm ơn bạn đã đánh giá", "success"); }}>
                    <Star size={30} />
                  </button>
                ))}
              </div>
            </section>
          )}

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

        <aside className={styles.side}>
          <section className={`card ${styles.block}`} aria-label="Tiến trình">
            <h2>Tiến trình</h2>
            <ol className={styles.timeline}>
              {steps.map((s, i) => (
                <li key={s.key} className={`${s.done ? styles.done : ""} ${i === current ? styles.current : ""}`} aria-current={i === current ? "step" : undefined}>
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

      <CancelModal open={modal === "cancel"} onClose={() => setModal(null)} onConfirm={(reason) => { cancelBooking(booking.id, reason); setModal(null); toast("Đã huỷ lịch xem", "success"); }} />
      <RescheduleModal
        open={modal === "reschedule"}
        onClose={() => setModal(null)}
        hostId={booking.hostId}
        bookingId={booking.id}
        now={now}
        onConfirm={(slot) => {
          try {
            rescheduleBooking(booking.id, slot);
            setModal(null);
            toast("Đã đổi giờ, Host sẽ xác nhận lại", "success");
          } catch (e) {
            toast((e as Error).message);
          }
        }}
      />
    </div>
  );
}

function CancelModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("Bận việc đột xuất");
  return (
    <Modal open={open} onClose={onClose} title="Huỷ lịch xem phòng" description="Ca trực của Host sẽ được giải phóng ngay." footer={
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-quiet" onClick={onClose}>Giữ lịch</button>
        <button type="button" className="btn btn-danger" onClick={() => onConfirm(reason)}>Huỷ lịch</button>
      </div>
    }>
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

function RescheduleModal({ open, onClose, hostId, bookingId, now, onConfirm }: { open: boolean; onClose: () => void; hostId: string; bookingId: string; now: number; onConfirm: (slot: string) => void }) {
  const state = useMock();
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const days = bookableDays(now);
  const options = days[dayIdx] ? slotsForDay(state, hostId, days[dayIdx], now, bookingId) : [];
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="Đổi giờ xem phòng" footer={
      <button type="button" className="btn btn-primary btn-block" disabled={!slot} onClick={() => slot && onConfirm(slot)}>Xác nhận giờ mới</button>
    }>
      <div className={styles.rDays}>
        {days.map((d, i) => (
          <button key={d.toISOString()} type="button" aria-pressed={i === dayIdx} className={i === dayIdx ? styles.rOn : ""} onClick={() => { setDayIdx(i); setSlot(null); }}>
            {dayLabel(d, now)} · {String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className={styles.rSlots}>
        {options.map((o) => (
          <button key={o.iso} type="button" disabled={!o.available} aria-pressed={slot === o.iso} className={slot === o.iso ? styles.rOn : ""} onClick={() => setSlot(o.iso)}>
            {o.time}
          </button>
        ))}
      </div>
    </Modal>
  );
}
