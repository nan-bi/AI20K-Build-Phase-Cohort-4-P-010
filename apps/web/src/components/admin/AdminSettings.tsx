"use client";

import { useState } from "react";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { useSession } from "@/lib/auth/client";
import { adminApi, useAdminHoldPolicy } from "@/lib/admin/api";
import styles from "./Admin.module.css";

export function AdminSettings() {
  const session = useSession();
  const policy = useAdminHoldPolicy();
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const currentDays = policy.state.status === "ready" ? policy.state.data.holdingDurationDays : null;
  const inputDays = days || (currentDays === null ? "" : String(currentDays));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(inputDays);
    if (!Number.isInteger(value) || value < 1 || value > 14) {
      toast("Thời hạn giữ chỗ phải từ 1 đến 14 ngày.");
      return;
    }
    if (!reason.trim()) {
      toast("Vui lòng nhập lý do thay đổi.");
      return;
    }
    setSaving(true);
    const res = await adminApi.updateHoldPolicy(value, reason.trim());
    setSaving(false);
    if (!res.ok) {
      toast(res.message || "Không thể cập nhật thời hạn giữ chỗ.");
      return;
    }
    setDays("");
    setReason("");
    policy.reload();
    toast("Đã lưu thời hạn giữ chỗ vào hệ thống.", "success");
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Cài đặt" description="Thông tin phiên quản trị và tham số vận hành lấy từ hệ thống." />

      <Section title="Tài khoản quản trị">
        <KeyValue
          items={[
            { label: "Họ và tên", value: session.user?.fullName || "—" },
            { label: "Email", value: session.user?.email || "—" },
            { label: "Vai trò", value: session.user?.portal || "—" },
          ]}
        />
      </Section>

      <Section title="Thời hạn giữ chỗ toàn sàn">
        {policy.state.status === "loading" ? (
          <div className="skeleton" style={{ height: 110, maxWidth: 520 }} />
        ) : policy.state.status === "error" ? (
          <div role="alert">
            <p>{policy.state.message}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={policy.reload}>Thử lại</button>
          </div>
        ) : (
          <form onSubmit={save} style={{ maxWidth: 520, display: "grid", gap: 10 }}>
            <label className="field">
              <span className="label">Thời gian mặc định (1–14 ngày)</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  max={14}
                  step={1}
                  className="input"
                  value={inputDays}
                  onChange={(e) => setDays(e.target.value)}
                  style={{ width: 120 }}
                  required
                />
                <span className="small muted">ngày · hiện tại {currentDays} ngày ({policy.state.data.defaultHours} giờ)</span>
              </div>
            </label>
            <label className="field">
              <span className="label">Lý do thay đổi</span>
              <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
            </label>
            <div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving || Number(inputDays) === currentDays}>
                {saving ? "Đang lưu…" : "Lưu cài đặt"}
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
}
