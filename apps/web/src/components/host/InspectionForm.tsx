"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { InspectionReportPanel } from "@/components/consign/InspectionReportPanel";
import { inspectionApi, useInspection } from "@/lib/inspection/api";
import { useInspectionAction } from "@/lib/inspection/useInspectionAction";
import type { InspectionDetail } from "@/lib/inspection/types";
import { useNow } from "@/lib/useNow";
import styles from "@/components/consign/Consign.module.css";
import { InspectionWorkspace } from "./inspection/InspectionWorkspace";

/** `/host/inspections/[id]` — chi tiết thẩm định trên API thật (hồ sơ 16). */
export function InspectionForm({ id }: { id: string }) {
  const { state, reload } = useInspection(id);
  if (state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (state.status === "error") {
    if (state.httpStatus === 404 || state.httpStatus === 403) notFound();
    return <EmptyState title="Không tải được hồ sơ" description={state.message} action={<button type="button" className="btn btn-primary" onClick={reload}>Thử lại</button>} />;
  }
  // `key` theo stage: sau khi nhận ca / nộp, phiếu dựng lại từ dữ liệu mới.
  return <InspectionBody key={state.data.stage} detail={state.data} />;
}

function InspectionBody({ detail }: { detail: InspectionDetail }) {
  const router = useRouter();
  const now = useNow(10_000);
  const { busy, run } = useInspectionAction(detail.id);
  const can = `${detail.building} · Tầng ${detail.floor} · Căn ${detail.door ?? "—"}`;

  const timeline = {
    status: detail.stage,
    signedAt: detail.signedAt,
    hostAcceptedAt: detail.hostAcceptedAt ?? undefined,
    decidedAt: detail.decidedAt ?? undefined,
    note: detail.report?.recommendation === "reject" ? detail.report.note : undefined,
    inspectDueAt: detail.inspectDueAt,
    report: detail.report ? { submittedAt: detail.report.submittedAt } : undefined,
  };

  async function take() {
    const open = detail.tier === "open";
    const res = await run(() => (open ? inspectionApi.claim(detail.id) : inspectionApi.accept(detail.id)), open ? "Đã nhận ticket. Mở phiếu khi tới căn." : "Đã nhận ca. Mở phiếu khi tới căn.", (d) => d);
    if (!res.ok && (res.code === "inspection_taken" || res.code === "inspection_not_found")) router.push("/host/inspections");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        title={`Phiếu thẩm định · ${can}`}
        description={`Chủ nhà: ${detail.landlordName} · Phân khu ${detail.zone} · ${detail.unitCode}`}
        back={{ href: "/host/inspections", label: "Danh sách thẩm định" }}
      />

      <ConsignTimeline c={timeline} now={now} />

      {detail.stage === "awaiting_host" && (
        <div className={styles.formCard} style={{ textAlign: "center", padding: "var(--s-7) var(--s-5)" }}>
          <h3 style={{ margin: 0 }}>{detail.tier === "open" ? "Ticket đang mở cho mọi Inspector" : "Bạn chưa nhận ca thẩm định này"}</h3>
          <p style={{ margin: "var(--s-2) 0 var(--s-5)", color: "var(--ink-2)", fontSize: "var(--fs-13)" }}>Nhận ca trước khi tới kiểm tra thực tế căn hộ.</p>
          <div>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void take()}>
              {detail.tier === "open" ? "Nhận ticket" : "Nhận ca thẩm định"}
            </button>
          </div>
        </div>
      )}

      {detail.stage === "inspecting" && <InspectionWorkspace detail={detail} />}

      {detail.stage === "awaiting_landlord" && (
        <div className={styles.formCard} role="status">
          <h3 style={{ margin: 0 }}>Đã gửi đề xuất giá cho chủ nhà</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Căn chưa được đăng — chờ chủ nhà đồng ý giá mới. Chủ nhà không đồng ý thì hồ sơ đóng lại.
          </p>
        </div>
      )}

      {(detail.stage === "approved" || detail.stage === "rejected" || detail.stage === "awaiting_landlord") &&
        (detail.report ? (
          <InspectionReportPanel unit={detail} report={detail.report} photos={detail.photos} />
        ) : (
          <EmptyState title="Chưa có phiếu" description="Hồ sơ đã đóng nhưng chưa có dữ liệu phiếu." />
        ))}
      {detail.stage === "approved" && (
        <p className="small" style={{ margin: 0 }}>
          Căn đã lên danh sách — <Link href={`/units/${encodeURIComponent(detail.unitCode)}`} className="link">xem tin đăng</Link>.
        </p>
      )}
    </div>
  );
}
