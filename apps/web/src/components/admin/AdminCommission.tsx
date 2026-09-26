"use client";

import { useState } from "react";
import { Download, Save } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { updateFee } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDateTime, vnd } from "@/lib/mock/format";
import { hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { FeeConfig } from "@/lib/mock/types";
import { HOSTS } from "@/lib/mock/units";
import styles from "./Admin.module.css";

const FIELDS: { key: keyof FeeConfig; title: string; help: string; unit: string; step: number; min: number; max: number }[] = [
  { key: "baseViewingFee", title: "Thù lao dẫn khách theo lượt", help: "Trả cho mỗi ca xem phòng Host hoàn tất (base_viewing_fee).", unit: "đ", step: 5_000, min: 0, max: 500_000 },
  { key: "dealCommission", title: "Hoa hồng chốt cọc thành công", help: "Trả khi khách cọc 2.000.000đ và ký hợp đồng (deal_commission).", unit: "đ", step: 10_000, min: 0, max: 2_000_000 },
  { key: "ratingMultiplier", title: "Hệ số thưởng đánh giá sao", help: "Nhân với hoa hồng cho Host từ 4,8 sao trở lên (rating_multiplier).", unit: "×", step: 0.05, min: 1, max: 2 },
  { key: "campaignBonus", title: "Gói thưởng nóng theo chiến dịch", help: "Cộng thêm mỗi deal trong giai đoạn kích cầu, tối đa 3 deal/tuần (campaign_bonus).", unit: "đ", step: 10_000, min: 0, max: 1_000_000 },
];

const LABEL: Record<keyof FeeConfig, string> = {
  baseViewingFee: "Thù lao dẫn khách",
  dealCommission: "Hoa hồng chốt cọc",
  ratingMultiplier: "Hệ số đánh giá sao",
  campaignBonus: "Thưởng nóng",
};

const show = (k: keyof FeeConfig, v: number) => (k === "ratingMultiplier" ? `×${String(v).replace(".", ",")}` : `${vnd(v)}đ`);

export function AdminCommission() {
  const state = useMock();
  const [draft, setDraft] = useState<Partial<Record<keyof FeeConfig, string>>>({});
  if (!state.ready) return <div className="skeleton" style={{ height: 360 }} />;

  const fees = state.fees;
  const value = (k: keyof FeeConfig) => (draft[k] !== undefined ? Number(draft[k]) : fees[k]);
  const changed = FIELDS.filter((f) => draft[f.key] !== undefined && Number(draft[f.key]) !== fees[f.key]);
  const preview = { ...fees, ...Object.fromEntries(FIELDS.map((f) => [f.key, value(f.key)])) } as FeeConfig;
  const sampleDeal = Math.round(preview.dealCommission * preview.ratingMultiplier) + preview.baseViewingFee + preview.campaignBonus;

  const save = () => {
    for (const f of changed) updateFee(f.key, Number(draft[f.key]), DEMO_USERS.admin.name);
    setDraft({});
    toast("Đã lưu. Áp dụng ngay cho ticket phát sinh mới.", "success");
  };

  const payouts = HOSTS.map((h) => ({ host: h, e: hostEarnings(state, h, preview) }));
  const totalPayout = payouts.reduce((s, p) => s + p.e.total, 0);

  const exportCsv = () => {
    const rows = [["Field Host", "Số điện thoại", "Lượt dẫn", "Thù lao lượt", "Deal", "Hoa hồng", "Thưởng nóng", "Tổng thực nhận"], ...payouts.map(({ host, e }) => [host.name, host.phone, e.viewings, e.viewingFee, e.deals, e.commission, e.bonus, e.total])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "bang-ke-thanh-toan-tuan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Đã xuất bảng kê thanh toán tuần", "success");
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Biến phí Field Host</h1>
          <p className="muted">Điều chỉnh thù lao theo mùa vụ mà không cần sửa mã nguồn. Thay đổi có hiệu lực ngay và được lưu vết.</p>
        </div>
        <div className={styles.headActions}>
          <button type="button" className="btn btn-quiet" disabled={changed.length === 0} onClick={() => setDraft({})}>
            Hoàn tác
          </button>
          <button type="button" className="btn btn-primary" disabled={changed.length === 0} onClick={save}>
            <Save size={16} /> Lưu thay đổi{changed.length > 0 ? ` (${changed.length})` : ""}
          </button>
        </div>
      </header>

      <div className={styles.split}>
        <section className={`card ${styles.padCard}`} aria-label="Bốn tham số biến phí">
          {FIELDS.map((f) => (
            <div key={f.key} className={styles.fee}>
              <div>
                <h4>{f.title}</h4>
                <p className="muted small">{f.help}</p>
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
                  value={draft[f.key] ?? String(fees[f.key])}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
                <span>{f.unit}</span>
              </label>
            </div>
          ))}
        </section>

        <section className={`card ${styles.padCard}`} aria-label="Xem trước">
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>Một deal thành công, Host từ 4,8 sao nhận</h3>
          <p className={`num`} style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>
            {vnd(sampleDeal)}đ
          </p>
          <dl className={styles.reqMeta} style={{ marginTop: 14 }}>
            <div>
              <dt>Thù lao lượt dẫn</dt>
              <dd>{vnd(preview.baseViewingFee)}đ</dd>
            </div>
            <div>
              <dt>Hoa hồng × hệ số</dt>
              <dd>{vnd(Math.round(preview.dealCommission * preview.ratingMultiplier))}đ</dd>
            </div>
            <div>
              <dt>Thưởng nóng</dt>
              <dd>{vnd(preview.campaignBonus)}đ</dd>
            </div>
          </dl>
          {changed.length > 0 && <p className="small" style={{ marginTop: 12, color: "var(--amber-600)" }}>Đang xem trước, chưa lưu.</p>}
        </section>
      </div>

      <section className={`card ${styles.tableCard}`} aria-label="Bảng kê thanh toán tuần">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 20px 6px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 18 }}>Bảng kê thanh toán tuần này</h3>
            <p className="muted small">Tổng chi trả {vnd(totalPayout)}đ · đối soát và chuyển khoản vào Chủ nhật</p>
          </div>
          <button type="button" className="btn btn-quiet" onClick={exportCsv}>
            <Download size={16} /> Xuất CSV
          </button>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">Field Host</th>
                <th scope="col" className={styles.right}>Lượt dẫn</th>
                <th scope="col" className={styles.right}>Thù lao lượt</th>
                <th scope="col" className={styles.right}>Deal</th>
                <th scope="col" className={styles.right}>Hoa hồng</th>
                <th scope="col" className={styles.right}>Thưởng nóng</th>
                <th scope="col" className={styles.right}>Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(({ host, e }) => (
                <tr key={host.id}>
                  <td>
                    <b>{host.name}</b>
                    <span className="muted xs" style={{ display: "block" }}>
                      {String(host.rating).replace(".", ",")}★{e.multiplier > 1 ? ` · ×${String(e.multiplier).replace(".", ",")}` : ""}
                    </span>
                  </td>
                  <td className={`${styles.right} tnum`}>{e.viewings}</td>
                  <td className={`${styles.right} tnum`}>{vnd(e.viewingFee)}</td>
                  <td className={`${styles.right} tnum`}>{e.deals}</td>
                  <td className={`${styles.right} tnum`}>{vnd(e.commission)}</td>
                  <td className={`${styles.right} tnum`}>{vnd(e.bonus)}</td>
                  <td className={`${styles.right} tnum`}>
                    <b>{vnd(e.total)}đ</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`card ${styles.tableCard}`} aria-label="Nhật ký thay đổi">
        <h3 style={{ fontSize: 18, padding: "18px 20px 6px" }}>Nhật ký thay đổi cấu hình</h3>
        <div className={styles.tableScroll}>
          <table className={styles.tbl} style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th scope="col">Thời điểm</th>
                <th scope="col">Người sửa</th>
                <th scope="col">Tham số</th>
                <th scope="col" className={styles.right}>Giá trị cũ</th>
                <th scope="col" className={styles.right}>Giá trị mới</th>
              </tr>
            </thead>
            <tbody>
              {state.feeAudit.map((a) => (
                <tr key={a.id}>
                  <td className="tnum">{fmtDateTime(a.at)}</td>
                  <td>{a.by}</td>
                  <td>{LABEL[a.field]}</td>
                  <td className={`${styles.right} tnum`}>{show(a.field, a.from)}</td>
                  <td className={`${styles.right} tnum`}>
                    <b>{show(a.field, a.to)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
