"use client";

import { useMemo, useState } from "react";
import { Download, Save } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { adminApi, useAdminCommission, useAdminPayouts, type AdminPayoutHost } from "@/lib/admin/api";
import { vnd } from "@/lib/format";
import styles from "./Admin.module.css";

const FIELDS = [
  { key: "host_base_viewing_fee", title: "Thù lao dẫn khách theo lượt", unit: "đ", min: 30_000, max: 100_000, step: 5_000 },
  { key: "host_deal_commission", title: "Hoa hồng cọc thành công", unit: "đ", min: 200_000, max: 1_000_000, step: 10_000 },
  { key: "host_rating_multiplier_5star", title: "Thưởng đánh giá 5 sao", unit: "×", min: 1.1, max: 1.5, step: 0.05 },
  { key: "host_peak_hour_multiplier", title: "Hệ số khung giờ cao điểm", unit: "×", min: 1.1, max: 1.5, step: 0.05 },
] as const;

export function AdminCommission() {
  const config = useAdminCommission();
  const statement = useAdminPayouts();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const configs = useMemo(() => config.state.status === "ready" ? config.state.data.configs : [], [config.state]);
  const valueByKey = useMemo(() => new Map(configs.map((item) => [item.configKey, item])), [configs]);
  const changed = FIELDS.filter((field) => {
    const current = valueByKey.get(field.key)?.paramValue;
    return draft[field.key] !== undefined && Number(draft[field.key]) !== current;
  });
  const rows: AdminPayoutHost[] = statement.state.status === "ready" ? statement.state.data.hosts : [];
  const currentTotal = statement.state.status === "ready" ? statement.state.data.grandTotal : 0;
  const period = statement.state.status === "ready" ? statement.state.data.period : "";

  async function save() {
    if (changed.length === 0) return;
    if (!reason.trim()) {
      toast("Vui lòng nhập lý do thay đổi.");
      return;
    }
    setSaving(true);
    for (const field of changed) {
      const res = await adminApi.updateCommission(field.key, Number(draft[field.key]), reason.trim());
      if (!res.ok) {
        setSaving(false);
        config.reload();
        toast(res.message || `Không thể cập nhật ${field.title}.`);
        return;
      }
    }
    setSaving(false);
    setDraft({});
    setReason("");
    config.reload();
    toast("Đã lưu cấu hình biến phí vào hệ thống.", "success");
  }

  function exportCsv() {
    if (statement.state.status !== "ready") return;
    const lines = [
      ["Field Host", "Mã Host", "Số khoản", "Tổng thu nhập", "Tuần ISO"],
      ...rows.map((row) => [row.fullName || "", row.hostId, row.count, row.total, period]),
    ].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bang-ke-host-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const payoutColumns: DataTableColumn<AdminPayoutHost>[] = [
    { key: "host", header: "Field Host", render: (row) => <><b>{row.fullName || "Host"}</b><span className="muted xs" style={{ display: "block" }}>{row.hostId}</span></> },
    { key: "count", header: "Số khoản", align: "right", render: (row) => row.count },
    { key: "total", header: "Tổng thực nhận", align: "right", render: (row) => <b>{vnd(row.total)}đ</b> },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Biến phí Field Host"
        description="Các mức phí và bảng kê được đọc từ cơ sở dữ liệu; mọi thay đổi được lưu cùng lý do kiểm toán."
        actions={<button type="button" className="btn btn-primary" disabled={saving || changed.length === 0} onClick={() => void save()}><Save size={16} /> Lưu thay đổi{changed.length ? ` (${changed.length})` : ""}</button>}
      />

      <section className={`card ${styles.padCard}`} aria-label="Cấu hình biến phí">
        {config.state.status === "loading" ? <div className="skeleton" style={{ height: 280 }} /> : config.state.status === "error" ? (
          <div role="alert"><p>{config.state.message}</p><button type="button" className="btn btn-secondary btn-sm" onClick={config.reload}>Thử lại</button></div>
        ) : FIELDS.map((field) => {
          const current = valueByKey.get(field.key);
          return <div key={field.key} className={styles.fee}>
            <div><h4>{field.title}</h4><p className="muted small">{field.key} · khoảng {field.min}–{field.max} {field.unit}</p></div>
            <label className={styles.suffix}>
              <span className="sr-only">{field.title}</span>
              <input className="input" type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step} disabled={!current} value={draft[field.key] ?? (current ? String(current.paramValue) : "")} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} />
              <span>{field.unit}</span>
            </label>
          </div>;
        })}
        {config.state.status === "ready" && changed.length > 0 && <label className="field" style={{ marginTop: 16 }}>
          <span className="label">Lý do thay đổi</span>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </label>}
      </section>

      <section className={`card ${styles.tableCard}`} aria-label="Bảng kê thanh toán theo tuần">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 20px 6px", flexWrap: "wrap" }}>
          <div><h3 style={{ fontSize: 18 }}>Bảng kê tuần {period || "đang tải"}</h3><p className="muted small">Tổng các khoản ghi nhận: {vnd(currentTotal)}đ</p></div>
          <button type="button" className="btn btn-quiet" disabled={statement.state.status !== "ready"} onClick={exportCsv}><Download size={16} /> Xuất CSV</button>
        </div>
        {statement.state.status === "error" ? <p role="alert" className="small" style={{ padding: 20 }}>{statement.state.message} <button type="button" className="link" onClick={statement.reload}>Thử lại</button></p> : statement.state.status === "loading" ? <div className="skeleton" style={{ height: 120, margin: 20 }} /> : <DataTable columns={payoutColumns} rows={rows} empty={<span className="muted">Chưa có khoản thu nhập trong tuần này.</span>} />}
      </section>
    </div>
  );
}
