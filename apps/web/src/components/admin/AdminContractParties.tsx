"use client";

import { useMemo, useState } from "react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminContractParties, type AdminContractParty } from "@/lib/admin/api";
import { maskPhone } from "@/lib/format";
import styles from "./Contracts.module.css";

type PartyRole = "tenant" | "landlord";

export function AdminContractParties({ initialRole }: { initialRole?: string }) {
  const query = useAdminContractParties();
  const [role, setRole] = useState<PartyRole>(initialRole === "tenant" ? "tenant" : "landlord");
  const [search, setSearch] = useState("");
  const parties = useMemo(() => query.state.status === "ready" ? query.state.data : [], [query.state]);
  const counts = { landlord: parties.filter((party) => party.role === "landlord").length, tenant: parties.filter((party) => party.role === "tenant").length };
  const visible = useMemo(() => parties.filter((party) => {
    if (party.role !== role) return false;
    const value = search.trim().toLowerCase();
    return !value || [party.name, party.email].some((field) => field?.toLowerCase().includes(value));
  }), [parties, role, search]);
  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 380 }} />;
  if (query.state.status === "error") return <div role="alert"><p>{query.state.message}</p><button className="btn btn-secondary btn-sm" onClick={query.reload}>Thử lại</button></div>;

  const columns: DataTableColumn<AdminContractParty>[] = [
    { key: "name", header: "Họ và tên", render: (party) => <span className={styles.docIdText}>{party.name || "—"}</span> },
    { key: "email", header: "Email", render: (party) => party.email || "—" },
    { key: "phone", header: "Số điện thoại", render: (party) => <span className="muted fontMono small">{party.phone ? maskPhone(party.phone) : "—"}</span> },
    { key: "total", header: "Hợp đồng", align: "right", render: (party) => <b>{party.contracts?.length ?? 0}</b> },
    { key: "active", header: "Đang hiệu lực", align: "right", render: (party) => party.activeContracts ?? 0 },
    { key: "signature", header: "Chờ chữ ký", align: "right", render: (party) => party.needsSignature ? <StatusBadge tone="warn">{party.needsSignature}</StatusBadge> : <span className="muted">0</span> },
  ];

  return <div className={styles.page}>
    <PageHeader title="Theo bên ký" description="Danh sách khách thuê và chủ nhà có hợp đồng thực tế trong hệ thống." />
    <ContractsSubnav />
    <Section>
      <div className={styles.tabs} style={{ marginBottom: 14 }}>
        <button type="button" className={`${styles.tabBtn} ${role === "landlord" ? styles.tabActive : ""}`} onClick={() => setRole("landlord")}>Chủ nhà <span className={styles.tabCount}>{counts.landlord}</span></button>
        <button type="button" className={`${styles.tabBtn} ${role === "tenant" ? styles.tabActive : ""}`} onClick={() => setRole("tenant")}>Khách thuê <span className={styles.tabCount}>{counts.tenant}</span></button>
      </div>
      <input type="search" className="input" placeholder="Tìm theo tên hoặc email…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Tìm bên ký" style={{ marginBottom: 14 }} />
      <DataTable<AdminContractParty> columns={columns} rows={visible} rowHref={(party) => `/admin/contracts/parties/${encodeURIComponent(party.id)}`} empty={<span className="muted">Chưa có bên ký nào trong hợp đồng thật.</span>} />
    </Section>
  </div>;
}
