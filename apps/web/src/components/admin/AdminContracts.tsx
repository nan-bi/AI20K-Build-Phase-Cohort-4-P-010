"use client";

import { useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { StatTile } from "@/components/charts/StatTile";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META } from "@/components/contracts/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useContractRegistry, type RegistryKind, type RegistryRow } from "@/lib/admin/api";
import { fmtDate, vnd, vndShort } from "@/lib/format";
import styles from "./Contracts.module.css";

type Tab = "all" | RegistryKind;
const KINDS: RegistryKind[] = ["mandate", "holding", "lease", "partnership"];

const isKind = (v: string | undefined): v is RegistryKind => !!v && (KINDS as string[]).includes(v);

export function AdminContracts({ initialKind }: { initialKind?: string }) {
  const query = useContractRegistry();
  const [tab, setTab] = useState<Tab>(isKind(initialKind) ? initialKind : "all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyAction, setOnlyAction] = useState(false);

  const rows = useMemo(() => (query.state.status === "ready" ? query.state.data : []), [query.state]);
  const tabRows = tab === "all" ? rows : rows.filter((r) => r.kind === tab);
  const statuses = [...new Map(tabRows.map((r) => [r.status, r.statusLabel])).entries()];
  const filtered = tabRows.filter((r) => {
    if (onlyAction && !r.needsAction) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || [r.docNumber, r.unitCode ?? "", r.scope, ...r.parties.map((p) => p.name)].some((v) => v.toLowerCase().includes(q));
  });

  const needsAction = rows.filter((r) => r.needsAction).length;
  const activeLeases = rows.filter((r) => r.kind === "lease" && r.status === "ACTIVE");
  const holding = rows.filter((r) => r.kind === "holding" && r.status === "PAID_HOLDING");
  const activeMandates = rows.filter((r) => r.kind === "mandate" && (r.status === "ACTIVE" || r.status === "EXIT_REQUESTED")).length;

  const columns: DataTableColumn<RegistryRow>[] = [
    {
      key: "doc",
      header: "Số văn bản",
      render: (r) => (
        <span className={styles.nowrap}>
          {r.needsAction && <span className={styles.warningDot} title={r.needsAction} />}
          <span className={styles.docIdText}>{r.docNumber}</span>
        </span>
      ),
    },
    { key: "kind", header: "Loại", render: (r) => CONTRACT_KIND_META[r.kind].short },
    { key: "scope", header: "Căn / Phạm vi", render: (r) => r.scope },
    {
      key: "parties",
      header: "Các bên",
      render: (r) => r.parties.filter((p) => p.role !== "platform").map((p) => p.name).join(" · ") || "—",
    },
    {
      key: "validity",
      header: "Hiệu lực",
      render: (r) =>
        r.startAt || r.endAt ? (
          <span className={styles.nowrap}>
            {r.startAt ? fmtDate(r.startAt) : "—"}
            {r.endAt ? ` → ${fmtDate(r.endAt)}` : ""}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { key: "amount", header: "Giá trị", align: "right", render: (r) => (r.amount === null ? <span className="muted">—</span> : `${vnd(r.amount)}đ`) },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => (
        <>
          <StatusBadge tone={r.tone}>{r.statusLabel}</StatusBadge>
          {r.needsAction && (
            <span className="xs" style={{ display: "block", marginTop: 4, color: "var(--danger)" }}>
              {r.needsAction}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sổ hợp đồng"
        description="Bốn loại văn bản của nền tảng: ký gửi độc quyền, cọc giữ chỗ, hợp đồng thuê và hợp tác Field Host — đọc trực tiếp từ hệ thống."
        actions={
          <button type="button" className="btn btn-quiet btn-sm" onClick={query.reload}>
            <RefreshCw size={15} /> Cập nhật
          </button>
        }
      />
      <ContractsSubnav />

      {query.state.status === "loading" ? (
        <div className="skeleton" style={{ height: 480 }} />
      ) : query.state.status === "error" ? (
        <div role="alert" className="card">
          <p>{query.state.message}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={query.reload}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className={styles.kpis}>
            <StatTile label="Cần xử lý" value={String(needsAction)} delta={{ text: "đánh dấu chấm đỏ trong sổ", tone: needsAction > 0 ? "bad" : "good" }} />
            <StatTile label="Ký gửi đang hiệu lực" value={String(activeMandates)} />
            <StatTile label="Cọc đang giữ căn" value={String(holding.length)} delta={{ text: `${vndShort(holding.reduce((s, r) => s + (r.amount ?? 0), 0))}đ`, tone: "flat" }} />
            <StatTile label="HĐ thuê hiệu lực" value={String(activeLeases.length)} delta={{ text: `${vndShort(activeLeases.reduce((s, r) => s + (r.amount ?? 0), 0))}đ/tháng`, tone: "flat" }} />
          </div>

          <div className={styles.tabs} role="tablist">
            {(["all", ...KINDS] as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className={`${styles.tabBtn} ${tab === k ? styles.tabActive : ""}`}
                onClick={() => {
                  setTab(k);
                  setStatusFilter("all");
                }}
              >
                {k === "all" ? "Tất cả" : CONTRACT_KIND_META[k].short}
                <span className={styles.tabCount}>{k === "all" ? rows.length : rows.filter((r) => r.kind === k).length}</span>
              </button>
            ))}
          </div>

          <div className={styles.tools}>
            <input
              type="search"
              className={`input ${styles.search}`}
              placeholder="Tìm số văn bản, căn hộ hoặc tên các bên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm hợp đồng"
            />
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Lọc theo trạng thái">
              <option value="all">Mọi trạng thái</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" className={`${styles.chipBtn} ${onlyAction ? styles.chipActive : ""}`} onClick={() => setOnlyAction(!onlyAction)} aria-pressed={onlyAction}>
              <AlertCircle size={14} /> Chỉ cần xử lý ({tabRows.filter((r) => r.needsAction).length})
            </button>
            <span className="muted small">{filtered.length} văn bản</span>
          </div>

          <section className="card" style={{ overflow: "hidden" }}>
            <DataTable<RegistryRow>
              columns={columns}
              rows={filtered}
              rowHref={(r) => `/admin/contracts/${encodeURIComponent(r.key)}`}
              empty={<span className="muted">Không có văn bản nào khớp bộ lọc.</span>}
            />
          </section>
          {tab === "partnership" && (
            <p className="muted xs">Đối tác Host chưa có số hợp đồng riêng trong hệ thống; cột “Số văn bản” hiển thị mã hồ sơ Host.</p>
          )}
        </>
      )}
    </div>
  );
}
