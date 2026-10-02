"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, KeyRound, Smartphone, Timer, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { approveConsignment, rejectConsignment } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/actors";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { fmtDate, vnd } from "@/lib/mock/format";
import { unitDisplayStatus } from "@/lib/mock/selectors";
import { inspectionSummary, isInspectOverdue } from "@/lib/mock/selectors-inspection";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { FURNISHING_LABEL, LAYOUT_LABEL, UNITS, ZONES, hostById, hostForUnit, landlordById, unitAddress, unitById, zoneById, type Unit, type UnitDisplayStatus } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

type Tab = "units" | "requests" | "exit";

export function AdminInventory({ initialTab }: { initialTab: Tab }) {
  const state = useMock();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState<UnitDisplayStatus | "all">("all");
  const [lock, setLock] = useState<"all" | "smart" | "physical">("all");
  const [rejecting, setRejecting] = useState<Consignment | null>(null);
  const [note, setNote] = useState("Ảnh hiện trạng chưa rõ, cần bổ sung");
  const [rejectError, setRejectError] = useState("");

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 360 }} />;

  const reviewing = state.consignments.filter((c) => c.status === "reviewing");
  const inspecting = state.consignments.filter((c) => c.status === "awaiting_host" || c.status === "inspecting");
  const overdueCount = inspecting.filter((c) => isInspectOverdue(c, now)).length;
  const exiting = Object.values(state.mandates).filter((m) => m.status === "exiting");
  const units = UNITS.filter((u) => (zone === "all" || u.zoneId === zone) && (status === "all" || unitDisplayStatus(state, u) === status) && (lock === "all" || u.lock === lock));

  return (
    <div className={styles.page}>
      <PageHeader title="Căn hộ và ký gửi" description="Rổ hàng ký gửi độc quyền: chi phí kiểm định một lần khi tiếp nhận, không môi giới ngoài." />

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "units"} onClick={() => setTab("units")}>
          Rổ hàng ({UNITS.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>
          Yêu cầu ký gửi {reviewing.length > 0 && <i>{reviewing.length}</i>}
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
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as UnitDisplayStatus | "all")} aria-label="Lọc theo trạng thái">
              <option value="all">Mọi trạng thái</option>
              <option value="available">Còn trống</option>
              <option value="viewing">Có khách xem</option>
              <option value="holding">Đang giữ căn</option>
              <option value="rented">Đã cho thuê</option>
            </select>
            <select className="select" value={lock} onChange={(e) => setLock(e.target.value as "all" | "smart" | "physical")} aria-label="Lọc theo loại khoá">
              <option value="all">Mọi loại khoá</option>
              <option value="smart">Khoá điện tử</option>
              <option value="physical">Chìa cơ</option>
            </select>
            <span className="muted small">{units.length} căn</span>
          </div>
          <DataTable<Unit>
            columns={
              [
                {
                  key: "unit",
                  header: "Căn hộ",
                  render: (u) => (
                    <>
                      <b>{unitAddress(u)}</b>
                      <span className="muted xs" style={{ display: "block" }}>
                        {u.code}
                      </span>
                    </>
                  ),
                },
                {
                  key: "zone",
                  header: "Phân khu · Host",
                  render: (u) => (
                    <>
                      {zoneById(u.zoneId).short}
                      <span className="muted xs" style={{ display: "block" }}>
                        {hostForUnit(u).name}
                      </span>
                    </>
                  ),
                },
                { key: "layout", header: "Loại", render: (u) => `${u.layoutLabel} · ${u.areaM2}m²` },
                { key: "rent", header: "Giá thuê", align: "right", render: (u) => vnd(u.rent) },
                { key: "allin", header: "All-in", align: "right", render: (u) => vnd(allInCost(u, DEFAULT_HOUSEHOLD).total) },
                {
                  key: "status",
                  header: "Trạng thái",
                  render: (u) => {
                    const s = unitDisplayStatus(state, u);
                    const m = state.mandates[u.id];
                    let badgeEl = <span className="badge badge-kelp">Còn trống</span>;
                    if (s === "viewing") {
                      badgeEl = <span className="badge badge-amber-soft">Có khách xem</span>;
                    } else if (s === "holding") {
                      badgeEl = <span className="badge badge-amber-soft">Đang giữ căn</span>;
                    } else if (s === "rented") {
                      badgeEl = <span className="badge badge-ink">Đã cho thuê</span>;
                    }
                    return (
                      <>
                        {badgeEl}
                        {m?.status === "exiting" && (
                          <span className="badge badge-coral-soft" style={{ marginLeft: 6 }}>
                            <Timer size={12} /> Đang thoát
                          </span>
                        )}
                      </>
                    );
                  },
                },
                {
                  key: "lock",
                  header: "Khoá",
                  render: (u) => (
                    <span className="badge badge-plain">
                      {u.lock === "smart" ? <Smartphone size={12} /> : <KeyRound size={12} />} {u.lock === "smart" ? "Điện tử" : "Chìa cơ"}
                    </span>
                  ),
                },
                { key: "landlord", header: "Chủ nhà", render: (u) => landlordById(u.landlordId)?.name },
              ] satisfies DataTableColumn<Unit>[]
            }
            rows={units}
            rowHref={(u) => `/admin/inventory/${u.id}`}
            empty={<span className="muted">Không có căn nào khớp bộ lọc.</span>}
          />
        </>
      )}

      {tab === "requests" && (
        <>
          <div className="card" style={{ marginBottom: "var(--space-3)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <b>Chờ duyệt:</b> {reviewing.length} căn · <b>Đang thẩm định:</b> {inspecting.length} căn
              {overdueCount > 0 && (
                <span className="badge badge-coral-soft" style={{ marginLeft: 8 }}>
                  <Timer size={12} /> {overdueCount} quá hạn
                </span>
              )}
            </div>
            <span className="muted small">Host kiểm tra thực tế trong 48h trước khi Admin chốt.</span>
          </div>

          {state.consignments.length === 0 && <div className={styles.empty}>Chưa có yêu cầu ký gửi.</div>}
          <div className={styles.reqs}>
            {state.consignments.map((c) => {
              const summary = c.report ? inspectionSummary(c.report) : null;
              const host = c.hostId ? hostById(c.hostId) : null;
              return (
                <article key={c.id} className={`card ${styles.req}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <h3>
                        <Link href={`/admin/inventory/${c.id}`} className="link" style={{ textDecoration: "none" }}>
                          {c.building} · Tầng {c.floor} · Căn {c.door}
                        </Link>
                      </h3>
                      <p className="muted small">{landlordById(c.landlordId)?.name}</p>
                    </div>
                    <StatusBadge tone={CONSIGN_STATUS_META[c.status].tone}>{CONSIGN_STATUS_META[c.status].label}</StatusBadge>
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
                      <dt>Host phụ trách</dt>
                      <dd>{host ? host.name : "Chưa gán"}</dd>
                    </div>
                    <div>
                      <dt>Độ mới TB</dt>
                      <dd>{summary ? `${summary.avgCondition}%` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Gửi lúc</dt>
                      <dd>{fmtDate(c.createdAt)}</dd>
                    </div>
                  </dl>
                  {c.note && <p className="small muted">Ghi chú: {c.note}</p>}
                  {c.report && (
                    <p className="small" style={{ marginTop: "var(--space-2)" }}>
                      <b>Đề xuất từ Host:</b>{" "}
                      <span className={c.report.recommendation === "approve" ? "text-ok" : "text-danger"}>
                        {c.report.recommendation === "approve" ? "Đủ điều kiện nhận ký gửi" : "Không khuyến nghị nhận"}
                      </span>
                      {c.report.note ? ` — ${c.report.note}` : ""}
                    </p>
                  )}
                  {c.status === "reviewing" && (
                    <div className={styles.reqActions}>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => {
                          setRejecting(c);
                          setNote("Ảnh hiện trạng hoặc chất lượng chưa đạt yêu cầu");
                          setRejectError("");
                        }}
                      >
                        <X size={16} /> Từ chối
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        style={{ flex: 1 }}
                        onClick={() => {
                          const res = approveConsignment(c.id, DEMO_USERS.admin.name);
                          if (res.ok) {
                            toast("Đã nhận ký gửi. Zalo báo chủ nhà, push báo Host.", "success");
                          } else {
                            toast(`Không thể duyệt: ${res.reason}`);
                          }
                        }}
                      >
                        <Check size={16} /> Duyệt ký gửi
                      </button>
                    </div>
                  )}
                  {(c.status === "awaiting_host" || c.status === "inspecting") && (
                    <div className={styles.reqActions}>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => {
                          setRejecting(c);
                          setNote("Thông tin căn hộ không hợp lệ hoặc chủ nhà yêu cầu huỷ");
                          setRejectError("");
                        }}
                      >
                        <X size={16} /> Từ chối
                      </button>
                      <span className="muted small" style={{ alignSelf: "center", marginLeft: "auto" }}>
                        Chờ Field Host nộp báo cáo
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
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
                      <h3>
                        <Link href={`/admin/inventory/${u.id}`} className="link" style={{ textDecoration: "none" }}>
                          {unitAddress(u)}
                        </Link>
                      </h3>
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
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <Link href={`/admin/contracts/mandate.${u.id}`} className="link small">
                      Xem hợp đồng →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => {
          setRejecting(null);
          setRejectError("");
        }}
        variant="sheet"
        title="Từ chối yêu cầu ký gửi"
        footer={
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (!rejecting) return;
              const res = rejectConsignment(rejecting.id, note, DEMO_USERS.admin.name);
              if (!res.ok) {
                if (res.reason === "invalid_note") {
                  setRejectError("Lý do từ chối phải có ít nhất 5 ký tự.");
                } else {
                  setRejectError(res.reason);
                }
                return;
              }
              setRejecting(null);
              setRejectError("");
              toast("Đã từ chối và báo chủ nhà qua Zalo", "success");
            }}
          >
            Xác nhận không duyệt
          </button>
        }
      >
        <label className="field">
          <span className="label">Lý do (gửi cho chủ nhà)</span>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (rejectError) setRejectError("");
            }}
            placeholder="Nêu rõ lý do từ chối (tối thiểu 5 ký tự)..."
          />
          {rejectError && <span className="field-error">{rejectError}</span>}
        </label>
      </Modal>
    </div>
  );
}
