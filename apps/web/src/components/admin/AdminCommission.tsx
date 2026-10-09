"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw, Save } from "lucide-react";
import { HostsSubnav } from "@/components/admin/HostsSubnav";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import {
  adminApi,
  useAdminCommission,
  useAdminCommissionAudit,
  useAdminPayouts,
  type AdminFeeAudit,
  type AdminPayoutHost,
} from "@/lib/admin/api";
import { fmtDateTime, vnd } from "@/lib/format";
import styles from "./Admin.module.css";

interface Field {
  key: string;
  title: string;
  help: string;
  unit: "đ" | "×" | "giờ";
  min: number;
  max: number;
  step: number;
}

/** Khoảng min/max trùng FEE_RULES ở backend (admin-fee.service.ts); backend vẫn là nơi kiểm tra cuối. */
const CORE: Field[] = [
  { key: "host_base_viewing_fee", title: "Thù lao dẫn khách theo lượt", help: "Trả cho mỗi ca xem phòng Host hoàn tất.", unit: "đ", min: 30_000, max: 100_000, step: 5_000 },
  { key: "host_deal_commission", title: "Hoa hồng chốt cọc thành công", help: "Trả khi khách cọc giữ chỗ 2.000.000đ qua VietQR.", unit: "đ", min: 200_000, max: 1_000_000, step: 10_000 },
  { key: "host_rating_multiplier_5star", title: "Hệ số thưởng đánh giá cao", help: "Nhân với hoa hồng cho Host có điểm đánh giá trung bình từ 4,8★ trở lên; dưới 4,8★ hoặc chưa có đánh giá thì ×1.", unit: "×", min: 1.1, max: 1.5, step: 0.05 },
  { key: "host_campaign_bonus", title: "Gói thưởng nóng theo chiến dịch", help: "Cộng thêm cho mỗi deal chốt cọc trong giai đoạn kích cầu, tối đa 3 deal/tuần/Host. Đặt 0 để tắt chiến dịch.", unit: "đ", min: 0, max: 1_000_000, step: 10_000 },
];

/** Dành riêng cho Host vai Thẩm định (Sale + Thẩm định): khoản thu nhập thêm so với Sale thường. */
const INSPECTOR: Field[] = [
  { key: "host_inspection_fee", title: "Thù lao thẩm định ký gửi", help: "Trả cho Host vai Thẩm định cho mỗi phiếu thẩm định căn ký gửi đã nộp, dù kết luận đạt hay không đạt. Chưa nhập thì chưa trả.", unit: "đ", min: 50_000, max: 500_000, step: 10_000 },
];

const FIELDS = [...CORE, ...INSPECTOR];
const TITLE = Object.fromEntries(FIELDS.map((f) => [f.key, f.title]));
const UNIT = Object.fromEntries(FIELDS.map((f) => [f.key, f.unit]));

const show = (key: string, v: number | null) => {
  if (v === null) return "—";
  const unit = UNIT[key];
  if (unit === "×") return `×${String(v).replace(".", ",")}`;
  if (unit === "giờ") return `${v}h`;
  return `${vnd(v)}đ`;
};

