"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KeyRound, RefreshCw, Smartphone, Timer } from "lucide-react";
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

const unitStatusLabel: Record<string, string> = {
  AVAILABLE: "Còn trống",
  HOLDING: "Đang giữ căn",
  RENTED: "Đã cho thuê",
  UNLISTED: "Chưa niêm yết",
  MAINTENANCE: "Bảo trì",
};

const mandateStatusLabel: Record<string, string> = {
  NONE: "Chưa có uỷ quyền",
  PENDING_INSPECTION: "Chờ thẩm định",
  ACTIVE: "Đang uỷ quyền",
  EXIT_REQUESTED: "Đang thoát uỷ quyền",
  TERMINATED: "Đã kết thúc",
  EXPIRED: "Hết hạn",
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
      render: (row) => <><b>{row.unitCode}</b><span className="muted xs" style={{ display: "block" }}>{row.building} · tầng {row.floorNumber} · căn {row.doorNumber || "—"}</span></>,
    },
    { key: "zone", header: "Phân khu", render: (row) => row.zone },
    { key: "layout", header: "Loại · diện tích", render: (row) => `${row.layout} · ${row.carpetAreaM2} m²` },
    { key: "rent", header: "Giá thuê", align: "right", render: (row) => `${money(row.baseRentPrice)}đ` },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => <><span className="badge badge-plain">{unitStatusLabel[row.status] || row.status}</span><span className="muted xs" style={{ display: "block", marginTop: 4 }}>{mandateStatusLabel[row.mandateStatus] || row.mandateStatus}</span></>,
    },
    {
      key: "lock",
      header: "Khoá",
      render: (row) => <span className="badge badge-plain">{row.doorLockType === "ELECTRONIC_PIN" ? <Smartphone size={12} /> : <KeyRound size={12} />} {row.doorLockType === "ELECTRONIC_PIN" ? "Điện tử" : "Chìa cơ"}</span>,
    },
    { key: "landlord", header: "Chủ nhà", render: (row) => row.landlordName || "—" },
  ];

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
              <div className={styles.tools}>
                <select className="select" value={zone} onChange={(event) => setZone(event.target.value)} aria-label="Lọc theo phân khu">
                  <option value="all">Mọi phân khu</option>{zones.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc theo trạng thái căn">
                  <option value="all">Mọi trạng thái</option>{Object.entries(unitStatusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select className="select" value={lock} onChange={(event) => setLock(event.target.value as LockFilter)} aria-label="Lọc theo loại khoá">
                  <option value="all">Mọi loại khoá</option><option value="ELECTRONIC_PIN">Khoá điện tử</option><option value="PHYSICAL_KEY">Chìa cơ</option>
                </select>
                <span className="muted small">{filtered.length} căn</span>
              </div>
              <DataTable<InventoryRow> columns={columns} rows={filtered} rowHref={(row) => `/admin/inventory/${row.id}`} empty={<span className="muted">Không có căn nào trong dữ liệu hiện tại.</span>} />
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
