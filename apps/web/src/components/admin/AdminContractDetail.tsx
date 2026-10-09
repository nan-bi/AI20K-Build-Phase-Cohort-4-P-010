"use client";

import { CrumbLabel } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, User } from "lucide-react";
import { ContractsSubnav } from "@/components/contracts/ContractsSubnav";
import { CONTRACT_KIND_META } from "@/components/contracts/status";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { adminApi, parseRegistryKey, useAdminContract, useContractRegistryDetail } from "@/lib/admin/api";
import { fmtDateTime } from "@/lib/format";
import { templateForKind } from "@/lib/mock/contract-templates";
import styles from "./Contracts.module.css";

const ROLE_LABEL = { landlord: "Chủ nhà", tenant: "Khách thuê", host: "Field Host", platform: "Nền tảng" } as const;
const SIGNER_LABEL: Record<string, string> = { tenant: "Khách thuê", landlord: "Chủ nhà", host: "Field Host", platform: "VinStay AI" };

export function AdminContractDetail({ contractKey }: { contractKey: string }) {
  const { kind, id } = parseRegistryKey(contractKey);
  const query = useContractRegistryDetail(kind, id);
  // SĐT các bên chỉ có ở endpoint chi tiết HĐ thuê (giải mã phía backend).
  const lease = useAdminContract(id, kind === "lease");

  const back = (
    <Link href="/admin/contracts" className="btn btn-secondary">
      <ArrowLeft size={16} /> Về sổ hợp đồng
    </Link>
  );

  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (query.state.status === "error") {
    return (
      <div className={styles.page}>
        <PageHeader title="Không tải được hợp đồng" description={query.state.message} actions={back} />
        <button type="button" className="btn btn-quiet" onClick={query.reload}>
          Thử lại
        </button>
      </div>
    );
  }

  const c = query.state.data;
  const template = templateForKind(c.kind);
  const leaseInfo = lease.state.status === "ready" ? lease.state.data : null;

  async function remindRenewal() {
    const res = await adminApi.remindRenewal(c.id);
    toast(res.ok ? "Đã gửi nhắc gia hạn cho các bên." : res.message || "Không gửi được nhắc gia hạn.", res.ok ? "success" : "info");
  }

  return (
    <div className={styles.page}>
      <CrumbLabel label={c.docNumber} />
      <PageHeader title={c.docNumber} description={`${CONTRACT_KIND_META[c.kind].label} · ${c.scope}`} actions={back} />
      <ContractsSubnav />

      <div className={styles.detailLayout}>
        <div className={styles.mainCol}>
          <div>
            <StatusBadge tone={c.tone}>{c.statusLabel}</StatusBadge>
          </div>

          <Section title="Thông tin văn bản">
            <KeyValue items={c.facts.map((f) => ({ label: f.label, value: f.value }))} />
          </Section>

          <Section title="Các bên">
            <KeyValue
              items={c.parties.map((p) => {
                const phone = p.role === "tenant" ? leaseInfo?.tenant.phone : p.role === "landlord" ? leaseInfo?.landlord.phone : null;
                return {
                  label: ROLE_LABEL[p.role],
                  value:
                    p.role === "host" && p.id ? (
                      <Link href={`/admin/hosts/${p.id}`} className="link">
                        {p.name}
                      </Link>
                    ) : (
                      `${p.name}${phone ? ` · ${phone}` : ""}`
                    ),
                };
              })}
            />
          </Section>

          <Section title="Mốc thời gian">
            <ul className={styles.events}>
              {c.timeline.map((t) => (
                <li key={t.label} className={`${styles.eventItem} ${t.at ? "" : styles.eventPending}`}>
                  <span className={`${styles.eventDot} ${t.at ? styles.eventDone : ""}`} />
                  <span className={styles.eventContent}>
                    <span className={styles.eventLabel}>{t.label}</span>
                    <span className={styles.eventTime}>{t.at ? fmtDateTime(t.at) : "Chưa diễn ra"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {c.kind !== "partnership" && (
            <Section title="Bằng chứng ký số" description="Mã băm tài liệu và dấu thời gian để đối chiếu khi có tranh chấp.">
              {c.evidence ? (
                <KeyValue
                  items={[
                    { label: "SHA-256 tài liệu", value: <span className={styles.legalBox}>{c.evidence.sha256 || "Chưa niêm phong"}</span> },
                    { label: "Dấu thời gian TSA", value: c.evidence.tsaTime ? fmtDateTime(c.evidence.tsaTime) : "Chưa có" },
                    ...c.evidence.signatures.map((s) => ({
                      label: `Chữ ký ${SIGNER_LABEL[s.role] ?? s.role}`,
                      value: `${fmtDateTime(s.signedAt)} · ${s.method}`,
                    })),
                  ]}
                />
              ) : (
                <p className="muted small">Chưa có tài liệu ký số gắn với văn bản này.</p>
              )}
            </Section>
          )}
        </div>

        <aside className={styles.sideCol}>
          {c.needsAction && (
            <div className={`${styles.actionSection} ${styles.actionDue}`}>
              <span className={styles.actionTitle}>Cần xử lý</span>
              <span className={styles.actionDesc}>{c.needsAction}</span>
              {c.kind === "mandate" && (
                <Link href="/admin/inventory?tab=exit" className="btn btn-secondary btn-sm">
                  Mở danh sách thoát uỷ quyền
                </Link>
              )}
              {c.kind === "lease" && c.status === "ACTIVE" && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void remindRenewal()}>
                  Gửi nhắc gia hạn
                </button>
              )}
            </div>
          )}

          <div className={styles.actionSection}>
            <span className={styles.actionTitle}>
              <FileText size={15} style={{ verticalAlign: -2 }} /> Mẫu văn bản áp dụng
            </span>
            <span className={styles.actionDesc}>{template.title}</span>
            {template.refCode && <span className={styles.mono}>{template.refCode}</span>}
            <Link href={`/admin/contracts/templates/${encodeURIComponent(template.id)}`} className="btn btn-secondary btn-sm">
              Xem nội dung mẫu
            </Link>
          </div>

          {(c.unitId || c.hostId) && (
            <div className={styles.actionSection}>
              <span className={styles.actionTitle}>Liên kết</span>
              {c.unitId && (
                <Link href={`/admin/inventory/${c.unitId}`} className="link small">
                  <Building2 size={14} style={{ verticalAlign: -2 }} /> Hồ sơ căn {c.unitCode}
                </Link>
              )}
              {c.hostId && (
                <Link href={`/admin/hosts/${c.hostId}`} className="link small">
                  <User size={14} style={{ verticalAlign: -2 }} /> Hồ sơ Field Host
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
