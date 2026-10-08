"use client";

import { ListingFields } from "@/components/consign/ListingFields";
import type { InspectionDetail, InspectionDraft } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";

interface Props {
  detail: InspectionDetail;
  draft: InspectionDraft;
  /** Field lỗi của phiếu (`listing.highlights.1`…). */
  invalidField: string | null;
  invalidMessage: string | null;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

/** Lỗi theo ô cho ListingFields từ `field` kiểu `listing.*` (bỏ tiền tố). */
function listingErrors(field: string | null, message: string | null): Record<string, string> {
  if (!field?.startsWith("listing.") || !message) return {};
  const key = field.slice("listing.".length);
  // `listing.highlights` (không chỉ số) ⇒ gắn vào ô đầu.
  return { [key === "highlights" ? "highlights.0" : key]: message };
}

/** Khối "Giới thiệu căn": hiện bản chủ khai, Inspector sửa. Nội dung công khai ⇒ CẤM SĐT/link/giá (server chặn lần nữa). */
export function ListingTextBlock({ detail, draft, invalidField, invalidMessage, onChange }: Props) {
  const hasOwnerText = Boolean(detail.declared?.highlights?.length);
  return (
    <div id="insp-listing" className={consign.formCard}>
      <h3 className={consign.formCardTitle}>Giới thiệu căn</h3>
      <p className="muted small" style={{ margin: 0 }}>
        {hasOwnerText ? "Điền sẵn từ chủ nhà — sửa cho đúng thực tế." : "Chủ nhà chưa ghi điểm nổi bật — có thể bổ sung (không bắt buộc)."} Hiện công khai trên tin đăng.
      </p>
      <ListingFields
        highlights={draft.listing.highlights}
        idPrefix="insp-listing"
        errors={listingErrors(invalidField, invalidMessage)}
        onChange={(patch) => onChange((d) => ({ ...d, listing: { ...d.listing, ...patch } }))}
      />
    </div>
  );
}
