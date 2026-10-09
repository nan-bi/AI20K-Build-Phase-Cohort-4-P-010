"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { adminApi, useAdminLandlordFee } from "@/lib/admin/api";
import { vnd } from "@/lib/format";

/** Phí dịch vụ ký gửi thu của chủ nhà (% tiền thuê, khoá `landlord_service_fee_rate`). */
export function LandlordFeeSettings() {
  const fee = useAdminLandlordFee();
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (fee.state.status !== "ready") return;
    const percent = Number(value);
    const { min, max } = fee.state.data;
    if (value === "" || !Number.isFinite(percent) || percent < min || percent > max || Math.round(percent * 100) / 100 !== percent) {
      return toast(`Phí dịch vụ phải từ ${min}% đến ${max}% (tối đa 2 chữ số thập phân).`);
    }
    if (!reason.trim()) return toast("Vui lòng nhập lý do thay đổi.");
    setSaving(true);
    const res = await adminApi.updateLandlordFee(percent, reason.trim());
    setSaving(false);
    if (!res.ok) return toast(res.message || "Không thể cập nhật phí dịch vụ.");
    setValue("");
    setReason("");
    fee.reload();
    toast("Đã lưu phí dịch vụ ký gửi.", "success");
  }

  return (
    <Section
      title="Phí dịch vụ ký gửi (chủ nhà)"
      description="Tỷ lệ % trên tiền thuê tháng, trừ vào khoản chủ nhà nhận khi căn có khách thuê; căn trống thì không thu. Chủ nhà thấy mức này ở màn Khoản thu và khi ký gửi."
    >
      {fee.state.status === "loading" ? (
        <div className="skeleton" style={{ height: 110, maxWidth: 520 }} />
      ) : fee.state.status === "error" ? (
        <div role="alert">
          <p>{fee.state.message}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fee.reload}>
            Thử lại
          </button>
        </div>
      ) : (
        <form onSubmit={save} style={{ maxWidth: 520, display: "grid", gap: 10 }}>
          <p>
            Hiện tại: <b>{fee.state.data.percent}%</b>{" "}
            <span className="muted small">
              {fee.state.data.source === "default" ? "(mức tạm, Admin chưa cấu hình)" : "(do Admin cấu hình)"}
            </span>
          </p>
          <label className="field">
            <span className="label">Mức mới (% tiền thuê, {fee.state.data.min}–{fee.state.data.max})</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                min={fee.state.data.min}
                max={fee.state.data.max}
                step={0.5}
                className="input"
                style={{ width: 120 }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={String(fee.state.data.percent)}
              />
              <span className="small muted">%</span>
            </div>
          </label>
          {value !== "" && Number.isFinite(Number(value)) && (
            <p className="muted small">
              Ví dụ căn thuê 10.000.000đ/tháng: phí {vnd(Math.round((10_000_000 * Number(value)) / 100))}đ, chủ nhà nhận {vnd(10_000_000 - Math.round((10_000_000 * Number(value)) / 100))}đ.
            </p>
          )}
          <label className="field">
            <span className="label">Lý do thay đổi</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="VD: Chốt mức phí quý 4" />
          </label>
          <div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || value === ""}>
              {saving ? "Đang lưu…" : "Lưu phí dịch vụ"}
            </button>
          </div>
          <p className="muted xs">Màn của chủ nhà cập nhật trong tối đa 1 phút. Mức mới áp cho mọi khoản thu hiển thị từ lúc đó, kể cả căn đang cho thuê.</p>
        </form>
      )}
    </Section>
  );
}
