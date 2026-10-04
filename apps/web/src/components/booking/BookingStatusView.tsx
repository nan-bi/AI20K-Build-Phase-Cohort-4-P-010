"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  FileCheck,
  FileText,
  MapPin,
  MapPinCheck,
  ShieldAlert,
  Star,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { VietQR } from "@/components/payment/VietQR";
import { UnitCard } from "@/components/unit/UnitCard";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { DepositTermsBox } from "@/components/deal/DepositTermsBox";
import { KycCapture } from "@/components/deal/KycCapture";
import { DEFAULT_HOUSEHOLD, allInCost } from "@/lib/mock/cost";
import {
  dayLabel,
  fmtDateTime,
  fmtTime,
  vnd,
  weekday,
} from "@/lib/mock/format";
import { unitAddress, zoneOfBuilding } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { tenantApi, errorText } from "@/lib/tenant/api";
import { toBookingView, buildTimeline, toUnit } from "@/lib/tenant/adapters";
import { SlotPicker } from "./SlotPicker";
import { STATUS_META, TERMINAL } from "./status";
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
  const now = useNow(1000);
  const [modal, setModal] = useState<"cancel" | "reschedule" | "leaseWizard" | null>(null);

  const { state: bookingState, reload } = useApiQuery(tenantQueries.booking(refCode));
  // Hợp đồng chỉ cần khi lịch đã chốt thuê; danh sách căn gợi ý chỉ cần khi lịch đã kết thúc. Chưa cần thì không gọi API.
  const bookingStatus = bookingState.status === "ready" ? bookingState.data.status : null;
  const { state: contractsState } = useApiQuery(tenantQueries.contracts(), bookingStatus === "leased" || bookingStatus === "completed");
  const { state: unitsState } = useApiQuery(tenantQueries.units(), bookingStatus !== null && TERMINAL.includes(bookingStatus));

  const showDemo = process.env.NEXT_PUBLIC_DEMO_TOOLS === "true";

  if (bookingState.status === "loading" || !now) {
    return (
      <div className={`wrap ${styles.page}`}>
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  if (bookingState.status === "error" || bookingState.status !== "ready") {
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

  const rawBooking = bookingState.data;
  const booking = toBookingView(rawBooking);
  const unit = booking.unit;
  const zone = zoneOfBuilding(unit.building);
  const meta = STATUS_META[booking.status];
  const steps = buildTimeline(booking);
  const terminal = TERMINAL.includes(booking.status);
  const current = terminal ? -1 : steps.findIndex((s) => !s.done);
  const slotMs = new Date(booking.slot).getTime();
  const slaLeft = 180_000 - (now - new Date(booking.createdAt).getTime());
  const editable = booking.canModify;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Sảnh toà ${unit.building} Vinhomes Ocean Park`)}`;
  const holdHours = unit.holdHours ?? 48;

  // Outcome check for holding
  const deposit = booking.deposit;
  const expiresMs = deposit?.expiresAt ? new Date(deposit.expiresAt).getTime() : 0;
  const isHoldExpired = expiresMs > 0 && now >= expiresMs && booking.status === "holding";
  const outcome = deposit?.outcome === "forfeited" || isHoldExpired
    ? "forfeited"
    : deposit?.outcome === "refunded"
      ? "refunded"
      : "active";

  // Contract matching for leased status
  const contract = contractsState.status === "ready"
    ? contractsState.data.find((c) => c.bookingRef === booking.ref || (booking.contractId && c.id === booking.contractId))
    : null;

  // Similar units for terminal status
  const similarUnits = terminal && unitsState.status === "ready"
    ? unitsState.data
        .filter((u) => u.code !== unit.code && u.status === "available")
        .slice(0, 2)
        .map(toUnit)
    : [];

  const handleLateRequest = async () => {
    const res = await tenantApi.requestLate(booking.ref);
    if (res.ok) {
      toast("Đã báo Host: bạn xin đến muộn 10 phút", "success");
      reload();
    } else {
      toast(errorText(res));
    }
  };

  const handleLobbyCheckIn = async () => {
    const res = await tenantApi.lobbyCheckIn(booking.ref);
    if (res.ok) {
      toast("Đã báo Host — Host đang xuống sảnh đón bạn", "success");
      reload();
    } else {
      toast(errorText(res));
    }
  };

  const handleRate = async (stars: number) => {
    const res = await tenantApi.rateBooking(booking.ref, stars);
    if (res.ok) {
      toast("Cảm ơn bạn đã đánh giá Field Host", "success");
      reload();
    } else {
      toast(errorText(res));
    }
  };

  const handleDemoStep = async (
    step: Parameters<typeof tenantApi.demoBookingStep>[1],
    successMsg: string,
  ) => {
    const res = await tenantApi.demoBookingStep(booking.ref, step);
    if (res.ok) {
      toast(successMsg, "success");
      reload();
    } else {
      toast(errorText(res));
    }
  };

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
                {!booking.host
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

            {/* ─── KHỐI VIỆC CẦN LÀM THEO SPEC-P04 §4 ─── */}

            {/* 1. closing & chưa có deposit: DepositTermsBox */}
            {booking.status === "closing" && !deposit && (
              <DepositTermsBox
                refCode={booking.ref}
                unitCode={unit.code}
                onSuccess={() => reload()}
              />
            )}

            {/* 2. closing & đã có deposit: VietQR */}
            {booking.status === "closing" && deposit && (
              <div className={styles.qr} style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                <VietQR
                  amount={deposit.amount}
                  content={deposit.transferContent}
                  qrRef={deposit.qrRef}
                  paid={Boolean(deposit.paidAt)}
                />
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <b style={{ color: "var(--ink)" }}>Đang chờ thanh toán cọc...</b>
                  <p className="muted xs" style={{ maxWidth: 480, margin: "4px auto 0" }}>
                    Chuyển khoản 2.000.000đ vào tài khoản định danh nền tảng. Căn được giữ riêng cho bạn {holdHours} giờ kể từ khi ngân hàng báo có.
                  </p>
                  {deposit.vietqr?.simulated && (
                    <span className="badge badge-amber-soft xs" style={{ marginTop: 6, display: "inline-block" }}>
                      Mô phỏng VietQR
                    </span>
                  )}
                </div>
                {showDemo && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    <button
                      type="button"
                      className={styles.demoBtn}
                      onClick={() => handleDemoStep("bank-paid", `Ngân hàng báo có: căn đã khoá ${holdHours} giờ`)}
                    >
                      Demo: Giả lập ngân hàng báo có (2.000.000đ)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. holding & active: Countdown + Action làm HĐ */}
            {booking.status === "holding" && outcome === "active" && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <CountdownBanner
                  expiresAt={deposit?.expiresAt}
                  holdHours={holdHours}
                  now={now}
                  showDemo={showDemo}
                  onExpireDemo={() => handleDemoStep("expire-hold", "Đã tua hết hạn giữ căn")}
                />
                <div className="card" style={{ padding: 16, background: "var(--surface)", marginTop: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <b style={{ fontSize: 16 }}>Căn hộ đang được giữ chỗ cho bạn ({holdHours} giờ)</b>
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
            {outcome === "forfeited" && (
              <div className="card" style={{ padding: 16, background: "var(--coral-50, #fff5f5)", border: "1px solid var(--coral-200, #fed7d7)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "var(--coral-800, #9b2c2c)" }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b style={{ fontSize: 16 }}>Đã hết hạn giữ căn</b>
                    <p style={{ fontSize: 13.5, margin: "4px 0 10px" }}>
                      Hết thời hạn giữ chỗ {holdHours} giờ. Khoản cọc 2.000.000đ không được hoàn (Điều 6.1 Thỏa thuận đặt cọc & Điều 328 BLDS): 1.000.000đ bù chủ nhà, 1.000.000đ phí vận hành nền tảng.
                    </p>
                    <Link href={`/units/${unit.code}?book=1`} className="btn btn-amber btn-sm">
                      Đặt lịch căn khác
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Refunded: Đã huỷ cọc giữ căn */}
            {outcome === "refunded" && (
              <div className="card" style={{ padding: 16, background: "var(--amber-50, #fef8ee)", border: "1px solid var(--amber-200, #fce1b2)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "var(--amber-900, #78350f)" }}>
                  <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b style={{ fontSize: 16 }}>Đã huỷ cọc giữ căn (Hoàn tiền)</b>
                    <p style={{ fontSize: 13.5, margin: "4px 0 10px" }}>
                      Khoản cọc 2.000.000đ được xử lý hoàn trả theo đúng quy định điều khoản cọc và Điều 328 BLDS trong 24 giờ làm việc.
                    </p>
                    <Link href={`/units/${unit.code}?book=1`} className="btn btn-primary btn-sm">
                      Tìm căn khác
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Khối leased theo SPEC-P04 §4 */}
            {booking.status === "leased" && (
              <div className="card" style={{ padding: 18, background: "var(--surface)", border: "1px solid var(--line-strong)", marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Thông tin Hợp đồng thuê</h3>
                    <p className="muted small" style={{ margin: "4px 0 0" }}>
                      Hợp đồng điện tử đã được xác lập thành công
                    </p>
                  </div>
                  {(booking.contractId || contract?.id) && (
                    <a
                      href={tenantApi.contractPdfUrl(booking.contractId || contract!.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="btn btn-primary btn-sm"
                    >
                      <FileText size={16} /> Tải hợp đồng PDF
                    </a>
                  )}
                </div>

                {contract ? (
                  <div style={{ background: "var(--paper-2)", borderRadius: "var(--r)", padding: "12px 16px" }}>
                    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 12px", fontSize: 13.5 }}>
                      <dt className="muted">Số hợp đồng</dt>
                      <dd style={{ textAlign: "right", fontWeight: 600 }}>{contract.contractNumber}</dd>

                      <dt className="muted">Thời hạn thuê</dt>
                      <dd style={{ textAlign: "right", fontWeight: 600 }}>
                        {contract.months} tháng ({contract.startDate} → {contract.endDate})
                      </dd>

                      <dt className="muted">Giá thuê hàng tháng</dt>
                      <dd style={{ textAlign: "right", fontWeight: 600 }}>{vnd(contract.monthlyRent)}đ/tháng</dd>

                      <dt className="muted">Cọc bảo đảm tài sản</dt>
                      <dd style={{ textAlign: "right", fontWeight: 600 }}>
                        {vnd(contract.securityDeposit)}đ (gồm 2.000.000đ cọc giữ chỗ chuyển đổi 100%)
                      </dd>

                      <dt className="muted">Kỳ thanh toán</dt>
                      <dd style={{ textAlign: "right", fontWeight: 600 }}>{contract.paymentCycle} tháng/kỳ</dd>

                      <dt style={{ borderTop: "1px solid var(--line)", paddingTop: 8, fontWeight: 700 }}>
                        Số tiền kỳ đầu cần thanh toán
                      </dt>
                      <dd style={{ borderTop: "1px solid var(--line)", paddingTop: 8, textAlign: "right", fontWeight: 700, color: "var(--primary, #0f4c81)" }}>
                        {vnd(contract.firstPaymentDue.total)}đ
                      </dd>
                    </dl>
                    <p className="xs muted" style={{ margin: "10px 0 0", textAlign: "center" }}>
                      (Bao gồm: {vnd(contract.firstPaymentDue.rent)}đ tiền thuê kỳ 1 + {vnd(contract.firstPaymentDue.depositTopUp)}đ bù cọc bảo đảm. Khoản 2.000.000đ giữ chỗ đã chuyển 100% vào cọc bảo đảm).
                    </p>
                  </div>
                ) : (
                  <div style={{ background: "var(--paper-2)", borderRadius: "var(--r)", padding: "12px 16px" }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      Hợp đồng đã ký kết. Giá thuê: {vnd(unit.rent)}đ/tháng. Khoản 2.000.000đ đã chuyển đổi 100% thành Tiền cọc bảo đảm tài sản.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* THÔNG TIN CĂN HỘ & HOST */}
            <div className={styles.unitRow}>
              <Link href={`/units/${unit.code}`} className={styles.thumb} aria-label={`Xem căn ${unitAddress(unit)}`}>
                <VerifiedPhoto unit={unit} sizes="140px" stamp="none" className={styles.thumbFrame} />
              </Link>
              <dl className={styles.facts}>
                <div>
                  <dt>Căn hộ</dt>
                  <dd>{unitAddress(unit)}</dd>
                  <dd className="muted small">{zone?.name ?? ""}</dd>
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
                  {!booking.host ? (
                    <>
                      <dd className="muted">Đang phân bổ...</dd>
                      <dd className="muted small">Tự động chọn Host gần nhất</dd>
                    </>
                  ) : (
                    <>
                      <dd>{booking.host.name}</dd>
                      <dd className="muted small">
                        <Star size={12} fill="currentColor" style={{ color: "var(--amber)", verticalAlign: "-1px" }} />{" "}
                        {String(booking.host.rating).replace(".", ",")}
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
                  onClick={handleLobbyCheckIn}
                >
                  <MapPinCheck size={18} /> Tôi đã tới sảnh
                </button>
              )}

              {/* Nút xin trễ 10 phút */}
              {booking.status === "confirmed" && !booking.lateRequestedAt && (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={handleLateRequest}
                >
                  <Clock size={15} /> Xin trễ 10′
                </button>
              )}

              {booking.lateRequestedAt && (
                <span className="badge badge-amber-soft" style={{ padding: "6px 10px", fontSize: 13 }}>
                  <Clock size={13} /> Đã xin trễ 10′
                </span>
              )}

              {booking.status === "lobby" && (
                <span className="badge badge-kelp" style={{ padding: "8px 14px", fontSize: 13.5 }}>
                  <Check size={14} /> Đã báo có mặt lúc {fmtTime(booking.lobbyAt ?? booking.createdAt)}
                </span>
              )}

              <a className="btn btn-quiet btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={15} /> Chỉ đường tới sảnh {unit.building}
              </a>

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
                      Chỉ đổi/huỷ được trước giờ hẹn ít nhất 2 giờ.
                    </span>
                  )}
                </>
              )}

              {terminal && (
                <Link href={`/units/${unit.code}?book=1`} className="btn btn-amber btn-sm">
                  Đặt lịch khác
                </Link>
              )}
            </div>

            {/* DEMO TOOLBAR (SPEC-P04 §4: A21) */}
            {showDemo && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--paper-2)", borderRadius: "var(--r)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span className="xs muted" style={{ fontWeight: 600 }}>Công cụ Demo Host:</span>
                {booking.status === "pending" && (
                  <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("host-accept", "Demo: Host nhận lịch thành công")}>
                    Host nhận lịch
                  </button>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("reminder", "Demo: Đã gửi nhắc hẹn Zalo")}>
                      Nhắc hẹn Zalo
                    </button>
                    <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("host-receive", "Demo: Host đón khách tại sảnh")}>
                      Host đón tại sảnh
                    </button>
                  </>
                )}
                {booking.status === "lobby" && (
                  <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("host-receive", "Demo: Host đón khách tại sảnh")}>
                    Host đón tại sảnh
                  </button>
                )}
                {booking.status === "receiving" && (
                  <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("host-view", "Demo: Mở cửa bắt đầu xem phòng")}>
                    Mở cửa xem phòng
                  </button>
                )}
                {booking.status === "viewing" && (
                  <button type="button" className={styles.demoBtn} onClick={() => handleDemoStep("host-start-deposit", "Demo: Chốt căn & mở điều khoản cọc")}>
                    Chốt căn (Mở cọc)
                  </button>
                )}
              </div>
            )}
          </section>

          {/* HỒ SƠ CỦA BẠN (KHI ĐÃ KÝ HỢP ĐỒNG HOẶC eKYC) */}
          {(booking.contractId || booking.kyc) && (
            <section className={`card ${styles.block}`}>
              <h2>Hồ sơ của bạn</h2>
              <ul className={styles.docs}>
                {booking.contractId && (
                  <li>
                    <FileText size={18} />
                    <div>
                      <b>Hợp đồng thuê điện tử</b>
                      <p className="muted small">
                        Mã HĐ: {contract?.contractNumber ?? booking.contractId} · Cọc bảo đảm gồm 2.000.000đ
                      </p>
                    </div>
                    <a
                      href={tenantApi.contractPdfUrl(booking.contractId)}
                      download
                      className="btn btn-quiet btn-sm"
                    >
                      Tải PDF
                    </a>
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
          {booking.status === "leased" && (
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
            booking.host &&
            ["viewing", "closing", "holding", "leased", "completed"].includes(booking.status) && (
              <section className={`card ${styles.block}`}>
                <h2>Đánh giá Field Host {booking.host.name}</h2>
                <div className={styles.stars} role="radiogroup" aria-label="Chấm sao">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={false}
                      aria-label={`${n} sao`}
                      onClick={() => handleRate(n)}
                    >
                      <Star size={30} />
                    </button>
                  ))}
                </div>
              </section>
            )}

          {/* CĂN TƯƠNG ĐƯƠNG */}
          {similarUnits.length > 0 && (
            <section>
              <h2 className={styles.h2}>Căn tương đương bạn có thể xem</h2>
              <div className={styles.similar}>
                {similarUnits.map((u) => (
                  <UnitCard key={u.code} unit={u} cost={allInCost(u, DEFAULT_HOUSEHOLD)} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CỘT PHỤ (TIMELINE) */}
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
        </aside>
      </div>

      {/* MODAL HUỶ LỊCH */}
      <CancelModal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        onConfirm={async (reason) => {
          const res = await tenantApi.cancelBooking(booking.ref, reason);
          if (res.ok) {
            setModal(null);
            toast("Đã huỷ lịch xem phòng", "success");
            reload();
          } else {
            toast(errorText(res));
          }
        }}
      />

      {/* MODAL ĐỔI GIỜ */}
      <RescheduleModal
        open={modal === "reschedule"}
        onClose={() => setModal(null)}
        now={now}
        unitCode={unit.code}
        onConfirm={async (slot) => {
          const res = await tenantApi.rescheduleBooking(booking.ref, slot);
          if (res.ok) {
            setModal(null);
            toast("Đã đổi giờ, Host sẽ xác nhận lại", "success");
            reload();
          } else {
            toast(errorText(res));
          }
        }}
      />

      {/* MODAL LEASE WIZARD (1 BƯỚC eKYC & KÝ HĐ THEO SPEC-P04 §4) */}
      <Modal
        open={modal === "leaseWizard"}
        onClose={() => setModal(null)}
        variant="wide"
        title="Làm hợp đồng thuê căn hộ"
        description={`Ký hợp đồng thuê chính thức căn ${unitAddress(unit)}`}
      >
        <KycCapture
          refCode={booking.ref}
          contactName={booking.contact.name}
          minLeaseMonths={unit.minMonths}
          onSuccess={() => {
            setModal(null);
            toast("Ký hợp đồng thuê thành công!", "success");
            reload();
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}

// ─── COMPONENT CON: COUNTDOWN BANNER ──────────────────────────────────────────────────────────

function CountdownBanner({
  expiresAt,
  holdHours,
  now,
  showDemo,
  onExpireDemo,
}: {
  expiresAt?: string;
  holdHours: number;
  now: number;
  showDemo: boolean;
  onExpireDemo: () => void;
}) {
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const msLeft = expiresMs > 0 ? expiresMs - now : 0;

  if (msLeft <= 0) {
    return (
      <div className="card" style={{ padding: 12, background: "var(--coral-50)", color: "var(--coral-800)" }}>
        <b>Đã hết hạn giữ căn</b>
      </div>
    );
  }

  const h = Math.floor(msLeft / 3600_000);
  const m = Math.floor((msLeft % 3600_000) / 60_000);
  const s = Math.floor((msLeft % 60_000) / 1000);

  const timeLeftText = msLeft < 3600_000 ? `Còn ${m} phút ${s} giây` : `Còn ${h} giờ ${m} phút`;
  const totalMs = holdHours * 3600_000;
  const pct = Math.min(100, Math.max(0, ((totalMs - msLeft) / totalMs) * 100));

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
        {showDemo && (
          <button type="button" className={styles.demoBtn} onClick={onExpireDemo}>
            Demo: Tua hết hạn giữ căn
          </button>
        )}
      </div>

      <div style={{ height: 6, background: "var(--amber-200, #fce1b2)", borderRadius: 999, overflow: "hidden", margin: "8px 0" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--amber-600, #d97706)", transition: "width 0.3s ease" }} />
      </div>

      {expiresAt && (
        <p className="xs muted" style={{ margin: 0 }}>
          Giữ căn tới <b>{fmtDateTime(expiresAt)}</b>. Quá thời hạn này mà chưa hoàn tất ký Hợp đồng thuê thì căn hộ tự động mở lại.
        </p>
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
  unitCode,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  now: number;
  unitCode: string;
  onConfirm: (slot: string) => void;
}) {
  const [slot, setSlot] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<string[]>([]);

  useEffect(() => {
    if (open && unitCode) {
      tenantApi.busySlots(unitCode).then((res) => {
        if (res.ok && res.data) {
          setBusySlots(res.data.slots || []);
        }
      });
    }
  }, [open, unitCode]);

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
        busySlots={busySlots}
      />
    </Modal>
  );
}
