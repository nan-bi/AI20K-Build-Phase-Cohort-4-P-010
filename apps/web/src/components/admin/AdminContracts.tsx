"use client";

import { useMemo, useState } from "react";
import { StatTile } from "@/components/charts/StatTile";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminContracts } from "@/lib/admin/api";
import type { AdminContract } from "@/lib/admin/api";
import { fmtDate, vnd, vndShort } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  AWAITING_TENANT_SIGN: { label: "Chờ khách ký", tone: "warn" },
  AWAITING_LANDLORD_SIGN: { label: "Chờ chủ nhà ký", tone: "warn" },
  ACTIVE: { label: "Đang hiệu lực", tone: "ok" },
  TERMINATED_SETTLED: { label: "Đã kết thúc", tone: "neutral" },
  DISPUTED: { label: "Đang tranh chấp", tone: "danger" },
};

type Filter = "all" | string;

export function AdminContracts() {
  const query = useAdminContracts();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => query.state.status === "ready" ? query.state.data : [], [query.state]);
  const statuses = [...new Set(rows.map((row) => row.status))];
  const filtered = useMemo(() => rows.filter((row) => {
    if (filter !== "all" && row.status !== filter) return false;
    const needle = search.trim().toLowerCase();
    return !needle || [row.contractNumber, row.unitCode, row.tenantName, row.landlordName].some((value) => value?.toLowerCase().includes(needle));
  }), [rows, filter, search]);
  const active = rows.filter((row) => row.status === "ACTIVE");
  const expiring = active.filter((row) => {
    const remaining = Date.parse(row.endDate) - now;
    return remaining >= 0 && remaining <= 30 * 86_400_000;
  });
  const deposits = active.reduce((sum, row) => sum + Number(row.securityDepositAmount || 0), 0);
  const needsSignature = rows.filter((row) => ["AWAITING_TENANT_SIGN", "AWAITING_LANDLORD_SIGN"].includes(row.status)).length;

  const columns: DataTableColumn<AdminContract>[] = [
    { key: "contractNumber", header: "Số hợp đồng", render: (row) => <span className={styles.docIdText}>{row.contractNumber}</span> },
    { key: "unitCode", header: "Căn hộ", render: (row) => row.unitCode || "—" },
    { key: "parties", header: "Các bên", render: (row) => <span>{row.landlordName || "—"} · {row.tenantName || "—"}</span> },
    { key: "term", header: "Thời hạn", render: (row) => <span className={styles.nowrap}>{fmtDate(row.startDate)} → {fmtDate(row.endDate)}</span> },
    { key: "rent", header: "Tiền thuê/tháng", align: "right", render: (row) => `${vnd(Number(row.monthlyRentPrice))}đ` },
    { key: "status", header: "Trạng thái", render: (row) => <StatusBadge tone={STATUS[row.status]?.tone ?? "neutral"}>{STATUS[row.status]?.label ?? row.status}</StatusBadge> },
  ];

  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 480 }} />;
  if (query.state.status === "error") return <div role="alert"><p>{query.state.message}</p><button className="btn btn-secondary btn-sm" onClick={query.reload}>Thử lại</button></div>;

  return <div className={styles.page}>
    <PageHeader title="Hợp đồng thuê" description="Danh sách hợp đồng thuê lưu trong cơ sở dữ liệu." />
    <ContractsSubnav />
    <div className={styles.kpis}>
      <StatTile label="Đang hiệu lực" value={String(active.length)} />
      <StatTile label="Sắp hết hạn ≤ 30 ngày" value={String(expiring.length)} />
      <StatTile label="Tiền cọc hợp đồng hiệu lực" value={`${vndShort(deposits)}đ`} />
      <StatTile label="Đang chờ chữ ký" value={String(needsSignature)} />
    </div>
    <div className={styles.tabs} role="tablist">
      <button type="button" role="tab" aria-selected={filter === "all"} className={`${styles.tabBtn} ${filter === "all" ? styles.tabActive : ""}`} onClick={() => setFilter("all")}>Tất cả <span className={styles.tabCount}>{rows.length}</span></button>
      {statuses.map((status) => <button key={status} type="button" role="tab" aria-selected={filter === status} className={`${styles.tabBtn} ${filter === status ? styles.tabActive : ""}`} onClick={() => setFilter(status)}>{STATUS[status]?.label ?? status} <span className={styles.tabCount}>{rows.filter((row) => row.status === status).length}</span></button>)}
    </div>
    <div className={styles.tools}>
      <input type="search" className="input" placeholder="Tìm số hợp đồng, căn hộ hoặc tên các bên…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Tìm hợp đồng" />
    </div>
    <DataTable<AdminContract> columns={columns} rows={filtered} rowHref={(row) => `/admin/contracts/${encodeURIComponent(row.id)}`} empty={<span className="muted">Không có hợp đồng phù hợp trong dữ liệu Supabase.</span>} />
    {query.state.refreshing && <p className="muted xs">Đang đồng bộ dữ liệu…</p>}
  </div>;
}
