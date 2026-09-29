"use client";

import type { Consignment, InspectionReport, InventoryGroup } from "@/lib/mock/types";
import { fmtDateTime, fmtTime, vnd } from "@/lib/mock/format";
import { FURNISHING_LABEL, hostById } from "@/lib/mock/units";
import {
  DECLARED_LABEL,
  declaredValue,
  inspectionSummary,
  LOW_CONDITION,
} from "@/lib/mock/selectors-inspection";
import {
  INVENTORY_GROUP_LABEL,
  passportSummary,
} from "@/lib/mock/inventory";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Section } from "@/components/ui/Section";
import styles from "./Consign.module.css";

interface InspectionReportViewProps {
  c: Consignment & { report: InspectionReport };
}

const GROUPS: InventoryGroup[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function InspectionReportView({ c }: InspectionReportViewProps) {
  const rep = c.report;
  const summary = inspectionSummary(rep);
  const host = hostById(rep.hostId);

  const inventoryLines = rep.inventory ?? [];
  const passportItems = passportSummary(inventoryLines);
  const ratio = c.areaM2 ? Math.round((rep.netAreaM2 / c.areaM2) * 100) : 0;

  return (
    <div className={styles.reportWrap}>
      {/* Khối 1: Dải 4 StatTile chính */}
      <div className={styles.statGrid}>
        <StatTile
          label="Diện tích thông thuỷ"
          value={`${rep.netAreaM2} m²`}
          delta={{ text: `Tim tường ${c.areaM2} m² (${ratio}%)`, tone: "flat" }}
        />
        <StatTile
          label="Nội thất thực tế"
          value={FURNISHING_LABEL[rep.furnishing]}
          delta={{
            text: `Chủ khai: ${c.furnished ? "Có nội thất" : "Không nội thất"}`,
            tone: c.furnished && rep.furnishing !== "empty" ? "good" : "flat",
          }}
        />
        <StatTile
          label="Độ mới trung bình"
          value={`${summary.avgCondition}%`}
          delta={{
            text: summary.avgCondition >= 70 ? "Hiện trạng tốt" : "Cần lưu ý hao mòn",
            tone: summary.avgCondition >= 70 ? "good" : "bad",
          }}
        />
        <StatTile
          label="Hạng mục < 60%"
          value={`${summary.lowItems.length} mục`}
          delta={{
            text: summary.lowItems.length > 0 ? "Cần đối soát kỹ khi giao" : "Đạt chuẩn bàn giao",
            tone: summary.lowItems.length > 0 ? "bad" : "good",
          }}
        />
      </div>

      {/* Khối 2: Đề xuất của Field Host */}
      <Section title="Đề xuất của Field Host">
        <div className={styles.recommendBox}>
          <div className={styles.recommendHeader}>
            <StatusBadge tone={rep.recommendation === "approve" ? "ok" : "danger"}>
              {rep.recommendation === "approve" ? "Đề xuất duyệt ký gửi" : "Đề xuất không duyệt"}
            </StatusBadge>
            <span className={styles.recommendMeta}>
              Field Host: <strong>{host?.name ?? rep.hostId}</strong> · Lúc{" "}
              {fmtDateTime(rep.submittedAt)}
            </span>
          </div>
          {rep.note && <p className={styles.recommendNote}>{rep.note}</p>}
        </div>
      </Section>

      {/* Khối 3: 10 hạng mục Hộ chiếu bàn giao số */}
      <Section title="10 hạng mục Hộ chiếu bàn giao số (Charter)" flush>
        <DataTable
          columns={[
            {
              key: "item",
              header: "Hạng mục",
              render: (row) => <strong>{row.item}</strong>,
            },
            {
              key: "count",
              header: "Số lượng thiết bị",
              render: (row) => (
                <span className="muted" style={{ fontSize: "var(--fs-13)" }}>
                  {row.count > 0 ? `${row.count} món có mặt` : "Không có"}
                </span>
              ),
            },
            {
              key: "condition",
              header: "Độ mới trung bình",
              render: (row) => {
                if (row.avg === null) {
                  return <span className="muted">—</span>;
                }
                const isLow = row.avg < LOW_CONDITION;
                return (
                  <div className={styles.condWrap}>
                    <div className={styles.condBar}>
                      <div
                        className={`${styles.condFill} ${isLow ? styles.condFillDanger : ""}`}
                        style={{ width: `${row.avg}%` }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: isLow ? "var(--danger)" : "var(--ink)",
                        minWidth: "36px",
                      }}
                    >
                      {row.avg}%
                    </span>
                  </div>
                );
              },
            },
            {
              key: "status",
              header: "Đánh giá",
              render: (row) => {
                if (row.avg === null) {
                  return <StatusBadge tone="neutral">Không trang bị</StatusBadge>;
                }
                if (row.avg < LOW_CONDITION) {
                  return <StatusBadge tone="warn">Dưới 60% (Cảnh báo)</StatusBadge>;
                }
                return <StatusBadge tone="ok">Đạt chuẩn</StatusBadge>;
              },
            },
          ]}
          rows={passportItems}
          empty="Chưa có dữ liệu hộ chiếu số"
        />
      </Section>

      {/* Khối 4: Bảng kê chi tiết theo 8 nhóm Điều 5 */}
      {inventoryLines.length > 0 && (
        <Section
          title="Bảng kê chi tiết trang thiết bị bàn giao (Điều 5 HĐ thuê)"
          description="Kiểm tra chi tiết từng món theo quy chuẩn kiểm định độc quyền của VinStay AI."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
            {GROUPS.map((grp) => {
              const lines = inventoryLines.filter((l) => l.group === grp);
              const present = lines.filter((l) => l.present);
              const missing = lines.filter((l) => !l.present);

              return (
                <div key={grp} className={styles.groupCard}>
                  <div className={`${styles.groupHeader} ${styles.groupHeaderOpen}`}>
                    <div className={styles.groupTitle}>
                      <span>
                        {grp}. {INVENTORY_GROUP_LABEL[grp]}
                      </span>
                      <span className={styles.groupBadge}>
                        {present.length}/{lines.length} món có mặt
                      </span>
                    </div>
                  </div>

                  <div className={styles.groupBody} style={{ padding: 0 }}>
                    {present.length > 0 ? (
                      <div className="tableScroll">
                        <table className={styles.finRows || "table"} style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-13)" }}>
                          <thead>
                            <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Mã</th>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Hạng mục</th>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Quy cách / Model</th>
                              <th style={{ padding: "8px 12px", textAlign: "center" }}>SL</th>
                              <th style={{ padding: "8px 12px", textAlign: "center" }}>Độ mới</th>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Ảnh xác thực</th>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Trách nhiệm</th>
                              <th style={{ padding: "8px 12px", textAlign: "right" }}>Bồi thường</th>
                              <th style={{ padding: "8px 12px", textAlign: "left" }}>Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {present.map((line) => (
                              <tr key={line.code} style={{ borderBottom: "1px solid var(--line)" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{line.code}</td>
                                <td style={{ padding: "8px 12px", fontWeight: 500 }}>{line.name}</td>
                                <td style={{ padding: "8px 12px", color: "var(--ink-2)" }}>{line.spec || "—"}</td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>{line.qty ?? 1}</td>
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color:
                                        (line.condition ?? 0) < LOW_CONDITION
                                          ? "var(--danger)"
                                          : "var(--ink)",
                                    }}
                                  >
                                    {line.condition !== undefined ? `${line.condition}%` : "—"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 12px", color: "var(--ink-2)", fontSize: "var(--fs-12)" }}>
                                  {line.photoAt ? fmtTime(line.photoAt) : "Chưa có"}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <span
                                    className={`${styles.liabilityBadge} ${
                                      line.liability === "misuse"
                                        ? styles.liabilityMisuse
                                        : styles.liabilityWear
                                    }`}
                                  >
                                    {line.liability === "misuse" ? "Lỗi dùng" : "Hao mòn / Lỗi dùng"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                                  {line.compensation ? `${vnd(line.compensation)}đ` : "—"}
                                </td>
                                <td style={{ padding: "8px 12px", color: "var(--ink-2)", fontSize: "var(--fs-12)" }}>
                                  {line.note || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: "var(--s-3) var(--s-4)", color: "var(--ink-3)", fontSize: "var(--fs-13)" }}>
                        Khu vực này hiện không có trang thiết bị nào.
                      </div>
                    )}

                    {missing.length > 0 && (
                      <div
                        style={{
                          padding: "8px 14px",
                          background: "var(--surface-2)",
                          borderTop: "1px dashed var(--line)",
                          fontSize: "var(--fs-12)",
                          color: "var(--ink-3)",
                        }}
                      >
                        <strong>Không có tại căn:</strong> {missing.map((m) => m.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Các hạng mục phát sinh ngoài catalog (X1..) */}
            {inventoryLines.some((l) => l.code.startsWith("X")) && (
              <div className={styles.groupCard}>
                <div className={`${styles.groupHeader} ${styles.groupHeaderOpen}`}>
                  <div className={styles.groupTitle}>
                    <span>Hạng mục phát sinh ngoài catalog (Mã X)</span>
                    <span className={styles.groupBadge}>
                      {inventoryLines.filter((l) => l.code.startsWith("X")).length} món
                    </span>
                  </div>
                </div>
                <div className={styles.groupBody} style={{ padding: 0 }}>
                  <div className="tableScroll">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-13)" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Mã</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Tên hạng mục</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Nhóm phân khu</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Quy cách</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>SL</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>Độ mới</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Ảnh</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryLines
                          .filter((l) => l.code.startsWith("X"))
                          .map((xLine) => (
                            <tr key={xLine.code} style={{ borderBottom: "1px solid var(--line)" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{xLine.code}</td>
                              <td style={{ padding: "8px 12px", fontWeight: 500 }}>{xLine.name}</td>
                              <td style={{ padding: "8px 12px", color: "var(--ink-2)" }}>
                                {INVENTORY_GROUP_LABEL[xLine.group]}
                              </td>
                              <td style={{ padding: "8px 12px", color: "var(--ink-2)" }}>{xLine.spec || "—"}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>{xLine.qty ?? 1}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                                {xLine.condition}%
                              </td>
                              <td style={{ padding: "8px 12px", color: "var(--ink-2)", fontSize: "var(--fs-12)" }}>
                                {xLine.photoAt ? fmtTime(xLine.photoAt) : "—"}
                              </td>
                              <td style={{ padding: "8px 12px", color: "var(--ink-2)", fontSize: "var(--fs-12)" }}>
                                {xLine.note || "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Khối 5: Đối chiếu thông tin chủ kê khai */}
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
    </div>
  );
}
