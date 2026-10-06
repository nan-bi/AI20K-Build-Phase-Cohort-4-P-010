"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAdminContract } from "@/lib/admin/api";
import { fmtDate, fmtDateTime, vnd } from "@/lib/format";
import styles from "./Contracts.module.css";

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  AWAITING_TENANT_SIGN: { label: "Chờ khách ký", tone: "warn" },
  AWAITING_LANDLORD_SIGN: { label: "Chờ chủ nhà ký", tone: "warn" },
  ACTIVE: { label: "Đang hiệu lực", tone: "ok" },
  TERMINATED_SETTLED: { label: "Đã kết thúc", tone: "neutral" },
  DISPUTED: { label: "Đang tranh chấp", tone: "danger" },
};

export function AdminContractDetail({ contractKey }: { contractKey: string }) {
  const query = useAdminContract(contractKey);
  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (query.state.status === "error") return <div className={styles.page}>
    <PageHeader title="Không tải được hợp đồng" description={query.state.message} actions={<Link href="/admin/contracts" className="btn btn-secondary"><ArrowLeft size={16} /> Về sổ hợp đồng</Link>} />
    <button type="button" className="btn btn-quiet" onClick={query.reload}>Thử lại</button>
  </div>;

  const contract = query.state.data;
  const meta = STATUS[contract.status] ?? { label: contract.status, tone: "neutral" as const };
  return <div className={styles.page}>
    <PageHeader title={contract.contractNumber} description={`Hợp đồng thuê căn ${contract.unitCode}. Dữ liệu lấy từ bản ghi hợp đồng hiện hành.`} actions={<Link href="/admin/contracts" className="btn btn-secondary"><ArrowLeft size={16} /> Về sổ hợp đồng</Link>} />
    <ContractsSubnav />
    <div style={{ marginBottom: 16 }}><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></div>
    <Section title="Thông tin hợp đồng">
      <KeyValue items={[
        { label: "Số hợp đồng", value: contract.contractNumber },
        { label: "Căn hộ", value: contract.unitCode },
        { label: "Ngày bắt đầu", value: fmtDate(contract.startDate) },
        { label: "Ngày kết thúc", value: fmtDate(contract.endDate) },
        { label: "Tiền thuê mỗi tháng", value: `${vnd(contract.monthlyRentPrice)}đ` },
        { label: "Tiền cọc bảo đảm", value: `${vnd(contract.securityDepositAmount)}đ` },
      ]} />
    </Section>
    <Section title="Các bên trong hợp đồng">
      <KeyValue items={[
        { label: "Khách thuê", value: contract.tenant.fullName || "—" },
        { label: "Số điện thoại khách", value: contract.tenant.phone || "—" },
        { label: "Chủ nhà", value: contract.landlord.fullName || "—" },
        { label: "Số điện thoại chủ nhà", value: contract.landlord.phone || "—" },
      ]} />
    </Section>
    <Section title="Bằng chứng ký số">
      <KeyValue items={[
        { label: "SHA-256 tài liệu", value: contract.evidenceSha256 || "Chưa có tài liệu ký số gắn với hợp đồng" },
        { label: "Dấu thời gian TSA", value: contract.tsaTimestamp ? fmtDateTime(contract.tsaTimestamp) : "Chưa có dấu thời gian" },
      ]} />
    </Section>
  </div>;
}
