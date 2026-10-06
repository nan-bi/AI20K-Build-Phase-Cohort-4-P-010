"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useAdminContractTemplate } from "@/lib/admin/api";
import styles from "./Contracts.module.css";

export function AdminContractTemplateDetail({ templateId }: { templateId: string }) {
  const query = useAdminContractTemplate(templateId);
  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 300 }} />;
  if (query.state.status === "error") return <div className={styles.page}>
    <PageHeader title="Không tải được mẫu văn bản" description={query.state.message} actions={<Link href="/admin/contracts/templates" className="btn btn-secondary"><ArrowLeft size={16} /> Về danh mục</Link>} />
  </div>;
  const template = query.state.data;
  return <div className={styles.page}>
    <PageHeader title={template.name} description="Thông tin cấu hình mẫu từ backend." actions={<Link href="/admin/contracts/templates" className="btn btn-secondary"><ArrowLeft size={16} /> Về danh mục</Link>} />
    <ContractsSubnav />
    <Section title="Định danh mẫu">
      <KeyValue items={[{ label: "Mã", value: template.id }, { label: "Mã văn bản", value: template.code }, { label: "Tên", value: template.name }]} />
    </Section>
    <Section title="Nội dung và trạng thái triển khai">
      <p className="muted">API hiện chỉ trả mã và tên mẫu; tệp pháp lý, phiên bản, nội dung ký và hợp đồng đã áp dụng chưa được lưu hoặc cung cấp qua endpoint.</p>
    </Section>
  </div>;
}
