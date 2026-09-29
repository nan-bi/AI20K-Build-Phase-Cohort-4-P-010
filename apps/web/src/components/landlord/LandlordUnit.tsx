"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CircleAlert, ShieldCheck, Timer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { VerifiedPhoto } from "@/components/unit/VerifiedPhoto";
import { cancelMandateExit, requestMandateExit } from "@/lib/mock/actions";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { fmtDate, fmtDateTime, fmtTime, maskPhone, vnd } from "@/lib/mock/format";
import { activeLease, holdDaysLeft, isOpenBooking, unitDisplayStatus } from "@/lib/mock/selectors";
import { viewingLog, type ViewingLogEntry } from "@/lib/mock/selectors-viewing";
import { SERVICE_FEE_RATE } from "@/lib/mock/stats";
import { useMock } from "@/lib/mock/store";
import { PASSPORT_ITEMS, hostById, hostForUnit, unitAddress, unitById, zoneById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const OUTCOME_LABEL: Record<ViewingLogEntry["outcome"], { label: string; badge: string }> = {
  in_progress: { label: "Đang xem", badge: "badge-amber-soft" },
  deposit: { label: "Khách cọc", badge: "badge-kelp" },
  not_decided: { label: "Chưa quyết định", badge: "badge-plain" },
  no_show: { label: "Bỏ hẹn", badge: "badge-coral-soft" },
  cancelled: { label: "Đã huỷ", badge: "badge-plain" },
};

export function LandlordUnit({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(60_000);
  const [exit, setExit] = useState(false);
  const [agree, setAgree] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const unit = unitById(id);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 420 }} />;
  if (!unit) {
    return (
      <div className={styles.page}>
        <h1>Không tìm thấy căn hộ</h1>
        <Link href="/landlord/dashboard" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Về tổng quan
        </Link>
      </div>
    );
  }

  const s = unitDisplayStatus(state, unit);
  const m = state.mandates[unit.id];
  const host = hostForUnit(unit);
  const lease = activeLease(state, unit.id);
  const days = m?.exitEffectiveAt ? Math.max(0, Math.ceil((new Date(m.exitEffectiveAt).getTime() - now) / 86_400_000)) : 0;
  const elapsed = m?.exitRequestedAt && m.exitEffectiveAt ? (now - new Date(m.exitRequestedAt).getTime()) / (new Date(m.exitEffectiveAt).getTime() - new Date(m.exitRequestedAt).getTime()) : 0;
  const bookings = state.bookings.filter((b) => b.unitId === unit.id).sort((a, b) => b.slot.localeCompare(a.slot));
  const openCount = state.bookings.filter((b) => b.unitId === unit.id && isOpenBooking(b)).length;
  const holdingBooking = state.bookings.find(
    (b) => b.unitId === unit.id && (b.status === "holding" || b.deposit?.paidAt)
  );
  const holdDays = holdingBooking ? holdDaysLeft(holdingBooking, now) : 7;
  const logs = viewingLog(state, { unitId: unit.id });
  const audit = state.notices.filter((n) => n.unitId === unit.id && (n.audience === "landlord" || n.audience === "admin")).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const rent = lease?.lease?.rent ?? unit.rent;

  let statusBadgeEl = <span className="badge badge-kelp">Đang mở đón khách</span>;
  if (s === "viewing") {
    statusBadgeEl = <span className="badge badge-amber-soft">Có khách xem · {openCount} lịch</span>;
  } else if (s === "holding") {
    statusBadgeEl = <span className="badge badge-amber-soft">Đang giữ căn · còn {holdDays} ngày</span>;
  } else if (s === "rented") {
    statusBadgeEl = <span className="badge badge-ink">Đang cho thuê</span>;
  }

  return (
    <div className={styles.page}>
      <PageHeader title={unitAddress(unit)} back={{ href: "/landlord/units", label: "Căn hộ" }} />

      <section className={`card ${styles.hero}`}>
        <VerifiedPhoto unit={unit} sizes="220px" stamp="compact" className={styles.heroPhoto} />
        <div className={styles.heroBody}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {statusBadgeEl}
            <span className="badge badge-plain">{unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ tại quầy phân khu"}</span>
          </div>
          <p className="muted">
            {zoneById(unit.zoneId).name} · {unit.layoutLabel} · {unit.areaM2} m² · mã {unit.code}
          </p>
          <p className="small">
            Giá thuê <b>{vnd(rent)}đ</b>/tháng · khách thấy All-in <b>{vnd(allInCost(unit, DEFAULT_HOUSEHOLD).total)}đ</b> · Field Host phụ trách <b>{host.name}</b>
          </p>
          <Link href={`/units/${unit.id}`} className="link small">
            Xem trang tin đăng công khai
          </Link>
        </div>
      </section>

      <div className={styles.grid2}>
        <section className={`card ${styles.mandate}`}>
          <h2>Ủy quyền ký gửi độc quyền</h2>
          {m?.status === "exiting" ? (
            <>
              <div className={styles.countdown}>
                <b className="num">{days}</b>
                <span className="muted">ngày nữa hết ủy quyền ({fmtDate(m.exitEffectiveAt!)})</span>
              </div>
              <div className={styles.bar} role="img" aria-label={`Đã qua ${Math.round(elapsed * 100)}% thời gian báo trước`}>
                <i style={{ width: `${Math.min(100, Math.max(4, elapsed * 100))}%` }} />
              </div>
              <p className="small muted">Trong thời gian này căn vẫn hiển thị để đón nốt khách. Hết hạn, căn chuyển “unlisted”, mã cửa và chìa cơ bị thu hồi khỏi mạng lưới Host.</p>
              <button
                type="button"
                className="btn btn-quiet"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  cancelMandateExit(unit);
                  toast("Đã huỷ yêu cầu thoát, ủy quyền tiếp tục", "success");
                }}
              >
                Huỷ yêu cầu thoát
              </button>
            </>
          ) : (
            <>
              <p style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ShieldCheck size={18} style={{ color: "var(--kelp)" }} /> Đang hiệu lực từ {m ? fmtDate(m.signedAt) : "—"}
              </p>
              <p className="small muted">VinStay AI điều phối lịch xem, Field Host đón khách và mở cửa. Bạn có thể thoát ủy quyền khi căn đang trống, báo trước 15 ngày.</p>
              <button
                type="button"
                className="btn btn-danger"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                  setAgree(false);
                  setBlocked(null);
                  setExit(true);
                }}
              >
                Yêu cầu ngừng ủy quyền
              </button>
            </>
          )}
        </section>

        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Nhật ký mở cửa và thông báo</h2>
          <ul className={styles.log}>
            {audit.map((n) => (
              <li key={n.id}>
                <time>{fmtDateTime(n.at)}</time>
                <div>
                  <b>{n.title}</b>
                  <p className="small muted">{n.body}</p>
                </div>
              </li>
            ))}
            {audit.length === 0 && <li className="muted small">Chưa có sự kiện nào cho căn này.</li>}
          </ul>
        </section>
      </div>

      <section className={`card ${styles.padCard}`}>
        <h2 className={styles.h2}>Nhật ký xem phòng ({logs.length})</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows} style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col">Bắt đầu</th>
                <th scope="col">Mở cửa</th>
                <th scope="col">Kết thúc</th>
                <th scope="col">Thời lượng</th>
                <th scope="col">Khách</th>
                <th scope="col">Field Host</th>
                <th scope="col">Kết quả</th>
                <th scope="col">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.bookingId}>
                  <td className="tnum">{fmtDateTime(log.startedAt)}</td>
                  <td className="tnum">{log.doorOpenedAt ? fmtTime(log.doorOpenedAt) : "—"}</td>
                  <td className="tnum">{log.endedAt ? fmtTime(log.endedAt) : "—"}</td>
                  <td>{log.durationMin !== undefined ? `${log.durationMin} phút` : "—"}</td>
                  <td>
                    {log.tenantName}
                    <span className="muted xs" style={{ display: "block" }}>
                      {log.tenantPhoneMasked}
                    </span>
                  </td>
                  <td>{hostById(log.hostId)?.name ?? host.name}</td>
                  <td>
                    <span className={`badge ${OUTCOME_LABEL[log.outcome]?.badge ?? "badge-plain"}`}>
                      {OUTCOME_LABEL[log.outcome]?.label ?? log.outcome}
                    </span>
                  </td>
                  <td className="small muted">{log.note || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 28 }}>
                    Chưa có lượt dẫn khách nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`card ${styles.padCard}`}>
        <h2 className={styles.h2}>Lịch xem phòng ({bookings.length})</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows} style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">Giờ hẹn</th>
                <th scope="col">Khách</th>
                <th scope="col">Field Host</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="tnum">{fmtDateTime(b.slot)}</td>
                  <td>
                    {b.tenant.name}
                    <span className="muted xs" style={{ display: "block" }}>
                      {maskPhone(b.tenant.phone)}
                    </span>
                  </td>
                  <td>{host.name}</td>
                  <td>
                    <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 28 }}>
                    Chưa có lịch xem nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted xs" style={{ marginTop: 10 }}>
          Số điện thoại khách được che; mọi liên lạc với khách đi qua Zalo VinStay.
        </p>
      </section>

      <div className={styles.grid2}>
        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Hợp đồng thuê hiện hành</h2>
          {lease?.lease ? (
            <dl className={styles.summary} style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <dt>Hợp đồng</dt>
                <dd>{lease.lease.docId}</dd>
              </div>
              <div>
                <dt>Kỳ hạn</dt>
                <dd>{lease.lease.months} tháng</dd>
              </div>
              <div>
                <dt>Bắt đầu</dt>
                <dd>{fmtDate(lease.lease.startDate)}</dd>
              </div>
              <div>
                <dt>Bạn nhận mỗi tháng</dt>
                <dd>{vnd(Math.round(lease.lease.rent * (1 - SERVICE_FEE_RATE)))}đ</dd>
              </div>
              <div>
                <dt>Người thuê</dt>
                <dd>{lease.tenant.name}</dd>
              </div>
              <div>
                <dt>Cọc bảo đảm</dt>
                <dd>{vnd(lease.lease.rent)}đ (đã gồm 2.000.000đ)</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Căn đang trống, chưa có hợp đồng thuê.</p>
          )}
        </section>

        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Hộ chiếu bàn giao số</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            10 hạng mục nội thất có dấu thời gian, căn cứ đối soát khi khách trả phòng.
          </p>
          <ul className={styles.passport}>
            {PASSPORT_ITEMS.map((p) => (
              <li key={p}>
                <CheckCircle2 size={15} /> {p}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Modal
        open={exit}
        onClose={() => setExit(false)}
        title="Ngừng ủy quyền ký gửi"
        description={unitAddress(unit)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-quiet" onClick={() => setExit(false)}>
              Giữ ủy quyền
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!agree}
              onClick={() => {
                const r = requestMandateExit(unit);
                if (r.ok) {
                  setExit(false);
                  toast(r.hasViewingsToday ? "Đã ghi nhận. Host sẽ hoàn tất các lịch xem đã hẹn trước." : "Đã ghi nhận, bắt đầu đếm ngược 15 ngày", "success");
                } else setBlocked(r.reason);
              }}
            >
              Gửi yêu cầu thoát
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ul className={styles.terms}>
            <li>
              <Timer size={16} /> Báo trước tối thiểu <b>15 ngày</b>; trong thời gian này căn vẫn đón nốt khách.
            </li>
            <li>
              <CheckCircle2 size={16} /> Căn phải đang <b>trống</b>: không có cọc giữ chỗ hay hợp đồng thuê hiệu lực.
            </li>
            <li>
              <CheckCircle2 size={16} /> Hết hạn, mã cửa và chìa cơ bị thu hồi khỏi mạng lưới Field Host.
            </li>
          </ul>
          {blocked && (
            <div className={styles.blocked} role="alert">
              <CircleAlert size={18} style={{ flex: "none", marginTop: 2 }} />
              <span>{blocked}</span>
            </div>
          )}
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Tôi hiểu điều kiện thoát và xác nhận muốn ngừng ủy quyền cho căn này.</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
