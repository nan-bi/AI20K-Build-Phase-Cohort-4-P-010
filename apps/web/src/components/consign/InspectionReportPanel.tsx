"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtDateTime, vnd } from "@/lib/format";
import { DECLARED_FIELDS, DECLARED_LABEL, FUNCTION_LABEL, FURNISHING_LABEL, GROUP_LABEL, LOW_CONDITION, ROOM_LABEL, declaredValue, liabilityLabel } from "@/lib/inspection/logic";
import type { InspectionCard, InspectionPhotoView, InspectionReport, InventoryLineReport } from "@/lib/inspection/types";
import styles from "@/components/host/inspection/Inspection.module.css";

type Unit = Pick<InspectionCard, "building" | "floor" | "door" | "layoutKind" | "areaM2" | "furnished" | "locks">;

interface Props {
  unit: Unit;
  report: InspectionReport;
  photos: InspectionPhotoView[];
  /** Tên Inspector (cổng chủ nhà có; cổng Host là chính mình ⇒ bỏ trống). */
  hostName?: string | null;
}

/**
 * Phiếu thẩm định chỉ đọc (hồ sơ 16, SPEC-P03 §4): kết quả, đối chiếu 5 trường, độ mới TB, bảng 32+X dòng kèm ảnh
 * (bấm phóng to), ảnh niêm yết theo thứ tự, lý do khi không đạt. Dùng chung cho cổng Chủ nhà và Host.
 */
