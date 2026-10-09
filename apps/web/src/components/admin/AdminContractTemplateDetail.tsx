"use client";

import { CrumbLabel } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { renderMarkdown } from "@/lib/legal/markdown";
import {
  TEMPLATE_GROUP_META,
  TEMPLATE_PARTY_META,
  TEMPLATE_TYPE_META,
  stepsForTemplate,
  templateById,
} from "@/lib/mock/contract-templates";
import styles from "./Contracts.module.css";

type Body = { status: "loading" } | { status: "error"; message: string } | { status: "md"; text: string } | { status: "pdf"; url: string };

export function AdminContractTemplateDetail({ templateId }: { templateId: string }) {
  const template = templateById(templateId);
  const fileUrl = `/admin/legal/${encodeURIComponent(templateId)}`;
  const [body, setBody] = useState<Body>({ status: "loading" });

  useEffect(() => {
    if (!template) return;
    let alive = true;
    fetch(fileUrl, { credentials: "same-origin" })
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) return setBody({ status: "error", message: await res.text() });
        if ((res.headers.get("content-type") ?? "").includes("pdf")) return setBody({ status: "pdf", url: fileUrl });
        setBody({ status: "md", text: await res.text() });
      })
      .catch(() => alive && setBody({ status: "error", message: "Không tải được nội dung mẫu." }));
    return () => {
      alive = false;
    };
  }, [fileUrl, template]);

  const back = (
    <Link href="/admin/contracts/templates" className="btn btn-secondary">
      <ArrowLeft size={16} /> Về danh mục
    </Link>
  );

  if (!template) {
    return (
      <div className={styles.page}>
        <PageHeader title="Không tìm thấy mẫu văn bản" description={`Mã ${templateId} không có trong danh mục.`} actions={back} />
      </div>
    );
  }

  const steps = stepsForTemplate(template.id);
  const related = (template.related ?? []).map((id) => templateById(id)).filter(Boolean);

  return (
    <div className={styles.page}>
      <CrumbLabel label={template.title} />
      <PageHeader
        title={template.title}
        description={template.summary}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-quiet">
              <Download size={16} /> Mở tệp gốc
            </a>
            {back}
          </div>
        }
      />
      <ContractsSubnav />

      <Section title="Thông tin mẫu">
        <KeyValue
          items={[
            { label: "Mã mẫu", value: template.id },
            { label: "Số / mã văn bản", value: template.refCode ?? "—" },
            { label: "Nhóm", value: TEMPLATE_GROUP_META[template.group].label },
            { label: "Loại", value: TEMPLATE_TYPE_META[template.type].label },
            { label: "Các bên", value: template.parties.map((p) => TEMPLATE_PARTY_META[p].label).join(", ") },
            { label: "Tệp nguồn", value: <span className={styles.mono}>{template.file}</span> },
            { label: "Dùng ở bước", value: steps.length ? steps.map((s) => `${s.id} · ${s.step}`).join(" | ") : "—" },
            {
              label: "Mẫu liên quan",
              value: related.length ? (
                <span className={styles.chipList}>
                  {related.map((t) => (
                    <Link key={t!.id} href={`/admin/contracts/templates/${encodeURIComponent(t!.id)}`} className={styles.codeChip} title={t!.title}>
                      {t!.id}
                    </Link>
                  ))}
                </span>
              ) : (
                "—"
              ),
            },
          ]}
        />
      </Section>

      <Section title="Toàn văn">
        {body.status === "loading" && <div className="skeleton" style={{ height: 420 }} />}
        {body.status === "error" && (
          <p role="alert" className="small">
            {body.message}
          </p>
        )}
        {body.status === "pdf" && <iframe src={body.url} title={template.title} className={styles.docFrame} />}
        {body.status === "md" && <article className={`card ${styles.doc}`}>{renderMarkdown(body.text)}</article>}
      </Section>
    </div>
  );
}
