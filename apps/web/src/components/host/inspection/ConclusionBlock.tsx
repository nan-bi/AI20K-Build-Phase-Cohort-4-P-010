"use client";

import { PRICE_CHANGE_WARNING, pricingChanged } from "@/lib/inspection/facts";
import { vnd } from "@/lib/format";
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
          <span>Đạt — cho phép niêm yết</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", cursor: "pointer", fontWeight: 500 }}>
          <input type="radio" name="recommendation" checked={!approve} onChange={() => onChange((d) => ({ ...d, recommendation: "reject" }))} />
          <span>Không đạt — đóng hồ sơ</span>
        </label>
      </div>

      {approve && <PricingSection detail={detail} draft={draft} invalidField={invalidField} onChange={onChange} />}

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

/** Khối "Giá & cọc": rent + cọc bảo đảm điền sẵn; đổi ⇒ ô Lý do bắt buộc + cảnh báo chờ chủ; không đổi ⇒ "Đạt — đăng ngay". */
export function PricingSection({ detail, draft, invalidField, onChange }: Pick<Props, "detail" | "draft" | "invalidField" | "onChange">) {
  const p = draft.pricing;
  const changed = pricingChanged(p, detail);
  const set = (patch: Partial<InspectionDraft["pricing"]>) => onChange((d) => ({ ...d, pricing: { ...d.pricing, ...patch } }));
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);
  const bad = (k: string) => (invalidField === `pricing.${k}` || invalidField === "pricing" ? styles.rowBad : "");
  return (
    <div id="insp-pricing" style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <h4 style={{ margin: 0 }}>Giá & cọc</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s-3)" }}>
        <label id="insp-pricing-rent" className={`field ${bad("rent")}`}>
          <span className="label">Giá thuê (đ/tháng)</span>
          <input className="input" inputMode="numeric" value={p.rent ? Number(p.rent).toLocaleString("vi-VN") : ""} onChange={(e) => set({ rent: digits(e.target.value) })} />
          <span className="muted xs">Chủ khai: {vnd(detail.askRent)}đ</span>
        </label>
        <label id="insp-pricing-security-deposit" className={`field ${bad("securityDeposit")}`}>
          <span className="label">Tiền cọc bảo đảm (đ)</span>
          <input className="input" inputMode="numeric" value={p.securityDeposit ? Number(p.securityDeposit).toLocaleString("vi-VN") : ""} onChange={(e) => set({ securityDeposit: digits(e.target.value) })} />
          <span className="muted xs">Chủ khai: {vnd(detail.suggestedDeposit)}đ</span>
        </label>
      </div>
      {changed && (
        <>
          <p className={styles.priceWarn} role="status">
            {PRICE_CHANGE_WARNING}.
          </p>
          <label id="insp-pricing-reason" className={`field ${bad("reason")}`}>
            <span className="label">
              Lý do đổi giá/cọc <b style={{ color: "var(--danger)" }}>*</b>
            </span>
            <textarea className="input" rows={2} maxLength={300} value={p.reason} placeholder="VD: giá căn tương đương cùng tầng thấp hơn 500.000đ…" onChange={(e) => set({ reason: e.target.value })} style={{ resize: "vertical" }} />
          </label>
        </>
      )}
    </div>
  );
}
