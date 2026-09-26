"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, KeyRound, Smartphone, Timer, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { approveConsignment, rejectConsignment } from "@/lib/mock/actions";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { fmtDate, vnd } from "@/lib/mock/format";
import { unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { FURNISHING_LABEL, LAYOUT_LABEL, UNITS, ZONES, hostForUnit, landlordById, unitAddress, unitById, zoneById, type UnitStatus } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

type Tab = "units" | "requests" | "exit";
const ST: Record<UnitStatus, { label: string; badge: string }> = {
  available: { label: "Còn trống", badge: "badge-kelp" },
  holding: { label: "Giữ chỗ 24h", badge: "badge-amber-soft" },
  rented: { label: "Đã cho thuê", badge: "badge-ink" },
};
const CS: Record<Consignment["status"], { label: string; badge: string }> = {
  draft: { label: "Chưa ký ủy quyền", badge: "badge-plain" },
  pending: { label: "Chờ duyệt", badge: "badge-amber-soft" },
  approved: { label: "Đã duyệt", badge: "badge-kelp" },
  rejected: { label: "Không duyệt", badge: "badge-coral-soft" },
};

export function AdminInventory({ initialTab }: { initialTab: Tab }) {
  const state = useMock();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<UnitStatus | "all">("all");
  const [lock, setLock] = useState<"all" | "smart" | "physical">("all");
  const [rejecting, setRejecting] = useState<Consignment | null>(null);
  const [note, setNote] = useState("Ảnh hiện trạng chưa rõ, cần bổ sung");

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 360 }} />;

  const pending = state.consignments.filter((c) => c.status === "pending");
  const exiting = Object.values(state.mandates).filter((m) => m.status === "exiting");
  const units = UNITS.filter((u) => (zone === "all" || u.zoneId === zone) && (status === "all" || unitStatus(state, u) === status) && (lock === "all" || u.lock === lock));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Căn hộ và ký gửi</h1>
          <p className="muted">Rổ hàng ký gửi độc quyền: chi phí kiểm định một lần khi tiếp nhận, không môi giới ngoài.</p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "units"} onClick={() => setTab("units")}>
          Rổ hàng ({UNITS.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>
          Yêu cầu ký gửi {pending.length > 0 && <i>{pending.length}</i>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "exit"} onClick={() => setTab("exit")}>
          Thoát uỷ quyền 15 ngày {exiting.length > 0 && <i>{exiting.length}</i>}
        </button>
      </div>

      {tab === "units" && (
        <>
          <div className={styles.tools}>
            <select className="select" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Lọc theo phân khu">
              <option value="all">Mọi phân khu</option>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as UnitStatus | "all")} aria-label="Lọc theo trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="available">Còn trống</option>
              <option value="holding">Giữ chỗ 24h</option>
              <option value="rented">Đã cho thuê</option>
            </select>
            <select className="select" value={lock} onChange={(e) => setLock(e.target.value as "all" | "smart" | "physical")} aria-label="Lọc theo loại khoá">
              <option value="all">Mọi loại khoá</option>
              <option value="smart">Khoá điện tử</option>
              <option value="physical">Chìa cơ</option>
            </select>
            <span className="muted small">{units.length} căn</span>
          </div>
          <div className={`card ${styles.tableCard}`}>
            <div className={styles.tableScroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">Căn hộ</th>
                    <th scope="col">Phân khu · Host</th>
                    <th scope="col">Loại</th>
                    <th scope="col" className={styles.right}>Giá thuê</th>
                    <th scope="col" className={styles.right}>All-in</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Khoá</th>
                    <th scope="col">Chủ nhà</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const s = unitStatus(state, u);
                    const m = state.mandates[u.id];
                    return (
                      <tr key={u.id}>
                        <td>
                          <Link href={`/units/${u.id}`} className="link" style={{ textDecoration: "none" }}>
                            <b>{unitAddress(u)}</b>
                          </Link>
                          <span className="muted xs" style={{ display: "block" }}>
                            {u.code}
                          </span>
                        </td>
                        <td>
                          {zoneById(u.zoneId).short}
                          <span className="muted xs" style={{ display: "block" }}>
                            {hostForUnit(u).name}
                          </span>
                        </td>
                        <td>
                          {u.layoutLabel} · {u.areaM2}m²
                        </td>
                        <td className={`${styles.right} tnum`}>{vnd(u.rent)}</td>
                        <td className={`${styles.right} tnum`}>{vnd(allInCost(u, DEFAULT_HOUSEHOLD).total)}</td>
                        <td>
                          <span className={`badge ${ST[s].badge}`}>{ST[s].label}</span>
                          {m?.status === "exiting" && (
                            <span className="badge badge-coral-soft" style={{ marginLeft: 6 }}>
                              <Timer size={12} /> Đang thoát
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-plain">
                            {u.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />} {u.lock === "smart" ? "Điện tử" : "Chìa cơ"}
                          </span>
                        </td>
                        <td>{landlordById(u.landlordId)?.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "requests" && (
        <>
          {state.consignments.length === 0 && <div className={styles.empty}>Chưa có yêu cầu ký gửi.</div>}
          <div className={styles.reqs}>
            {state.consignments.map((c) => (
              <article key={c.id} className={`card ${styles.req}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3>
                      {c.building} · Tầng {c.floor} · Căn {c.door}
                    </h3>
                    <p className="muted small">{landlordById(c.landlordId)?.name}</p>
                  </div>
                  <span className={`badge ${CS[c.status].badge}`}>{CS[c.status].label}</span>
                </div>
                <dl className={styles.reqMeta}>
                  <div>
                    <dt>Loại căn</dt>
                    <dd>
                      {LAYOUT_LABEL[c.layout]} · {c.areaM2} m²
                    </dd>
                  </div>
                  <div>
                    <dt>Giá chào thuê</dt>
                    <dd>{vnd(c.askRent)}đ/tháng</dd>
                  </div>
                  <div>
                    <dt>Nội thất</dt>
                    <dd>{FURNISHING_LABEL[c.furnishing]}</dd>
                  </div>
                  <div>
                    <dt>Khoá cửa</dt>
                    <dd>{c.lock === "smart" ? "Khoá điện tử (mã hoá AES-256)" : "Chìa cơ gửi quầy phân khu"}</dd>
                  </div>
                  <div>
                    <dt>Thẩm định ảnh</dt>
                    <dd>{c.auditByHost ? "Host chụp miễn phí" : "Chủ nhà tự tải"}</dd>
                  </div>
                  <div>
                    <dt>Gửi lúc</dt>
                    <dd>{fmtDate(c.createdAt)}</dd>
                  </div>
                </dl>
                {c.note && <p className="small muted">Ghi chú: {c.note}</p>}
                {c.status === "pending" && (
                  <div className={styles.reqActions}>
                    <button type="button" className="btn btn-quiet" onClick={() => setRejecting(c)}>
                      <X size={16} /> Không duyệt
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ flex: 1 }}
                      onClick={() => {
                        approveConsignment(c.id);
                        toast("Đã duyệt. Zalo báo chủ nhà và Host lên lịch thẩm định ảnh.", "success");
                      }}
                    >
                      <Check size={16} /> Duyệt ký gửi
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "exit" && (
        <>
          {exiting.length === 0 && <div className={styles.empty}>Không có căn nào đang đếm ngược thoát uỷ quyền.</div>}
          <div className={styles.reqs}>
            {exiting.map((m) => {
              const u = unitById(m.unitId)!;
              const days = Math.max(0, Math.ceil((new Date(m.exitEffectiveAt!).getTime() - now) / 86_400_000));
              return (
                <article key={m.unitId} className={`card ${styles.req}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <h3>{unitAddress(u)}</h3>
                      <p className="muted small">{landlordById(u.landlordId)?.name}</p>
                    </div>
                    <span className="badge badge-coral-soft">
                      <Timer size={12} /> Còn {days} ngày
                    </span>
                  </div>
                  <dl className={styles.reqMeta}>
                    <div>
                      <dt>Yêu cầu lúc</dt>
                      <dd>{fmtDate(m.exitRequestedAt!)}</dd>
                    </div>
                    <div>
                      <dt>Hiệu lực</dt>
                      <dd>{fmtDate(m.exitEffectiveAt!)}</dd>
                    </div>
                  </dl>
                  <p className="small muted">Hết hạn, căn tự chuyển “unlisted”, mã cửa và chìa cơ bị thu hồi khỏi mạng lưới Host. Trong thời gian này căn vẫn hiển thị để đón nốt khách.</p>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        variant="sheet"
        title="Không duyệt yêu cầu ký gửi"
        footer={
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (!rejecting) return;
              rejectConsignment(rejecting.id, note);
              setRejecting(null);
              toast("Đã từ chối và báo chủ nhà qua Zalo");
            }}
          >
            Xác nhận không duyệt
          </button>
        }
      >
        <label className="field">
          <span className="label">Lý do (gửi cho chủ nhà)</span>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
