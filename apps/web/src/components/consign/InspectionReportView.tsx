import { Check, X } from "lucide-react";
import type { Consignment, InspectionReport } from "@/lib/mock/types";
import { fmtDateTime } from "@/lib/mock/format";
import { hostById, ITEM_LABEL } from "@/lib/mock/units";
import {
  DECLARED_LABEL,
  declaredValue,
  inspectionSummary,
} from "@/lib/mock/selectors-inspection";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Section } from "@/components/ui/Section";
import styles from "./Consign.module.css";

interface InspectionReportViewProps {
  c: Consignment & { report: InspectionReport };
}

export function InspectionReportView({ c }: InspectionReportViewProps) {
  const rep = c.report;
  const summary = inspectionSummary(rep);
  const host = hostById(rep.hostId);

  return (
    <div className={styles.reportWrap}>
      {/* Khối 1: Dải 4 StatTile */}
      <div className={styles.statGrid}>
        <StatTile label="Độ mới trung bình" value={`${summary.avgCondition}%`} />
        <StatTile label="Hạng mục < 60%" value={`${summary.lowItems.length} mục`} />
        <StatTile label="Trường sai lệch" value={`${summary.mismatches.length} trường`} />
        <StatTile label="Đồ dùng thiếu" value={`${summary.missingItems.length} món`} />
      </div>

      {/* Khối 2: Đối chiếu thông tin chủ kê khai */}
      <Section title="Đối chiếu thông tin chủ kê khai" flush>
        <DataTable
          columns={[
            {
              key: "field",
              header: "Thông tin",
              render: (row) => DECLARED_LABEL[row.field],
            },
            {
              key: "declared",
              header: "Chủ khai",
              render: (row) => declaredValue(c, row.field),
            },
            {
              key: "actual",
              header: "Thực tế kiểm tra",
              render: (row) =>
                row.ok ? (
                  <span style={{ color: "var(--ok)", fontWeight: 600 }}>✓ Khớp</span>
                ) : (
                  <StatusBadge tone="danger">{row.actual || "Sai lệch"}</StatusBadge>
                ),
            },
          ]}
          rows={rep.declared}
          empty="Không có dữ liệu đối chiếu"
        />
      </Section>

      {/* Khối 3: Danh sách đồ dùng */}
      <Section title="Kiểm kê đồ dùng chủ khai">
        <div className={styles.chipsWrap}>
          {rep.items.length === 0 ? (
            <span style={{ color: "var(--ink-3)", fontSize: "var(--fs-13)" }}>
              Chủ nhà không kê khai đồ dùng rời.
            </span>
          ) : (
            rep.items.map((it) => (
              <span
                key={it.key}
                className={`${styles.itemChip} ${
                  it.present ? styles.itemPresent : styles.itemMissing
                }`}
              >
                {it.present ? <Check size={12} /> : <X size={12} />}
                {ITEM_LABEL[it.key] ?? it.key}
              </span>
            ))
          )}
        </div>
      </Section>

      {/* Khối 4: 10 hạng mục Hộ chiếu bàn giao số */}
      <Section title="Độ mới 10 hạng mục Hộ chiếu số" flush>
        <DataTable
          columns={[
            {
              key: "item",
              header: "Hạng mục",
              render: (row) => <strong>{row.item}</strong>,
            },
            {
              key: "condition",
              header: "Độ mới",
              render: (row) => (
                <div className={styles.condWrap}>
                  <div className={styles.condBar}>
                    <div
                      className={`${styles.condFill} ${
                        row.condition < 60 ? styles.condFillDanger : ""
                      }`}
                      style={{ width: `${row.condition}%` }}
                    />
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: row.condition < 60 ? "var(--danger)" : "var(--ink)",
                      minWidth: "36px",
                    }}
                  >
                    {row.condition}%
                  </span>
                </div>
              ),
            },
            {
              key: "photoAt",
              header: "Ảnh xác thực",
              render: (row) => (
                <span style={{ color: "var(--ink-2)", fontSize: "var(--fs-12)" }}>
                  {fmtDateTime(row.photoAt)}
                </span>
              ),
            },
            {
              key: "note",
              header: "Ghi chú",
              render: (row) => (
                <span style={{ color: "var(--ink-2)" }}>{row.note || "—"}</span>
              ),
            },
          ]}
          rows={rep.equipment}
          empty="Không có dữ liệu hạng mục"
        />
      </Section>

      {/* Khối 5: Đề xuất của Host */}
      <Section title="Đề xuất của Field Host">
        <div className={styles.recommendBox}>
          <div className={styles.recommendHeader}>
            <StatusBadge tone={rep.recommendation === "approve" ? "ok" : "danger"}>
              {rep.recommendation === "approve" ? "Đề xuất duyệt" : "Đề xuất không duyệt"}
            </StatusBadge>
            <span className={styles.recommendMeta}>
              Bởi Field Host: <strong>{host?.name ?? rep.hostId}</strong> · Lúc{" "}
              {fmtDateTime(rep.submittedAt)}
            </span>
          </div>
          {rep.note && <p className={styles.recommendNote}>{rep.note}</p>}
        </div>
      </Section>
    </div>
  );
}
