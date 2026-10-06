"use client";

import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useAdminContractTemplates, type AdminContractTemplate } from "@/lib/admin/api";
import styles from "./Contracts.module.css";

export function AdminContractTemplates() {
  const query = useAdminContractTemplates();
  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 360 }} />;
  if (query.state.status === "error") return <div role="alert"><p>{query.state.message}</p><button className="btn btn-secondary btn-sm" onClick={query.reload}>Thử lại</button></div>;

  const columns: DataTableColumn<AdminContractTemplate>[] = [
    { key: "id", header: "Mã", render: (template) => <span className={styles.docIdText}>{template.id}</span> },
    { key: "name", header: "Tên mẫu", render: (template) => <span>{template.name}</span> },
    { key: "code", header: "Mã văn bản", render: (template) => <span className="fontMono small">{template.code}</span> },
  ];

  return <div className={styles.page}>
    <PageHeader title="Danh mục mẫu văn bản" description="Các mã mẫu văn bản được backend khai báo. Hệ thống chưa cung cấp nội dung tệp hoặc lịch sử áp dụng theo hợp đồng." />
    <ContractsSubnav />
    <Section title={`Mẫu được cấu hình (${query.state.data.length})`} flush>
      <DataTable<AdminContractTemplate> columns={columns} rows={query.state.data} rowHref={(template) => `/admin/contracts/templates/${encodeURIComponent(template.id)}`} empty={<span className="muted">Backend chưa khai báo mẫu văn bản nào.</span>} />
    </Section>
    <p className="muted small">Danh sách này lấy từ API quản trị. Muốn cập nhật tên và mã mẫu, cần thay đổi cấu hình nguồn ở backend.</p>
  </div>;
}
