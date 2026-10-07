"use client";

import { LISTING_LIMITS } from "@/lib/units/listing-text";
import styles from "./Consign.module.css";

interface Props {
  title: string;
  highlights: string[];
  description: string;
  /** Lỗi theo ô: `title` | `description` | `highlights.<i>`. */
  errors: Record<string, string>;
  onChange: (patch: { title?: string; highlights?: string[]; description?: string }) => void;
  /** Tiền tố id ô nhập (màn thẩm định dùng `insp-listing` để cuộn tới ô lỗi). */
  idPrefix?: string;
  /** Tiêu đề bắt buộc (màn thẩm định). */
  titleRequired?: boolean;
}

/** Khối "Giới thiệu căn": tiêu đề, 3 điểm nổi bật, mô tả (≤ 600, có bộ đếm). Nội dung này hiện công khai nên CẤM SĐT/link/giá. */
export function ListingFields({ title, highlights, description, errors, onChange, idPrefix = "listing", titleRequired = false }: Props) {
  const slots = [0, 1, 2];
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: "var(--s-4) 0 0" }}>
      <legend className="label" style={{ padding: 0 }}>
        Giới thiệu căn{titleRequired ? "" : " (không bắt buộc)"}
      </legend>

      <label className="field">
        <span className="label">Tiêu đề{titleRequired && <b style={{ color: "var(--danger)" }}> *</b>}</span>
        <input
          id={`${idPrefix}-title`}
          className={`input ${errors.title ? styles.invalid : ""}`}
          maxLength={LISTING_LIMITS.title}
          placeholder="VD: 2PN góc view hồ, nội thất gỗ mới"
          value={title}
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {errors.title && <span className="field-error" role="alert">{errors.title}</span>}
      </label>

      <div className="field">
        <span className="label">Điểm nổi bật</span>
        {slots.map((i) => (
          <div key={i} style={{ marginTop: i === 0 ? 4 : 6 }}>
            <input
              id={`${idPrefix}-highlights-${i}`}
              className={`input ${errors[`highlights.${i}`] ? styles.invalid : ""}`}
              maxLength={LISTING_LIMITS.highlight}
              placeholder={`Điểm nổi bật ${i + 1}`}
              aria-label={`Điểm nổi bật ${i + 1}`}
              aria-invalid={Boolean(errors[`highlights.${i}`])}
              value={highlights[i] ?? ""}
              onChange={(e) => onChange({ highlights: slots.map((j) => (j === i ? e.target.value : (highlights[j] ?? ""))) })}
            />
            {errors[`highlights.${i}`] && <span className="field-error" role="alert">{errors[`highlights.${i}`]}</span>}
          </div>
        ))}
      </div>

      <label className="field">
        <span className="label">Mô tả</span>
        <textarea
          id={`${idPrefix}-description`}
          className={`input ${errors.description ? styles.invalid : ""}`}
          rows={4}
          maxLength={LISTING_LIMITS.description}
          value={description}
          aria-invalid={Boolean(errors.description)}
          onChange={(e) => onChange({ description: e.target.value })}
          style={{ resize: "vertical" }}
        />
        <span className="muted xs" style={{ marginTop: 4, textAlign: "right" }}>
          {description.length}/{LISTING_LIMITS.description}
        </span>
        {errors.description && <span className="field-error" role="alert">{errors.description}</span>}
      </label>

      <p className="muted xs" style={{ margin: 0 }}>
        Không ghi số điện thoại, link hay giá — giá lấy từ ô Giá thuê.
      </p>
    </fieldset>
  );
}
