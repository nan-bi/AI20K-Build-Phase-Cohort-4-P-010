"use client";

import Link from "next/link";
import { ArrowRight, FileSignature, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { InspectionReportPanel } from "@/components/consign/InspectionReportPanel";
import { PricingProposalCard } from "@/components/consign/PricingProposalCard";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { fmtDateTime, vnd } from "@/lib/format";
import { FURNISHING_LABEL } from "@/lib/units";
import { queries } from "@/lib/landlord/queries";
import { LAYOUT_LABEL, LEASE_TERM_LABEL } from "@/lib/landlord/labels";
import type { Consignment } from "@/lib/landlord/types";
import { invalidateLandlordData, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { useNow } from "@/lib/useNow";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

export function LandlordConsignment({ id }: { id: string }) {
  const query = useLandlordQuery(queries.consignment(id));
  return (
    <div className={styles.page}>
      <QueryView query={query} skeleton="detail">{(c) => <ConsignmentBody c={c} onReload={() => { invalidateLandlordData(); query.reload(); }} />}</QueryView>
    </div>
  );
}

function ConsignmentBody({ c, onReload }: { c: Consignment; onReload: () => void }) {
  const now = useNow(10_000);
  const meta = CONSIGN_STATUS_META[c.status];
  const can = `${c.building} · Tầng ${c.floor} · Căn ${c.door ?? "—"}`;
  // Phiếu thẩm định do Inspector nộp (E10): kèm ảnh, link ký 1h. null khi chưa nộp.
  const inspection = c.inspection ?? null;
  const report = inspection?.report;
  const timeline = {
    status: c.status,
    signedAt: c.signedAt ?? undefined,
    hostAcceptedAt: c.hostAcceptedAt ?? undefined,
    decidedAt: c.decidedAt ?? undefined,
    note: c.decisionNote ?? undefined,
    inspectDueAt: c.inspectDueAt ?? undefined,
    report: inspection ? { submittedAt: inspection.submittedAt } : undefined,
  };
  const lockText =
    c.locks.includes("smart") && c.locks.includes("physical")
      ? "Khoá điện tử + chìa cơ"
      : c.locks.includes("physical")
        ? "Khoá cơ (chìa khoá)"
        : "Khoá điện tử (có mã số)";

  return (
    <>
      <PageHeader
        title={`Hồ sơ ký gửi · ${can}`}
        description={`Mã hồ sơ: #${c.contractNumber} · Đăng ký ngày ${fmtDateTime(c.createdAt)}`}
        back={{ href: "/landlord/units", label: "Danh sách căn hộ" }}
        actions={<StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>}
      />

      <div className={`card ${styles.statusCard}`}>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)", fontSize: "var(--fs-15)" }}>{meta.landlordHint}</p>
        {(c.status === "awaiting_host" || c.status === "inspecting") && c.inspectDueAt && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-4)", marginTop: "var(--s-2)", fontSize: "var(--fs-13)", color: "var(--ink-2)" }}>
            <span>
              Hạn thẩm định: <strong>{fmtDateTime(c.inspectDueAt)}</strong>
            </span>
          </div>
        )}
      </div>

      {c.status === "rejected" && (
        <div
          className="card"
          style={{ background: "var(--danger-050)", borderColor: "var(--danger)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s-3)" }}
        >
          <div>
            <b style={{ color: "var(--danger)" }}>Lý do thẩm định không đạt:</b>
            <p style={{ margin: "var(--s-1) 0 0", color: "var(--ink)", fontSize: "var(--fs-13)" }}>{c.decisionNote || inspection?.report.note || "Không đạt điều kiện tiếp nhận của phân khu."}</p>
          </div>
          <Link href="/landlord/consign" className="btn btn-primary btn-sm">
            <RefreshCw size={14} /> Ký gửi lại
          </Link>
        </div>
      )}

      {c.status === "draft" && (
        <div
          className="card"
          style={{ background: "var(--amber-050)", borderColor: "var(--amber)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s-3)" }}
        >
          <div>
            <b style={{ color: "var(--ink)" }}>Hồ sơ chưa hoàn tất ký ủy quyền</b>
            <p style={{ margin: "var(--s-1) 0 0", color: "var(--ink-2)", fontSize: "var(--fs-13)" }}>
              Vui lòng ký ủy quyền qua Zalo OTP để Field Host nhận ticket đi thẩm định thực tế.
            </p>
          </div>
          <Link href={`/landlord/consign?draft=${c.id}`} className="btn btn-amber btn-sm">
            <FileSignature size={14} /> Ký ủy quyền ngay <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {c.status === "awaiting_landlord" && c.pricingProposal && (
        <PricingProposalCard consignmentId={c.id} proposal={c.pricingProposal} onReload={onReload} />
      )}

      <ConsignTimeline c={timeline} now={now} />

      <Section title="Thông tin bạn kê khai">
        <KeyValue
          items={[
            { label: "Căn hộ", value: can },
            { label: "Mã căn", value: c.unitCode },
            { label: "Loại căn", value: LAYOUT_LABEL[c.layoutKind] },
            { label: "Diện tích", value: `${c.areaM2} m² tim tường${report?.netAreaM2 ? ` · thông thuỷ ${report.netAreaM2} m²` : ""}` },
            { label: "Giá thuê", value: `${vnd(c.askRent)}đ/tháng` },
            { label: "Tiền cọc đề xuất", value: `${vnd(c.suggestedDeposit)}đ` },
            { label: "Thời gian thuê", value: LEASE_TERM_LABEL[c.leaseTerm ?? "long"] },
            {
              label: "Tình trạng nội thất",
              value: `${c.furnished === false ? "Không nội thất" : "Có nội thất"}${report?.furnishing ? ` (thực tế: ${FURNISHING_LABEL[report.furnishing]})` : ""}`,
            },
            { label: "Loại khoá cửa", value: lockText },
          ]}
        />
      </Section>

      {(c.photos?.length ?? 0) > 0 && (
        <Section title={`Ảnh bạn đính kèm (${c.photos!.length})`} description="Ảnh tham khảo cho Field Host — không phải ảnh niêm yết chính thức.">
          <div className={styles.photoGrid}>
            {c.photos!.map((p) => (
              <a key={p.id} className={styles.photoItem} href={p.url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`Mở ảnh ${p.name}`}>
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời của Supabase Storage, không dùng next/image
                  <img src={p.url} alt={p.name} loading="lazy" />
                ) : (
                  <span className="muted xs" style={{ display: "grid", placeItems: "center", height: "100%" }}>
                    Không tải được ảnh
                  </span>
                )}
                <span className={styles.photoName}>{p.name}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Kết quả thẩm định thực tế">
        {inspection ? (
          <InspectionReportPanel unit={c} report={inspection.report} photos={inspection.photos} hostName={inspection.hostName} />
        ) : (
          <EmptyState title="Field Host chưa nộp báo cáo" description="Field Host thẩm định phân khu đang tiếp nhận và sẽ kiểm tra thực tế trong vòng 48 giờ." />
        )}
        {c.status === "approved" && (
          <div style={{ marginTop: "var(--s-4)" }}>
            <Link href={`/landlord/units/${c.unitId}`} className="btn btn-primary btn-sm">
              Xem căn <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </Section>
    </>
  );
}
