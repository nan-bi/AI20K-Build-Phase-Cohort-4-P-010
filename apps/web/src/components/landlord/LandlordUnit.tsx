"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CircleAlert, ShieldCheck, Timer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { fmtDate, fmtDateTime, fmtTime, vnd } from "@/lib/mock/format";
import { errorText, landlordApi } from "@/lib/landlord/api";
import { queries } from "@/lib/landlord/queries";
import { PASSPORT_ITEMS, VIEWING_OUTCOME_META, daysLeft, hoursLeft, unitLabel } from "@/lib/landlord/labels";
import type { UnitDetail } from "@/lib/landlord/types";
import { invalidateLandlordData, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { useNow } from "@/lib/useNow";
import { QueryView } from "./QueryView";
import { UnitPhoto } from "./UnitPhoto";
import styles from "./Landlord.module.css";

export function LandlordUnit({ id }: { id: string }) {
  const query = useLandlordQuery(queries.unit(id));
  return (
    <div className={styles.page}>
      <QueryView query={query} skeleton="detail">{(unit) => <UnitBody unit={unit} />}</QueryView>
    </div>
  );
}

function UnitBody({ unit }: { unit: UnitDetail }) {
  const now = useNow(60_000);
  const [exit, setExit] = useState(false);
  const [agree, setAgree] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logs = unit.viewings;
  const m = unit.mandate;
  const lease = unit.lease;
  const label = unitLabel(unit);
  const photo = unit.media[0];
  const exiting = m?.status === "exiting" && !!m.exitEffectiveAt;
  const days = exiting && now ? daysLeft(m.exitEffectiveAt!, now) : 0;
  const elapsed =
    exiting && now && m.exitRequestedAt
      ? (now - new Date(m.exitRequestedAt).getTime()) / (new Date(m.exitEffectiveAt!).getTime() - new Date(m.exitRequestedAt).getTime())
      : 0;
  const holdHours = unit.holding ? hoursLeft(unit.holding.expiresAt, now) : null;

  let statusBadge = <span className="badge badge-kelp">Đang mở đón khách</span>;
  if (unit.status === "viewing") statusBadge = <span className="badge badge-amber-soft">Có khách xem</span>;
  else if (unit.status === "holding") statusBadge = <span className="badge badge-amber-soft">Đang giữ căn{holdHours !== null ? ` · còn ${holdHours} giờ` : ""}</span>;
  else if (unit.status === "rented") statusBadge = <span className="badge badge-ink">Đang cho thuê</span>;
  else if (unit.status === "unlisted") statusBadge = <span className="badge badge-plain">Chưa niêm yết</span>;
  else if (unit.status === "maintenance") statusBadge = <span className="badge badge-plain">Đang bảo trì</span>;

  const requestExit = async () => {
    if (!m) return;
    setBusy(true);
    const res = await landlordApi.requestExit(m.id, "Chủ nhà yêu cầu thoát từ trang chi tiết căn");
    setBusy(false);
    if (!res.ok) {
      setBlocked(errorText(res));
      return;
    }
    setExit(false);
    toast("Đã ghi nhận, bắt đầu đếm ngược 15 ngày", "success");
    invalidateLandlordData();
  };

  const cancelExit = async () => {
    if (!m) return;
    const res = await landlordApi.cancelExit(m.id);
    if (!res.ok) {
      toast(errorText(res));
      return;
    }
    toast("Đã huỷ yêu cầu thoát, ủy quyền tiếp tục", "success");
    invalidateLandlordData();
  };

  return (
    <>
      <PageHeader title={label} back={{ href: "/landlord/units", label: "Căn hộ" }} />

      <section className={`card ${styles.hero}`}>
        <UnitPhoto url={photo?.url ?? null} verifiedAt={photo?.verifiedAt} alt={`Căn ${unit.unitCode}`} sizes="220px" className={styles.heroPhoto} />
        <div className={styles.heroBody}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {statusBadge}
            <span className="badge badge-plain">{unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ tại quầy phân khu"}</span>
          </div>
          <p className="muted">
            {unit.zone} · {unit.layoutKind} · {unit.carpetAreaM2} m² · mã {unit.unitCode}
          </p>
          <p className="small">
            Giá thuê <b>{vnd(unit.rent)}đ</b>/tháng · khách thấy All-in <b>{vnd(unit.allInCost.total)}đ</b>
            {unit.host?.name ? (
              <>
                {" "}
                · Field Host phụ trách <b>{unit.host.name}</b>
              </>
            ) : null}
          </p>
          <Link href={`/units/${unit.id}`} className="link small">
            Xem trang tin đăng công khai
          </Link>
        </div>
      </section>

      <div className={styles.grid2}>
        <section className={`card ${styles.mandate}`}>
          <h2>Ủy quyền ký gửi độc quyền</h2>
          {!m ? (
            <p className="small muted">Căn này chưa có bản ghi ủy quyền trong hệ thống. Liên hệ VinStay để hoàn tất hồ sơ ký gửi.</p>
          ) : exiting ? (
            <>
              <div className={styles.countdown}>
                <b className="num">{days}</b>
                <span className="muted">ngày nữa hết ủy quyền ({fmtDate(m.exitEffectiveAt!)})</span>
              </div>
              <div className={styles.bar} role="img" aria-label={`Đã qua ${Math.round(elapsed * 100)}% thời gian báo trước`}>
                <i style={{ width: `${Math.min(100, Math.max(4, elapsed * 100))}%` }} />
              </div>
              <p className="small muted">Trong thời gian này căn vẫn hiển thị để đón nốt khách. Hết hạn, căn chuyển “unlisted”, mã cửa và chìa cơ bị thu hồi khỏi mạng lưới Host.</p>
              <button type="button" className="btn btn-quiet" style={{ alignSelf: "flex-start" }} onClick={cancelExit}>
                Huỷ yêu cầu thoát
              </button>
            </>
          ) : m.status === "active" ? (
            <>
              <p style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ShieldCheck size={18} style={{ color: "var(--kelp)" }} /> Đang hiệu lực{m.signedAt ? ` từ ${fmtDate(m.signedAt)}` : ""}
              </p>
              {m.renewsAt && (
                <p className="small muted">Kỳ uỷ quyền 12 tháng · tự gia hạn ngày {fmtDate(m.renewsAt)}. Chống cắt cầu: tới hết HĐ + 06 tháng.</p>
              )}
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
          ) : (
            <p className="small muted">Ủy quyền ở trạng thái “{m.status === "pending_inspection" ? "chờ thẩm định" : "đã kết thúc"}”.</p>
          )}
        </section>

        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Nhật ký mở cửa</h2>
          <ul className={styles.log}>
            {unit.doorAudit.slice(0, 8).map((e) => (
              <li key={e.id}>
                <time>{fmtDateTime(e.at)}</time>
                <div>
                  <b>{e.actorName ?? "Field Host"} xem mã cửa</b>
                  {e.expiresAt && <p className="small muted">Mã hiệu lực tới {fmtTime(e.expiresAt)}</p>}
                </div>
              </li>
            ))}
            {unit.doorAudit.length === 0 && <li className="muted small">Chưa có lượt mở cửa nào cho căn này.</li>}
          </ul>
        </section>
      </div>

      <section className={`card ${styles.padCard}`}>
        <h2 className={styles.h2}>Nhật ký xem phòng ({logs.length})</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows} style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col">Giờ hẹn</th>
                <th scope="col">Khách đến sảnh</th>
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
                <tr key={log.id}>
                  <td className="tnum">{fmtDateTime(log.slot)}</td>
                  <td className="tnum">{log.lobbyCheckInAt ? fmtTime(log.lobbyCheckInAt) : "—"}</td>
                  <td className="tnum">{log.completedAt ? fmtTime(log.completedAt) : "—"}</td>
                  <td>{log.durationMin !== null ? `${log.durationMin} phút` : "—"}</td>
                  <td>
                    {log.tenantName ?? "—"}
                    {log.tenantPhoneMasked && (
                      <span className="muted xs" style={{ display: "block" }}>
                        {log.tenantPhoneMasked}
                      </span>
                    )}
                  </td>
                  <td>{log.host?.name ?? unit.host?.name ?? "—"}</td>
                  <td>
                    <span className={`badge ${VIEWING_OUTCOME_META[log.outcome].badge}`}>{VIEWING_OUTCOME_META[log.outcome].label}</span>
                  </td>
                  <td className="small muted">{log.cancelReason || "—"}</td>
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
        <p className="muted xs" style={{ marginTop: 10 }}>
          Số điện thoại khách được che; mọi liên lạc với khách đi qua Zalo VinStay.
        </p>
      </section>

      <div className={styles.grid2}>
        <section className={`card ${styles.padCard}`}>
          <h2 className={styles.h2}>Hợp đồng thuê hiện hành</h2>
          {lease ? (
            <dl className={styles.summary} style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <dt>Hợp đồng</dt>
                <dd>{lease.contractNumber}</dd>
              </div>
              <div>
                <dt>Kỳ hạn</dt>
                <dd>{lease.months} tháng</dd>
              </div>
              <div>
                <dt>Bắt đầu</dt>
                <dd>{fmtDate(lease.startDate)}</dd>
              </div>
              <div>
                <dt>Bạn nhận mỗi tháng</dt>
                <dd>{vnd(lease.landlordNet)}đ</dd>
              </div>
              <div>
                <dt>Người thuê</dt>
                <dd>{lease.tenantName ?? "—"}</dd>
              </div>
              <div>
                <dt>Cọc bảo đảm</dt>
                <dd>{vnd(lease.securityDeposit)}đ</dd>
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
        description={label}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-quiet" onClick={() => setExit(false)}>
              Giữ ủy quyền
            </button>
            <button type="button" className="btn btn-danger" disabled={!agree || busy} onClick={requestExit}>
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
    </>
  );
}
