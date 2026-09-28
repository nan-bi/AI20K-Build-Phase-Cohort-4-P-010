"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META, CONTRACT_STATUS_META } from "@/components/contracts/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  TEMPLATE_GROUP_META,
  TEMPLATE_PARTY_META,
  TEMPLATE_TYPE_META,
  contractsUsingTemplate,
  stepsForTemplate,
  templateById,
} from "@/lib/mock/contract-templates";
import { contractRows, type ContractRow } from "@/lib/mock/contracts";
import { useMock } from "@/lib/mock/store";
import { useNow } from "@/lib/useNow";
import styles from "./Contracts.module.css";

interface Props {
  templateId: string;
}

export function AdminContractTemplateDetail({ templateId }: Props) {
  const template = templateById(templateId);
  const state = useMock();
  const now = useNow(60_000);
  const allRows = useMemo(() => (now ? contractRows(state, now) : []), [state, now]);

  const usedSteps = useMemo(() => stepsForTemplate(templateId), [templateId]);
  const activeContracts = useMemo(
    () => (template ? contractsUsingTemplate(allRows, template.id) : []),
    [allRows, template]
  );

  if (!template) {
    return (
      <div className={styles.page}>
        <PageHeader title="Không tìm thấy mẫu hợp đồng" description={`Mã mẫu ${templateId} không tồn tại trong hệ thống.`} />
        <Link href="/admin/contracts/templates" className="btn btnSecondary" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={16} /> Quay lại danh mục mẫu
        </Link>
      </div>
    );
  }

  const contractColumns: DataTableColumn<ContractRow>[] = [
    {
      key: "docId",
      header: "Số HĐ",
      render: (r) => (
        <span className={styles.docIdText}>
          {r.docId}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Loại",
      render: (r) => (
        <span className={styles.nowrap}>
          {CONTRACT_KIND_META[r.kind]?.short ?? r.kind}
        </span>
      ),
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
        <span className="muted small">
          {r.parties.map((p) => p.name).join(" · ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => {
        const meta = CONTRACT_STATUS_META[r.status];
        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={template.title}
        description={template.summary}
        back={{ href: "/admin/contracts/templates", label: "Mẫu hợp đồng" }}
        actions={
          <StatusBadge tone="info">
            {template.id} · {TEMPLATE_TYPE_META[template.type]?.label}
          </StatusBadge>
        }
      />

      <ContractsSubnav />

      {/* Thông tin hồ sơ mẫu */}
      <Section title="Thông tin pháp lý & Hồ sơ mẫu">
        <KeyValue
          items={[
            { label: "Mã mẫu", value: template.id },
            { label: "Số / Mã văn bản", value: template.refCode || "—" },
            { label: "Nhóm văn bản", value: TEMPLATE_GROUP_META[template.group]?.label },
            { label: "Phân loại", value: TEMPLATE_TYPE_META[template.type]?.label },
            {
              label: "Các bên tham gia",
              value: template.parties.map((p) => TEMPLATE_PARTY_META[p]?.label ?? p).join(", "),
            },
            {
              label: "Tệp nguồn (legal/)",
              value: <span className={styles.mono}>{template.file}</span>,
            },
            {
              label: "Mẫu liên quan",
              value:
                template.related && template.related.length > 0 ? (
                  <div className={styles.chipList}>
                    {template.related.map((relId) => (
                      <Link
                        key={relId}
                        href={`/admin/contracts/templates/${relId}`}
                        className={styles.codeChip}
                      >
                        {relId}
                      </Link>
                    ))}
                  </div>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Section>

      {/* Section: Được dùng ở các bước */}
      <Section
        title={`Được dùng ở các bước (${usedSteps.length})`}
        description="Các bước nghiệp vụ trong vòng đời thuê nhà có áp dụng hoặc ký kết mẫu này"
      >
        {usedSteps.length === 0 ? (
          <div className={styles.empty}>Mẫu này hiện không nằm trong 18 bước nghiệp vụ trực tiếp.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {usedSteps.map((s) => {
              const isPrimary = s.primary === template.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm, 6px)",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={styles.docIdText}>{s.id}</span>
                    <span className="muted small">[{s.actor.toUpperCase()}]</span>
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{s.step}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge tone={isPrimary ? "ok" : "info"}>
                      {isPrimary ? "Mẫu ký chính" : "Văn bản kèm"}
                    </StatusBadge>
                    <StatusBadge tone={s.implemented ? "ok" : "neutral"}>
                      {s.implemented ? "Có luồng" : "Chưa có luồng"}
                    </StatusBadge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section: Hợp đồng đang dùng mẫu này */}
      <Section
        title={`Hợp đồng đang dùng mẫu này (${activeContracts.length})`}
        description="Các hợp đồng thực tế trong sổ được ký kết hoặc ràng buộc theo mẫu văn bản này"
      >
        <DataTable
          columns={contractColumns}
          rows={activeContracts}
          rowHref={(r) => `/admin/contracts/${r.key}`}
          empty="Mẫu này là quy chế vận hành / chính sách — không sinh hợp đồng riêng trong sổ."
        />
      </Section>
    </div>
  );
}
