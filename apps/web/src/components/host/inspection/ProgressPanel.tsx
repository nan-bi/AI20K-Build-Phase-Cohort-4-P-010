"use client";

import { KeyValue } from "@/components/ui/KeyValue";
import { Section } from "@/components/ui/Section";
import { LOW_CONDITION, draftProgress, passportSummary } from "@/lib/inspection/logic";
import type { CatalogItem, InspectionDraft } from "@/lib/inspection/types";
import styles from "./Inspection.module.css";

/** Cột phụ: tiến độ, ảnh niêm yết, độ mới TB, 10 hạng mục hộ chiếu — tính từ nháp, không gọi API. */
export function ProgressPanel({ draft, catalog, listingMin }: { draft: InspectionDraft; catalog: CatalogItem[]; listingMin: number }) {
  const p = draftProgress(draft);
  const passport = passportSummary(draft.inventory, catalog);
  return (
    <Section title="Tổng hợp trực tiếp">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", fontSize: "var(--fs-13)" }}>
        <div className={styles.progressBox}>
          <div style={{ color: "var(--ink-2)", marginBottom: 4 }}>Tiến độ ảnh bằng chứng:</div>
          <strong style={{ fontSize: "var(--fs-15)" }}>
            {p.linesWithPhotos}/{p.presentLines} dòng có đủ ảnh
          </strong>
          <div className="muted xs" style={{ marginTop: 4 }}>
            Ảnh niêm yết: {p.listingCount} (cần ≥ {listingMin})
          </div>
        </div>
        <KeyValue
          items={[
            { label: "Độ mới TB", value: `${p.avgCondition}%` },
            { label: `Món độ mới < ${LOW_CONDITION}%`, value: `${p.lowLines} món` },
            { label: "Món phát sinh", value: `${Math.max(0, draft.inventory.length - catalog.length)} món` },
          ]}
        />
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-3)" }}>
          <strong style={{ display: "block", marginBottom: 8 }}>10 hạng mục Hộ chiếu số</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {passport.map((x) => (
              <div key={x.item} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-12)" }}>
                <span style={{ color: "var(--ink-2)" }}>{x.item}</span>
                <span style={{ fontWeight: 600, color: x.avg !== null && x.avg < LOW_CONDITION ? "var(--danger)" : "var(--ink)" }}>{x.avg !== null ? `${x.avg}% (${x.count})` : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
