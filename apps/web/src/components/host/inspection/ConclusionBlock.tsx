"use client";

import type { InspectionDetail, InspectionDraft } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import styles from "./Inspection.module.css";

interface Props {
  detail: InspectionDetail;
  draft: InspectionDraft;
  invalidField: string | null;
  /** Backend vừa báo `door_code_required` dù chi tiết cũ nói đã có mã ⇒ vẫn hiện ô PIN. */
  forcePin: boolean;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

/** Khối 7 — kết luận Đạt / Không đạt; Không đạt bắt buộc lý do; khoá điện tử chưa có mã + Đạt ⇒ ô PIN bắt buộc. */
export function ConclusionBlock({ detail, draft, invalidField, forcePin, onChange }: Props) {
  const approve = draft.recommendation === "approve";
  const needPin = approve && detail.doorKind === "smart" && (!detail.doorCodeOnFile || forcePin);
  return (
    <div className={consign.formCard}>
      <h3 className={consign.formCardTitle}>7. Kết luận thẩm định</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-5)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", cursor: "pointer", fontWeight: 500 }}>
          <input type="radio" name="recommendation" checked={approve} onChange={() => onChange((d) => ({ ...d, recommendation: "approve" }))} />
          <span>Đạt — niêm yết căn</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", cursor: "pointer", fontWeight: 500 }}>
          <input type="radio" name="recommendation" checked={!approve} onChange={() => onChange((d) => ({ ...d, recommendation: "reject" }))} />
          <span>Không đạt — đóng hồ sơ</span>
        </label>
      </div>

      {needPin && (
        <label id="insp-doorPin" className={`field ${invalidField === "doorPin" ? styles.rowBad : ""}`}>
          <span className="label">
            Mã PIN thật của cửa (4–8 chữ số) <b style={{ color: "var(--danger)" }}>*</b>
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4,8}"
            maxLength={8}
            className="input"
            value={draft.doorPin}
            onChange={(e) => onChange((d) => ({ ...d, doorPin: e.target.value.replace(/\D/g, "") }))}
            placeholder="Nhập mã đang dùng mở cửa căn này"
          />
          <span className="muted xs" style={{ marginTop: 4 }}>
            Căn khoá điện tử chưa có mã trong hệ thống. Mã được mã hoá khi lưu và chỉ dùng để cấp cho Field Host đón khách; không nhập mã giả.
          </span>
        </label>
      )}

      <label id="insp-note" className={`field ${invalidField === "note" ? styles.rowBad : ""}`}>
        <span className="label">
          {approve ? "Ghi chú thêm (tuỳ chọn)" : "Lý do không đạt"} {!approve && <b style={{ color: "var(--danger)" }}>*</b>}
        </span>
        <textarea
          className="input"
          rows={3}
          maxLength={300}
          placeholder={approve ? "Ghi chú về tình trạng căn hộ…" : "Nhập lý do — chủ nhà sẽ xem lý do này (bắt buộc)…"}
          value={draft.note}
          onChange={(e) => onChange((d) => ({ ...d, note: e.target.value }))}
          style={{ resize: "vertical" }}
        />
      </label>
    </div>
  );
}
