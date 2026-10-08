"use client";

import { LISTING_LIMITS } from "@/lib/units/listing-text";
import styles from "./Consign.module.css";

interface Props {
  highlights: string[];
  /** Lỗi theo ô: `highlights.<i>`. */
  errors: Record<string, string>;
  onChange: (patch: { highlights: string[] }) => void;
  /** Tiền tố id ô nhập (màn thẩm định dùng `insp-listing` để cuộn tới ô lỗi). */
  idPrefix?: string;
}

/** Khối "Giới thiệu căn": 3 điểm nổi bật (≤ 60 ký tự). Nội dung này hiện công khai nên CẤM SĐT/link/giá. */
export function ListingFields({ highlights, errors, onChange, idPrefix = "listing" }: Props) {
  const slots = [0, 1, 2];
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: "var(--s-4) 0 0" }}>
      <legend className="label" style={{ padding: 0 }}>
        Điểm nổi bật của căn (không bắt buộc)
      </legend>

      <div className="field">
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

      <p className="muted xs" style={{ margin: 0 }}>
        Không ghi số điện thoại, link hay giá — giá lấy từ ô Giá thuê.
      </p>
    </fieldset>
  );
}
