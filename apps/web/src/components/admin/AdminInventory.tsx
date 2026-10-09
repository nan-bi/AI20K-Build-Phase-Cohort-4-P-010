"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, KeyRound, RefreshCw, Smartphone, Timer } from "lucide-react";
import { allInCost } from "@/lib/pricing/cost";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/query/useApiQuery";
import styles from "./Admin.module.css";

type Tab = "units" | "requests" | "exit";
type LockFilter = "all" | "ELECTRONIC_PIN" | "PHYSICAL_KEY";
const EMPTY_INVENTORY: InventoryRow[] = [];

interface InventoryRow {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  layout: string;
  carpetAreaM2: number;
  baseRentPrice: number;
  status: string;
  landlordName: string | null;
  floorNumber: number;
  doorNumber: string | null;
  doorLockType: LockFilter extends infer T ? Exclude<T, "all"> : never;
  isVerified: boolean;
  managementFee: number;
  createdAt: string;
  mandateStatus: string;
  exitCountdownDays: number | null;
  mandateId: string | null;
  exitRequestedAt: string | null;
  exitEffectiveAt: string | null;
  canTerminate: boolean;
  terminateBlockedReason: string | null;
}

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "—";

const UNIT_STATUS: Record<string, { label: string; badge: string }> = {
  AVAILABLE: { label: "Còn trống", badge: "badge-kelp" },
  HOLDING: { label: "Đang giữ căn", badge: "badge-amber-soft" },
  RENTED: { label: "Đã cho thuê", badge: "badge-ink" },
  UNLISTED: { label: "Chưa niêm yết", badge: "badge-plain" },
  MAINTENANCE: { label: "Bảo trì", badge: "badge-coral-soft" },
};

const LAYOUT_LABEL: Record<string, string> = {
  STUDIO: "Studio",
  ONE_BED_PLUS: "1PN+",
  TWO_BED_ONE_BATH: "2PN 1WC",
  TWO_BED_TWO_BATH: "2PN 2WC",
  THREE_BED: "3PN",
};