export function InspectionReportPanel({ unit, report, photos, hostName }: Props) {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const approved = report.recommendation === "approve";
  const present = report.inventory.filter((l) => l.present);
  const low = present.filter((l) => (l.condition ?? 0) < LOW_CONDITION).length;
  const listing = report.listingPhotoIds.map((id) => byId.get(id)).filter((p): p is InspectionPhotoView => Boolean(p));
  const ratio = unit.areaM2 ? Math.round((report.netAreaM2 / unit.areaM2) * 100) : 0;

  const thumbs = (ids: string[], label: string) => (
    <div className={styles.panelThumbs}>
      {ids.map((id) => {
        const p = byId.get(id);
        return p?.url ? (
          <button key={id} type="button" className={styles.panelThumb} aria-label={`Phóng to ảnh ${label}`} onClick={() => setZoom({ src: p.url!, alt: label })}>
            {/* eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời của Supabase Storage */}
            <img src={p.url} alt={label} loading="lazy" />
          </button>
        ) : (
          <span key={id} className="muted xs">
            —
          </span>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <Section title="Kết quả thẩm định">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)", alignItems: "center" }}>
            <StatusBadge tone={approved ? "ok" : "danger"}>{approved ? "Đạt — đã niêm yết" : "Không đạt"}</StatusBadge>
            <span className="muted small">
              {hostName ? <>Field Host: <strong>{hostName}</strong> · </> : null}Lúc {fmtDateTime(report.submittedAt)}
            </span>
          </div>
          {report.note && <p style={{ margin: 0, fontSize: "var(--fs-13)" }}>{approved ? report.note : <><b>Lý do không đạt:</b> {report.note}</>}</p>}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s-3)" }}>
        <StatTile label="Diện tích thông thuỷ" value={`${report.netAreaM2} m²`} delta={{ text: `Tim tường ${unit.areaM2} m² (${ratio}%)`, tone: "flat" }} />
        <StatTile label="Nội thất thực tế" value={FURNISHING_LABEL[report.furnishing]} delta={{ text: `Chủ khai: ${unit.furnished === false ? "Không nội thất" : "Có nội thất"}`, tone: "flat" }} />
        <StatTile label="Độ mới trung bình" value={`${report.avgCondition}%`} delta={{ text: report.avgCondition >= 70 ? "Hiện trạng tốt" : "Cần lưu ý hao mòn", tone: report.avgCondition >= 70 ? "good" : "bad" }} />
        <StatTile label={`Hạng mục < ${LOW_CONDITION}%`} value={`${low} mục`} delta={{ text: low > 0 ? "Cần đối soát kỹ khi giao" : "Đạt chuẩn bàn giao", tone: low > 0 ? "bad" : "good" }} />
      </div>

      <Section title="Đối chiếu thông tin kê khai">
        <div className={styles.checkGrid}>
          {DECLARED_FIELDS.map((f) => {
            const d = report.declared.find((x) => x.field === f);
            const ok = d?.ok !== false;
            return (
              <div key={f} className={styles.checkItem}>
                {ok ? <Check size={16} className={styles.okIcon} /> : <X size={16} className={styles.badIcon} />}
                <span>
                  <b>{DECLARED_LABEL[f]}:</b> {declaredValue(unit, f)}
                  {!ok && (
                    <>
                      {" "}→ <b style={{ color: "var(--danger)" }}>thực tế: {d?.actual}</b>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Kiểm tra công năng">
        <div className={styles.checkGrid}>
          {(Object.keys(FUNCTION_LABEL) as (keyof typeof FUNCTION_LABEL)[]).map((k) => (
            <div key={k} className={styles.checkItem}>
              {report.functions[k] ? <Check size={16} className={styles.okIcon} /> : <X size={16} className={styles.badIcon} />}
              <span>{FUNCTION_LABEL[k]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Bảng kê trang thiết bị (${report.inventory.length} dòng)`} flush>
        <DataTable<InventoryLineReport>
          columns={[
            { key: "name", header: "Hạng mục", render: (l) => <span><strong>{l.code}. {l.name}</strong><br /><span className="muted xs">{GROUP_LABEL[l.group]}</span></span> },
            {
              key: "state",
              header: "Hiện trạng",
              render: (l) =>
                l.present ? (
                  <span className="small">
                    SL {l.qty ?? 1} · <b>{l.condition ?? 0}%</b>
                    {l.spec ? ` · ${l.spec}` : ""}
                    {l.note ? <><br /><span className="muted xs">{l.note}</span></> : null}
                  </span>
                ) : (
                  <span className="muted small">Không có</span>
                ),
            },
            { key: "liab", header: "Trách nhiệm", render: (l) => (l.present ? <span className="small">{liabilityLabel(l.liability)}{l.compensation ? ` · ${vnd(l.compensation)}đ` : ""}</span> : "—") },
            { key: "photos", header: "Ảnh", render: (l) => (l.present ? thumbs(l.photoIds, `${l.code}. ${l.name}`) : "—") },
          ]}
          rows={report.inventory}
          empty={<span className="muted">Chưa có bảng kê.</span>}
        />
      </Section>

      {approved && listing.length > 0 && (
        <Section title={`Ảnh niêm yết (${listing.length})`} description="Ảnh đang hiển thị công khai trên tin đăng, theo đúng thứ tự.">
          <div className={styles.listingGrid}>
            {listing.map((p, i) => (
              <div key={p.id} className={styles.listingCard}>
                <button type="button" className={styles.listingImg} style={{ border: 0, padding: 0, cursor: p.url ? "zoom-in" : "default" }} onClick={() => p.url && setZoom({ src: p.url, alt: `Ảnh niêm yết ${i + 1}` })} aria-label={`Phóng to ảnh niêm yết ${i + 1}`}>
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời của Supabase Storage
                    <img src={p.url} alt={`Ảnh niêm yết ${i + 1}`} loading="lazy" />
                  ) : (
                    <span className="muted xs">Không tải được</span>
                  )}
                  <span className={styles.listingIndex}>{i + 1}</span>
                </button>
                <div className={styles.listingFoot}>
                  <span>{p.room ? ROOM_LABEL[p.room] : "—"}</span>
                  <span className="muted xs">{fmtDateTime(p.uploadedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Modal open={zoom !== null} onClose={() => setZoom(null)} title={zoom?.alt} variant="wide">
        {zoom && (
          // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời của Supabase Storage
          <img src={zoom.src} alt={zoom.alt} className={styles.zoomImg} />
        )}
      </Modal>
    </div>
  );
}
