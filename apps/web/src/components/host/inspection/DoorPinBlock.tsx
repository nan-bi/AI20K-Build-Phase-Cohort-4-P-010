"use client";

import type { InspectionDraft } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import styles from "./Inspection.module.css";

interface Props {
  draft: InspectionDraft;
  invalid: boolean;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

/** Khối 7 — chỉ hiện khi căn khoá điện tử chưa có mã trong hệ thống: PIN thật của cửa, bắt buộc khi đẩy căn lên. */
export function DoorPinBlock({ draft, invalid, onChange }: Props) {
  return (
    <div id="insp-doorPin" className={`${consign.formCard} ${invalid ? styles.cardBad : ""}`}>
      <h3 className={consign.formCardTitle}>7. Mã PIN cửa</h3>
      <label className="field">
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
          Căn khoá điện tử chưa có mã trong hệ thống. Mã được mã hoá khi lưu và chỉ dùng để cấp cho Field Host đón khách; không nhập mã giả. Bắt buộc khi đẩy căn lên.
        </span>
      </label>
    </div>
  );
}
