"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { StatTile } from "@/components/charts/StatTile";
import { CONTRACT_KIND_META, CONTRACT_STATUS_META } from "@/components/contracts/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtDate, vnd, vndShort } from "@/lib/mock/format";
import { contractKpis, contractRows, type ContractKind, type ContractRow, type ContractStatus } from "@/lib/mock/contracts";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

type TabKind = "all" | ContractKind;

interface AdminContractsProps {
  initialKind?: string;
}

export function AdminContracts({ initialKind }: AdminContractsProps) {
  const state = useMock();
  const now = useNow(1000);

  const defaultTab: TabKind =
    initialKind === "mandate" || initialKind === "holding" || initialKind === "lease" || initialKind === "partnership"
      ? initialKind
      : "all";
  const [tab, setTab] = useState<TabKind>(defaultTab);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);

  const allRows = useMemo(() => {
    if (!state.ready || !now) return [];
    return contractRows(state, now);
  }, [state, now]);

  const kpis = useMemo(() => contractKpis(allRows), [allRows]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: allRows.length,
      mandate: allRows.filter((r) => r.kind === "mandate").length,
      holding: allRows.filter((r) => r.kind === "holding").length,
      lease: allRows.filter((r) => r.kind === "lease").length,
      partnership: allRows.filter((r) => r.kind === "partnership").length,
    };
  }, [allRows]);

  // Rows in current tab
  const tabRows = useMemo(() => {
    if (tab === "all") return allRows;
    return allRows.filter((r) => r.kind === tab);
  }, [allRows, tab]);

  // Statuses available in current tab
  const availableStatuses = useMemo(() => {
    const set = new Set<ContractStatus>();
    for (const r of tabRows) {
      set.add(r.status);
    }
    return Array.from(set);
  }, [tabRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let rows = tabRows;

    if (onlyNeedsAction) {
      rows = rows.filter((r) => r.needsAction);
    }

    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const docMatch = r.docId.toLowerCase().includes(q);
        const unitMatch = r.unitLabel.toLowerCase().includes(q);
        const partyMatch = r.parties.some((p) => p.name.toLowerCase().includes(q));
        return docMatch || unitMatch || partyMatch;
      });
    }

    return rows;
  }, [tabRows, onlyNeedsAction, statusFilter, search]);

  if (!state.ready || !now) {
    return <div className="skeleton" style={{ height: 480 }} />;
  }

  const columns: DataTableColumn<ContractRow>[] = [
    {
      key: "docId",
      header: "Số hợp đồng",
      render: (r) => (
        <span className={styles.nowrap}>
          {r.needsAction && <span className={styles.warningDot} title="Cần xử lý" />}
          <span className={styles.docIdText}>{r.docId}</span>
        </span>
      ),
    },
    {
      key: "kind",
      header: "Loại",
      render: (r) => CONTRACT_KIND_META[r.kind].short,
    },
    {
      key: "unitLabel",
      header: "Căn / Phạm vi",
      render: (r) => r.unitLabel,
    },
    {
      key: "parties",
      header: "Các bên",
      render: (r) => (
        <span>{r.parties.map((p) => p.name).join(" · ")}</span>
      ),
    },
    {
      key: "validity",
      header: "Hiệu lực",
      render: (r) => {
        const start = r.startAt ?? r.signedAt;
        const startStr = start ? fmtDate(start) : "";
        const endStr = r.endAt ? fmtDate(r.endAt) : "";
        if (!startStr && !endStr) return <span className="muted">—</span>;
        return (
          <span className={styles.nowrap}>
            {startStr || "—"} {endStr ? `→ ${endStr}` : ""}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Giá trị",
      align: "right",
      render: (r) => {
        if (!r.amount) return <span className="muted">—</span>;
        return <span className={styles.nowrap}>{vnd(r.amount)}đ</span>;
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => {
        const meta = CONTRACT_STATUS_META[r.status];
        const label = r.kind === "holding" && r.status === "void" ? "Đã huỷ cọc" : meta.label;
        return <StatusBadge tone={meta.tone}>{label}</StatusBadge>;
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Hợp đồng"
        description="Sổ hợp đồng uỷ quyền, cọc giữ chỗ và thuê căn hộ trên nền tảng."
      />

      <ContractsSubnav />

      <div className={styles.kpis}>
        <StatTile
          label="HĐ thuê hiệu lực"
          value={String(kpis.activeLeases)}
        />
        <StatTile
          label="Sắp hết hạn ≤ 30 ngày"
          value={String(kpis.expiringLeases)}
        />
        <StatTile
          label="Tiền cọc đang giữ"
          value={`${vndShort(kpis.heldDeposits)}đ`}
        />
        <StatTile
          label="Uỷ quyền đang thoát"
          value={String(kpis.exitingMandates)}
        />
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={`${styles.tabBtn} ${tab === "all" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("all");
            setStatusFilter("all");
          }}
        >
          Tất cả <span className={styles.tabCount}>{tabCounts.all}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mandate"}
          className={`${styles.tabBtn} ${tab === "mandate" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("mandate");
            setStatusFilter("all");
          }}
        >
          Uỷ quyền <span className={styles.tabCount}>{tabCounts.mandate}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "holding"}
          className={`${styles.tabBtn} ${tab === "holding" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("holding");
            setStatusFilter("all");
          }}
        >
          Cọc giữ chỗ <span className={styles.tabCount}>{tabCounts.holding}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "lease"}
          className={`${styles.tabBtn} ${tab === "lease" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("lease");
            setStatusFilter("all");
          }}
        >
          HĐ thuê <span className={styles.tabCount}>{tabCounts.lease}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "partnership"}
          className={`${styles.tabBtn} ${tab === "partnership" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("partnership");
            setStatusFilter("all");
          }}
        >
          Đối tác Host <span className={styles.tabCount}>{tabCounts.partnership}</span>
        </button>
      </div>

      <div className={styles.tools}>
        <div className={styles.search}>
          <input
            type="search"
            className="input"
            placeholder="Tìm theo số HĐ, căn hộ, tên các bên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm hợp đồng"
          />
        </div>

        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc trạng thái"
        >
          <option value="all">Mọi trạng thái ({tabRows.length})</option>
          {availableStatuses.map((st) => (
            <option key={st} value={st}>
              {CONTRACT_STATUS_META[st].label} ({tabRows.filter((r) => r.status === st).length})
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`${styles.chipBtn} ${onlyNeedsAction ? styles.chipActive : ""}`}
          onClick={() => setOnlyNeedsAction((v) => !v)}
          aria-pressed={onlyNeedsAction}
        >
          <AlertCircle size={14} />
          Cần xử lý ({kpis.needsAction})
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        rowHref={(r) => `/admin/contracts/${r.key}`}
        empty="Không có hợp đồng khớp bộ lọc."
      />
    </div>
  );
}