export function AdminInventory({ initialTab }: { initialTab: Tab }) {
  const inventory = useApiQuery({ key: "admin-exclusive-inventory", fetch: () => api.get<InventoryRow[]>("/admin/exclusive-inventory") });
  const [tab, setTab] = useState<Tab>(initialTab);
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState("all");
  const [lock, setLock] = useState<LockFilter>("all");
  const rows = inventory.state.status === "ready" ? inventory.state.data : EMPTY_INVENTORY;
  const loading = inventory.state.status === "loading";
  const error = inventory.state.status === "error" ? inventory.state.message : null;
  const refreshing = inventory.state.status === "ready" && inventory.state.refreshing;

  function refresh() {
    inventory.reload();
  }

  const zones = useMemo(() => [...new Set(rows.map((row) => row.zone))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) =>
    (zone === "all" || row.zone === zone) &&
    (status === "all" || row.status === status) &&
    (lock === "all" || row.doorLockType === lock),
  ), [rows, zone, status, lock]);
  const requests = rows.filter((row) => row.mandateStatus === "PENDING_INSPECTION");
  const exiting = rows.filter((row) => row.mandateStatus === "EXIT_REQUESTED");

  async function terminate(row: InventoryRow) {
    if (!row.mandateId || !row.canTerminate) return;
    const reason = window.prompt(`Lý do hoàn tất thoát uỷ quyền cho ${row.unitCode}:`);
    if (!reason?.trim()) return;
    const response = await api.post(`/admin/mandates/${encodeURIComponent(row.mandateId)}/terminate`, { reason: reason.trim() });
    if (!response.ok) {
      toast(response.message || "Không thể hoàn tất thoát uỷ quyền.");
      return;
    }
    toast(`Đã cập nhật hồ sơ ${row.unitCode} từ dữ liệu máy chủ.`, "success");
    refresh();
  }

  const columns: DataTableColumn<InventoryRow>[] = [
    {
      key: "unit",
      header: "Căn hộ",
      render: (row) => (
        <>
          <b>{row.building} · Tầng {row.floorNumber} · Căn {row.doorNumber || "—"}</b>
          <span className="muted xs" style={{ display: "block" }}>
            {row.unitCode}
            {row.isVerified && <> · <BadgeCheck size={11} style={{ verticalAlign: -1 }} /> Đã thẩm định</>}
          </span>
        </>
      ),
    },
    {
      key: "zone",
      header: "Phân khu · Chủ nhà",
      render: (row) => (
        <>
          {row.zone}
          <span className="muted xs" style={{ display: "block" }}>{row.landlordName || "Chưa có tên chủ nhà"}</span>
        </>
      ),
    },
    { key: "layout", header: "Loại", render: (row) => `${LAYOUT_LABEL[row.layout] ?? row.layout} · ${row.carpetAreaM2} m²` },
    { key: "rent", header: "Giá thuê", align: "right", render: (row) => `${money(row.baseRentPrice)}đ` },
    {
      key: "allin",
      header: "All-in/tháng",
      align: "right",
      render: (row) => (
        <span title="Thuê + phí quản lý + gửi 1 xe máy + điện nước 1 người">
          {money(allInCost({ rent: row.baseRentPrice, areaM2: row.carpetAreaM2, managementFee: row.managementFee || undefined }).total)}đ
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => {
        const s = UNIT_STATUS[row.status] ?? { label: row.status, badge: "badge-plain" };
        return (
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`badge ${s.badge}`}>{s.label}</span>
            {row.mandateStatus === "EXIT_REQUESTED" && (
              <span className="badge badge-coral-soft">
                <Timer size={12} /> Đang thoát{row.exitCountdownDays !== null ? ` · ${row.exitCountdownDays}d` : ""}
              </span>
            )}
            {row.mandateStatus === "PENDING_INSPECTION" && <span className="badge badge-amber-soft">Chờ thẩm định</span>}
          </span>
        );
      },
    },
    {
      key: "lock",
      header: "Khoá",
      render: (row) => <span className="badge badge-plain">{row.doorLockType === "ELECTRONIC_PIN" ? <Smartphone size={12} /> : <KeyRound size={12} />} {row.doorLockType === "ELECTRONIC_PIN" ? "Điện tử" : "Chìa cơ"}</span>,
    },
  ];

  const statusCount = (s: string) => rows.filter((row) => row.status === s).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Căn hộ và ký gửi"
        description="Rổ hàng, tình trạng căn và uỷ quyền được tải trực tiếp từ Supabase qua backend."
        actions={<button type="button" className="btn btn-quiet btn-sm" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={15} /> Cập nhật</button>}
      />

      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "units"} onClick={() => setTab("units")}>Rổ hàng ({rows.length})</button>
        <button type="button" role="tab" aria-selected={tab === "requests"} onClick={() => setTab("requests")}>Chờ thẩm định ({requests.length})</button>
        <button type="button" role="tab" aria-selected={tab === "exit"} onClick={() => setTab("exit")}>Thoát uỷ quyền ({exiting.length})</button>
      </div>

      {error && <div role="alert" className="card"><b>Không tải được rổ hàng</b><p className="small muted">{error}</p><button type="button" className="btn btn-quiet btn-sm" onClick={() => void refresh()}>Thử lại</button></div>}
      {loading ? <div className="skeleton" style={{ height: 360 }} /> : !error && (
        <>
          {tab === "units" && (
            <>
              <div className={styles.pills} role="tablist" aria-label="Lọc nhanh theo trạng thái căn">
                <button type="button" role="tab" aria-selected={status === "all"} className={`${styles.pill} ${status === "all" ? styles.pillActive : ""}`} onClick={() => setStatus("all")}>
                  Tất cả ({rows.length})
                </button>
                {Object.entries(UNIT_STATUS).filter(([key]) => statusCount(key) > 0).map(([key, s]) => (
                  <button key={key} type="button" role="tab" aria-selected={status === key} className={`${styles.pill} ${status === key ? styles.pillActive : ""}`} onClick={() => setStatus(key)}>
                    {s.label} ({statusCount(key)})
                  </button>
                ))}
              </div>
              <div className={styles.tools}>
                <select className="select" value={zone} onChange={(event) => setZone(event.target.value)} aria-label="Lọc theo phân khu">
                  <option value="all">Mọi phân khu</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc theo trạng thái căn">
                  <option value="all">Mọi trạng thái</option>{Object.entries(UNIT_STATUS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                </select>
                <select className="select" value={lock} onChange={(event) => setLock(event.target.value as LockFilter)} aria-label="Lọc theo loại khoá">
                  <option value="all">Mọi loại khoá</option><option value="ELECTRONIC_PIN">Khoá điện tử</option><option value="PHYSICAL_KEY">Chìa cơ</option>
                </select>
                <span className="muted small">{filtered.length} căn</span>
              </div>
              <section className={`card ${styles.tableCard}`}>
                <DataTable<InventoryRow> columns={columns} rows={filtered} rowHref={(row) => `/admin/inventory/${row.id}`} empty={<span className="muted">Không có căn nào khớp bộ lọc.</span>} />
              </section>
              <p className="muted xs">All-in/tháng = giá thuê + phí quản lý + gửi 1 xe máy + điện nước ước tính 1 người. Bấm vào một hàng để mở hồ sơ căn.</p>
            </>
          )}

          {tab === "requests" && (
            requests.length ? <div className={styles.reqs}>{requests.map((row) => (
              <article key={row.id} className={`card ${styles.req}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div><h3><Link href={`/admin/inventory/${row.id}`} className="link">{row.unitCode}</Link></h3><p className="muted small">{row.zone} · {row.landlordName || "Chưa có tên chủ nhà"}</p></div>
                  <span className="badge badge-amber-soft"><Timer size={12} /> Chờ thẩm định</span>
                </div>
                <p className="small muted">Giá thuê {money(row.baseRentPrice)}đ · {row.carpetAreaM2} m² · tạo {date(row.createdAt)}</p>
              </article>
            ))}</div> : <div className={styles.empty}>Không có uỷ quyền nào đang chờ thẩm định trong Supabase.</div>
          )}

          {tab === "exit" && (
            exiting.length ? <div className={styles.reqs}>{exiting.map((row) => (
              <article key={row.id} className={`card ${styles.req}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div><h3><Link href={`/admin/inventory/${row.id}`} className="link">{row.unitCode}</Link></h3><p className="muted small">{row.zone} · {row.landlordName || "Chưa có tên chủ nhà"}</p></div>
                  <span className="badge badge-coral-soft"><Timer size={12} /> {row.exitCountdownDays === null ? "Chưa có hạn" : row.exitCountdownDays === 0 ? "Đã đủ hạn" : `Còn ${row.exitCountdownDays} ngày`}</span>
                </div>
                <p className="small muted">Yêu cầu {date(row.exitRequestedAt)} · hiệu lực {date(row.exitEffectiveAt)}</p>
                {row.terminateBlockedReason && <p className="small muted">Chưa thể kết thúc: {row.terminateBlockedReason}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn btn-quiet btn-sm" disabled={!row.canTerminate || !row.mandateId} onClick={() => void terminate(row)}>Hoàn tất thoát</button></div>
              </article>
            ))}</div> : <div className={styles.empty}>Không có yêu cầu thoát uỷ quyền trong dữ liệu hiện tại.</div>
          )}
        </>
      )}
    </div>
  );
}