export function AdminCommission() {
  const config = useAdminCommission();
  const statement = useAdminPayouts();
  const audit = useAdminCommissionAudit();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const configs = useMemo(() => (config.state.status === "ready" ? config.state.data.configs : []), [config.state]);
  const saved = useMemo(() => new Map(configs.map((c) => [c.configKey, c.paramValue])), [configs]);
  const value = (key: string) => (draft[key] !== undefined && draft[key] !== "" ? Number(draft[key]) : saved.get(key) ?? 0);
  const changed = FIELDS.filter((f) => draft[f.key] !== undefined && draft[f.key] !== "" && Number(draft[f.key]) !== saved.get(f.key));

  // Xem trước: một deal chốt cọc thành công của Host từ 4,8★ trở lên, đang trong chiến dịch thưởng nóng.
  const viewingFee = value("host_base_viewing_fee");
  const campaign = value("host_campaign_bonus");
  const dealWithRating = Math.round(value("host_deal_commission") * value("host_rating_multiplier_5star"));
  const sampleDeal = viewingFee + dealWithRating + campaign;

  const rows: AdminPayoutHost[] = statement.state.status === "ready" ? statement.state.data.hosts : [];
  const grandTotal = statement.state.status === "ready" ? statement.state.data.grandTotal : 0;
  const period = statement.state.status === "ready" ? statement.state.data.period : "";

  async function save() {
    if (changed.length === 0) return;
    if (!reason.trim()) {
      toast("Nhập lý do thay đổi để lưu vết kiểm toán.");
      return;
    }
    setSaving(true);
    for (const field of changed) {
      const res = await adminApi.updateCommission(field.key, Number(draft[field.key]), reason.trim());
      if (!res.ok) {
        setSaving(false);
        config.reload();
        audit.reload();
        toast(res.message || `Không lưu được “${field.title}”.`);
        return;
      }
    }
    setSaving(false);
    setDraft({});
    setReason("");
    config.reload();
    audit.reload();
    toast("Đã lưu. Áp dụng ngay cho các khoản phát sinh mới.", "success");
  }

  async function sweepNow() {
    setSweeping(true);
    const res = await adminApi.sweepPayouts();
    setSweeping(false);
    if (!res.ok) return toast(res.message || "Không cập nhật được thu nhập.");
    statement.reload();
    toast(res.data.created > 0 ? `Đã ghi thêm ${res.data.created} khoản thu nhập.` : "Không có khoản mới cần ghi.", "success");
  }

  function exportCsv() {
    const lines = [
      ["Field Host", "Mã Host", "Đánh giá", "Lượt dẫn", "Thù lao lượt", "Deal", "Hoa hồng", "Thưởng đánh giá", "Thưởng nóng", "Thù lao thẩm định", "Tổng thực nhận", "Tuần ISO"],
      ...rows.map((r) => [r.fullName || "", r.hostId, r.rating ?? "", r.viewings, r.viewingFee, r.deals, r.commission, r.ratingBonus, r.campaignBonus, r.inspectionFee, r.total, period]),
    ].map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bang-ke-host-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Đã xuất bảng kê thanh toán tuần.", "success");
  }

  const renderField = (f: Field) => {
    const current = saved.get(f.key);
    return (
      <div key={f.key} className={styles.fee}>
        <div>
          <h4>{f.title}</h4>
          <p className="muted small">
            {f.help} Khoảng {show(f.key, f.min)}–{show(f.key, f.max)}.
          </p>
        </div>
        <label className={styles.suffix}>
          <span className="sr-only">{f.title}</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min={f.min}
            max={f.max}
            step={f.step}
            placeholder={current === undefined ? "Chưa cấu hình" : undefined}
            value={draft[f.key] ?? (current === undefined ? "" : String(current))}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
          />
          <span>{f.unit}</span>
        </label>
      </div>
    );
  };

  const payoutColumns: DataTableColumn<AdminPayoutHost>[] = [
    {
      key: "host",
      header: "Field Host",
      render: (r) => (
        <>
          <b>{r.fullName || "Host"}</b>
          <span className="muted xs" style={{ display: "block" }}>
            {r.rating === null ? "Chưa có đánh giá" : `${String(r.rating).replace(".", ",")}★`}
          </span>
        </>
      ),
    },
    { key: "viewings", header: "Lượt dẫn", align: "right", render: (r) => r.viewings },
    { key: "viewingFee", header: "Thù lao lượt", align: "right", render: (r) => vnd(r.viewingFee) },
    { key: "deals", header: "Deal", align: "right", render: (r) => r.deals },
    { key: "commission", header: "Hoa hồng", align: "right", render: (r) => vnd(r.commission) },
    { key: "ratingBonus", header: "Thưởng đánh giá", align: "right", render: (r) => vnd(r.ratingBonus) },
    { key: "campaignBonus", header: "Thưởng nóng", align: "right", render: (r) => vnd(r.campaignBonus) },
    {
      key: "inspection",
      header: "Thẩm định",
      align: "right",
      render: (r) =>
        r.roles.includes("inspector") ? (
          <>
            {vnd(r.inspectionFee)}
            <span className="muted xs" style={{ display: "block" }}>{r.inspections} phiếu</span>
          </>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { key: "total", header: "Thực nhận", align: "right", render: (r) => <b>{vnd(r.total)}đ</b> },
  ];

  const auditColumns: DataTableColumn<AdminFeeAudit>[] = [
    { key: "at", header: "Thời điểm", render: (a) => <span className="tnum">{fmtDateTime(a.at)}</span> },
    { key: "by", header: "Người sửa", render: (a) => a.by },
    { key: "field", header: "Tham số", render: (a) => TITLE[a.configKey] ?? a.configKey },
    { key: "from", header: "Giá trị cũ", align: "right", render: (a) => show(a.configKey, a.from) },
    { key: "to", header: "Giá trị mới", align: "right", render: (a) => <b>{show(a.configKey, a.to)}</b> },
    { key: "reason", header: "Lý do", render: (a) => <span className="muted small">{a.reason || "—"}</span> },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Biến phí Field Host"
        description="Điều chỉnh thù lao theo mùa vụ mà không cần sửa mã nguồn. Thay đổi có hiệu lực ngay và được lưu vết."
        actions={
          <div className={styles.headActions}>
            <button type="button" className="btn btn-quiet" disabled={saving || changed.length === 0} onClick={() => setDraft({})}>
              Hoàn tác
            </button>
            <button type="button" className="btn btn-primary" disabled={saving || changed.length === 0} onClick={() => void save()}>
              <Save size={16} /> Lưu thay đổi{changed.length > 0 ? ` (${changed.length})` : ""}
            </button>
          </div>
        }
      />

      <HostsSubnav />

      {config.state.status === "loading" ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : config.state.status === "error" ? (
        <div role="alert" className="card">
          <p>{config.state.message}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={config.reload}>
            Thử lại
          </button>
        </div>
      ) : (
        <div className={styles.split}>
          <section className={`card ${styles.padCard}`} aria-label="Tham số biến phí">
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Host Sale</h3>
            {CORE.map(renderField)}
            <h3 style={{ fontSize: 15, margin: "18px 0 2px" }}>Host vai Thẩm định</h3>
            {INSPECTOR.map(renderField)}
            {changed.length > 0 && (
              <label className="field" style={{ marginTop: 16 }}>
                <span className="label">Lý do thay đổi (bắt buộc, lưu vào nhật ký)</span>
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Vd: Kích cầu mùa thấp điểm tháng 10" />
              </label>
            )}
          </section>

          <section className={`card ${styles.padCard}`} aria-label="Xem trước">
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Một deal thành công, Host từ 4,8★ nhận</h3>
            <p className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>
              {vnd(sampleDeal)}đ
            </p>
            <dl className={styles.reqMeta} style={{ marginTop: 14 }}>
              <div>
                <dt>Thù lao lượt dẫn</dt>
                <dd>{vnd(viewingFee)}đ</dd>
              </div>
              <div>
                <dt>Hoa hồng × hệ số đánh giá</dt>
                <dd>{vnd(dealWithRating)}đ</dd>
              </div>
              <div>
                <dt>Thưởng nóng</dt>
                <dd>{vnd(campaign)}đ</dd>
              </div>
            </dl>
            <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid var(--line)" }} />
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Một phiếu thẩm định, Host vai Thẩm định nhận thêm</h3>
            <p className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
              {value("host_inspection_fee") > 0 ? `${vnd(value("host_inspection_fee"))}đ` : "Chưa nhập"}
            </p>
            {changed.length > 0 && (
              <p className="small" style={{ marginTop: 12, color: "var(--amber-600)" }}>
                Đang xem trước, chưa lưu.
              </p>
            )}
          </section>
        </div>
      )}

      <section className={`card ${styles.tableCard}`} aria-label="Bảng kê thanh toán tuần">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 20px 6px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 18 }}>Bảng kê thanh toán tuần {period || "này"}</h3>
            <p className="muted small">Tổng chi trả {vnd(grandTotal)}đ · đối soát và chuyển khoản vào Chủ nhật</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-quiet" disabled={sweeping} onClick={() => void sweepNow()} title="Hệ thống tự cập nhật mỗi 5 phút; bấm để cập nhật ngay">
              <RefreshCw size={16} className={sweeping ? "animate-spin" : ""} /> Cập nhật thu nhập
            </button>
            <button type="button" className="btn btn-quiet" disabled={statement.state.status !== "ready" || rows.length === 0} onClick={exportCsv}>
              <Download size={16} /> Xuất CSV
            </button>
          </div>
        </div>
        {statement.state.status === "error" ? (
          <p role="alert" className="small" style={{ padding: 20 }}>
            {statement.state.message}{" "}
            <button type="button" className="link" onClick={statement.reload}>
              Thử lại
            </button>
          </p>
        ) : statement.state.status === "loading" ? (
          <div className="skeleton" style={{ height: 120, margin: 20 }} />
        ) : (
          <DataTable columns={payoutColumns} rows={rows} empty={<span className="muted">Chưa có khoản thu nhập nào trong tuần này.</span>} />
        )}
      </section>

      <section className={`card ${styles.tableCard}`} aria-label="Nhật ký thay đổi">
        <h3 style={{ fontSize: 18, padding: "18px 20px 6px" }}>Nhật ký thay đổi cấu hình</h3>
        {audit.state.status === "error" ? (
          <p role="alert" className="small" style={{ padding: 20 }}>
            {audit.state.message}
          </p>
        ) : audit.state.status === "loading" ? (
          <div className="skeleton" style={{ height: 120, margin: 20 }} />
        ) : (
          <DataTable columns={auditColumns} rows={audit.state.data} empty={<span className="muted">Chưa có thay đổi nào.</span>} />
        )}
      </section>
    </div>
  );
}
