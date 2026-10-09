"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META } from "@/components/contracts/status";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  templateForKind,
} from "@/lib/mock/contract-templates";
import styles from "./Contracts.module.css";

const KINDS = ["mandate", "holding", "lease", "partnership"] as const;
const templateHref = (id: string) => `/admin/contracts/templates/${encodeURIComponent(id)}`;

export function AdminContractTemplates() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Mẫu hợp đồng"
        description="Bốn hợp đồng chính của nền tảng. Bấm vào một mẫu để đọc toàn văn."
      />
      <ContractsSubnav />

      <Section title="Bốn hợp đồng chính" description="Mỗi loại trong sổ hợp đồng được ký theo một mẫu dưới đây.">
        <div className={styles.kpis}>
          {KINDS.map((kind) => {
            const t = templateForKind(kind);
            return (
              <Link key={kind} href={templateHref(t.id)} className={`card ${styles.templateCard}`}>
                <span className="muted xs">{CONTRACT_KIND_META[kind].short}</span>
                <b>{t.title}</b>
                <span className="muted xs">{t.summary}</span>
                <span className={styles.templateMore}>
                  <FileText size={14} /> Xem mẫu {t.id}
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
