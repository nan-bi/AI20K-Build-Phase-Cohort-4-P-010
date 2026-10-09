"use client";

import { CrumbLabel } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useAdminContractParty, useAdminContracts, type AdminContract } from "@/lib/admin/api";
import { fmtDate, vnd } from "@/lib/format";
import styles from "./Contracts.module.css";

const STATUS: Record<string, string> = {
  DRAFT: "Bản nháp",
  AWAITING_TENANT_SIGN: "Chờ khách ký",
  AWAITING_LANDLORD_SIGN: "Chờ chủ nhà ký",
  ACTIVE: "Đang hiệu lực",
  TERMINATED_SETTLED: "Đã kết thúc",
  DISPUTED: "Đang tranh chấp",
};

export function AdminContractPartyDetail({ partyKey }: { partyKey: string }) {
  const partyQuery = useAdminContractParty(partyKey);
  const contractQuery = useAdminContracts();
  if (partyQuery.state.status === "loading" || contractQuery.state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (partyQuery.state.status === "error") return <div role="alert"><p>{partyQuery.state.message}</p><Link href="/admin/contracts/parties" className="btn btn-secondary"><ArrowLeft size={16} /> Về danh sách</Link></div>;
  if (contractQuery.state.status === "error") return <div role="alert"><p>{contractQuery.state.message}</p><button className="btn btn-secondary btn-sm" onClick={contractQuery.reload}>Thử lại</button></div>;

  const party = partyQuery.state.data;
  const contracts = contractQuery.state.data.filter((contract) => party.contracts?.includes(contract.id));
  const active = contracts.filter((contract) => contract.status === "ACTIVE").length;
  const roleName = party.role === "landlord" ? "Chủ nhà" : "Khách thuê";
  const columns: DataTableColumn<AdminContract>[] = [
    { key: "contractNumber", header: "Số hợp đồng", render: (row) => <span className={styles.docIdText}>{row.contractNumber}</span> },
    { key: "unitCode", header: "Căn hộ", render: (row) => row.unitCode || "—" },
    { key: "term", header: "Thời hạn", render: (row) => `${fmtDate(row.startDate)} → ${fmtDate(row.endDate)}` },
    { key: "rent", header: "Tiền thuê/tháng", align: "right", render: (row) => `${vnd(Number(row.monthlyRentPrice))}đ` },
    { key: "status", header: "Trạng thái", render: (row) => STATUS[row.status] || row.status },
  ];

  return <div className={styles.page}>
      <CrumbLabel label={party.name} />
    <PageHeader title={party.name || "Bên ký kết"} description={`${roleName} · thông tin liên hệ và hợp đồng gắn với hồ sơ thực tế.`} actions={<Link href="/admin/contracts/parties" className="btn btn-secondary"><ArrowLeft size={16} /> Về danh sách</Link>} />
    <ContractsSubnav />
    <div className={styles.kpis}>
      <StatTile label="Tổng hợp đồng" value={String(contracts.length)} />
      <StatTile label="Đang hiệu lực" value={String(active)} />
      <StatTile label="Email" value={party.email || "—"} />
      <StatTile label="Điện thoại" value={party.phone || "—"} />
    </div>
    <Section title="Hợp đồng của bên ký này" flush>
      <DataTable<AdminContract> columns={columns} rows={contracts} rowHref={(row) => `/admin/contracts/${encodeURIComponent(row.id)}`} empty="Không còn hợp đồng nào được liên kết với hồ sơ này." />
    </Section>
  </div>;
}
