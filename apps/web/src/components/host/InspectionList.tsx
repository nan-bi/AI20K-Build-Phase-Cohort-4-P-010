"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { hostAcceptInspection } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDateTime } from "@/lib/mock/format";
import { hostInspections, isInspectOverdue } from "@/lib/mock/selectors-inspection";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { landlordById } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";

const HOST_ID = DEMO_USERS.host.refId!;

export function InspectionList() {
  const state = useMock();
  const now = useNow(10_000);
  const items = hostInspections(state, HOST_ID);

  const awaiting = items.filter((c) => c.status === "awaiting_host");
  const inspecting = items.filter((c) => c.status === "inspecting");
  const reviewing = items.filter((c) => c.status === "reviewing");

  // Section "Cần xử lý" = awaiting_host + inspecting, sắp theo inspectDueAt tăng dần
  const activeItems = [...awaiting, ...inspecting].sort((a, b) => {
    const dueA = a.inspectDueAt ? new Date(a.inspectDueAt).getTime() : 0;
    const dueB = b.inspectDueAt ? new Date(b.inspectDueAt).getTime() : 0;
    return dueA - dueB;
  });

  // Section "Đã nộp" = reviewing | approved | rejected
  const submittedItems = items.filter(
    (c) => c.status === "reviewing" || c.status === "approved" || c.status === "rejected",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        title="Thẩm định ký gửi"
        description="Kiểm tra thực tế căn chủ nhà ký gửi — thẩm định 1 lần, chi phí 0đ cho chủ nhà."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--s-3)",
        }}
      >
        <StatTile label="Chờ nhận" value={`${awaiting.length} căn`} />
        <StatTile label="Đang thẩm định" value={`${inspecting.length} căn`} />
        <StatTile label="Chờ Admin duyệt" value={`${reviewing.length} căn`} />
      </div>

      <Section title="Cần xử lý" flush>
        <DataTable<Consignment>
          columns={[
            {
              key: "can",
              header: "Căn hộ",
              render: (c) => (
                <strong>
                  {c.building} · Tầng {c.floor} · Căn {c.door}
                </strong>
              ),
            },
            {
              key: "layout",
              header: "Loại · Diện tích",
              render: (c) => `${c.layout} · ${c.areaM2} m²`,
            },
            {
              key: "landlord",
              header: "Chủ nhà",
              render: (c) => landlordById(c.landlordId)?.name ?? c.landlordId,
            },
            {
              key: "due",
              header: "Hạn thẩm định",
              render: (c) => {
                if (!c.inspectDueAt) return "—";
                const isOverdue = isInspectOverdue(c, now);
                if (isOverdue) {
                  return <StatusBadge tone="warn">Quá hạn</StatusBadge>;
                }
                const diffMs = new Date(c.inspectDueAt).getTime() - now;
                const hours = Math.max(0, Math.ceil(diffMs / 3_600_000));
                return <span style={{ fontSize: "var(--fs-13)" }}>Còn {hours}h</span>;
              },
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (c) => {
                const meta = CONSIGN_STATUS_META[c.status];
                return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
              },
            },
            {
              key: "action",
              header: "Hành động",
              align: "right",
              render: (c) => {
                if (c.status === "awaiting_host") {
                  return (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: "4px 12px", fontSize: "var(--fs-13)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const res = hostAcceptInspection(c.id, HOST_ID);
                        if (res.ok) {
                          toast("Đã nhận. Mở phiếu thẩm định khi tới căn.", "success");
                        } else {
                          toast(res.reason, "info");
                        }
                      }}
                    >
                      Nhận thẩm định
                    </button>
                  );
                }
                return (
                  <Link
                    href={`/host/inspections/${c.id}`}
                    className="btn btn-secondary"
                    style={{ padding: "4px 12px", fontSize: "var(--fs-13)" }}
                  >
                    Mở phiếu
                  </Link>
                );
              },
            },
          ]}
          rows={activeItems}
          empty={
            <EmptyState
              title="Không có hồ sơ cần xử lý"
              description="Hiện không có căn nào đang chờ bạn nhận hoặc thẩm định thực tế."
            />
          }
        />
      </Section>

      <Section title="Đã nộp" flush>
        <DataTable<Consignment>
          columns={[
            {
              key: "can",
              header: "Căn hộ",
              render: (c) => (
                <strong>
                  {c.building} · Tầng {c.floor} · Căn {c.door}
                </strong>
              ),
            },
            {
              key: "layout",
              header: "Loại · Diện tích",
              render: (c) => `${c.layout} · ${c.areaM2} m²`,
            },
            {
              key: "landlord",
              header: "Chủ nhà",
              render: (c) => landlordById(c.landlordId)?.name ?? c.landlordId,
            },
            {
              key: "submittedAt",
              header: "Thời điểm nộp",
              render: (c) =>
                c.report?.submittedAt ? fmtDateTime(c.report.submittedAt) : "—",
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (c) => {
                const meta = CONSIGN_STATUS_META[c.status];
                return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
              },
            },
          ]}
          rows={submittedItems}
          rowHref={(c) => `/host/inspections/${c.id}`}
          empty={
            <EmptyState
              title="Chưa có hồ sơ đã nộp"
              description="Các báo cáo thẩm định bạn đã hoàn tất sẽ hiển thị tại đây."
            />
          }
        />
      </Section>
    </div>
  );
}
