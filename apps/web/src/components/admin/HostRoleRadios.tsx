"use client";

import { ROLE_CHOICE_LABEL, type HostRoleChoice } from "@/lib/admin/hosts";

const HINT: Record<HostRoleChoice, string> = {
  sale: "Nhận lịch xem, đón khách tại sảnh phân khu, dùng thẻ cư dân thang máy dẫn lên phòng và cấp mã cửa.",
  sale_inspector: "Làm được mọi việc của Sale, và nhận ticket ký gửi để thẩm định 32 hạng mục, đề xuất giá/cọc cho chủ nhà.",
};

/** Hai lựa chọn vai (B5: Thẩm định luôn kèm Sale). Gửi `['sale']` hoặc `['sale','inspector']`. */
export function HostRoleRadios({ name, value, onChange }: { name: string; value: HostRoleChoice; onChange: (v: HostRoleChoice) => void }) {
  return (
    <div role="radiogroup" aria-label="Vai đảm nhiệm" style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      {(Object.keys(ROLE_CHOICE_LABEL) as HostRoleChoice[]).map((c) => (
        <label key={c} className="check" style={{ alignItems: "flex-start", gap: 10 }}>
          <input type="radio" name={name} value={c} checked={value === c} onChange={() => onChange(c)} style={{ marginTop: 3 }} />
          <div>
            <strong>{ROLE_CHOICE_LABEL[c]}</strong>
            <p className="muted small" style={{ margin: "2px 0 0" }}>
              {HINT[c]}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}
