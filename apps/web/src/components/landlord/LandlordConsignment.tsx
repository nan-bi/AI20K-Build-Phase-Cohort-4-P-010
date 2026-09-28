"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileSignature, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { InspectionReportView } from "@/components/consign/InspectionReportView";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDateTime, vnd } from "@/lib/mock/format";
import { consignmentById } from "@/lib/mock/selectors-admin";
import { useMock } from "@/lib/mock/store";
import type { Consignment, InspectionReport } from "@/lib/mock/types";
import {
  FURNISHING_LABEL,
  hostById,
  ITEM_LABEL,
  LAYOUT_LABEL,
} from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;

export function LandlordConsignment({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(10_000);

  if (!state.ready || !now) {
    return <div className="skeleton" style={{ height: 420 }} />;
  }

  const c = consignmentById(state, id);

  if (!c || c.landlordId !== LID) {
    notFound();
  }

  const meta = CONSIGN_STATUS_META[c.status];
  const host = c.hostId ? hostById(c.hostId) : undefined;
  const can = `${c.building} · Tầng ${c.floor} · Căn ${c.door}`;

  const itemsText =
    c.items.length > 0
      ? c.items.map((k) => ITEM_LABEL[k] ?? k).join(", ")
      : "Không kê khai đồ dùng rời";

  return (
    <div className={styles.page}>
      <PageHeader
        title={`Hồ sơ ký gửi · ${can}`}
        description={`Mã hồ sơ: #${c.id} · Đăng ký ngày ${fmtDateTime(c.createdAt)}`}
        back={{ href: "/landlord/units", label: "Danh sách căn hộ" }}
        actions={<StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>}
      />

      {/* Card trạng thái & gợi ý cho chủ nhà */}
      <div className={`card ${styles.statusCard}`}>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)", fontSize: "var(--fs-15)" }}>
          {meta.landlordHint}
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-4)",
            marginTop: "var(--s-2)",
            fontSize: "var(--fs-13)",
            color: "var(--ink-2)",
          }}
        >
          {host && (
            <span>
              Field Host phụ trách: <strong>{host.name}</strong>
            </span>
          )}
          {(c.status === "awaiting_host" || c.status === "inspecting") && c.inspectDueAt && (
            <span>
              Hạn thẩm định: <strong>{fmtDateTime(c.inspectDueAt)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Khối lý do nếu bị rejected */}
      {c.status === "rejected" && (
        <div
          className="card"
          style={{
            background: "var(--danger-050)",
            borderColor: "var(--danger)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <b style={{ color: "var(--danger)" }}>Lý do không duyệt ký gửi:</b>
            <p style={{ margin: "var(--s-1) 0 0", color: "var(--ink)", fontSize: "var(--fs-13)" }}>
              {c.note || "Không đạt điều kiện tiếp nhận của phân khu."}
            </p>
          </div>
          <Link href="/landlord/consign" className="btn btn-primary btn-sm">
            <RefreshCw size={14} /> Ký gửi lại
          </Link>
        </div>
      )}

      {/* Khối ký ủy quyền nếu đang là draft */}
      {c.status === "draft" && (
        <div
          className="card"
          style={{
            background: "var(--amber-050)",
            borderColor: "var(--amber)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--s-3)",
          }}
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

      <ConsignTimeline c={c} now={now} />

      {/* Thông tin chủ nhà đã kê khai */}
      <Section title="Thông tin bạn kê khai">
        <KeyValue
          items={[
            { label: "Căn hộ", value: can },
            { label: "Loại căn", value: LAYOUT_LABEL[c.layout] },
            { label: "Diện tích", value: `${c.areaM2} m²` },
            { label: "Giá chào thuê", value: `${vnd(c.askRent)}đ/tháng` },
            { label: "Tình trạng nội thất", value: FURNISHING_LABEL[c.furnishing] },
            {
              label: "Loại khoá cửa",
              value: c.lock === "smart" ? "Khoá thông minh" : "Khoá cơ",
            },
            { label: "Đồ dùng kê khai", value: itemsText },
          ]}
        />
      </Section>

      {/* Báo cáo thẩm định thực tế */}
      <Section title="Kết quả thẩm định thực tế">
        {c.report ? (
          <InspectionReportView c={c as Consignment & { report: InspectionReport }} />
        ) : (
          <EmptyState
            title="Field Host chưa nộp báo cáo"
            description="Field Host phân khu đang tiếp nhận và sẽ kiểm tra thực tế trong vòng 48 giờ."
          />
        )}
      </Section>
    </div>
  );
}
