"use client";

import { Download } from "lucide-react";
import { Columns } from "@/components/charts/Columns";
import { StatTile } from "@/components/charts/StatTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { DEMO_USERS } from "@/lib/mock/auth";
import { RATES } from "@/lib/mock/cost";
import { vnd, vndShort } from "@/lib/mock/format";
import { activeLease, landlordUnits, monthlyRent, unitStatus } from "@/lib/mock/selectors";
import { LANDLORD_HISTORY, SERVICE_FEE_RATE } from "@/lib/mock/stats";
import { useMock } from "@/lib/mock/store";
import { unitAddress } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;

export function LandlordFinance() {
  const state = useMock();
  const now = useNow(60_000);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 420 }} />;

  const units = landlordUnits(state, LID);
  const gross = monthlyRent(state, LID);
  const fee = Math.round(gross * SERVICE_FEE_RATE);
  const net = gross - fee;
  const history = LANDLORD_HISTORY[LID];
  const labels = Array.from({ length: history.length + 1 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (history.length - i), 1);
    return { short: `T${d.getMonth() + 1}`, long: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` };
  });
  const series = [...history, gross].map((v, i) => ({ label: labels[i].short, value: Math.round(v * (1 - SERVICE_FEE_RATE)) }));
  const total6 = series.reduce((s, x) => s + x.value, 0);

  const rows = units.map((u) => {
    const s = unitStatus(state, u);
    const l = activeLease(state, u.id);
    const rent = l?.lease?.rent ?? 0;
    const escrow = s === "rented" ? (l?.lease?.rent ?? u.rent) : s === "holding" ? RATES.holdingDeposit : 0;
    return { u, s, rent, fee: Math.round(rent * SERVICE_FEE_RATE), escrow };
  });
  const escrowTotal = rows.reduce((sum, r) => sum + r.escrow, 0);

  const exportCsv = () => {
    const csv = [["Căn hộ", "Trạng thái", "Tiền thuê", "Phí dịch vụ", "Thực nhận", "Cọc đang giữ hộ"], ...rows.map((r) => [unitAddress(r.u), r.s, r.rent, r.fee, r.rent - r.fee, r.escrow])].map((r) => r.map((c) => `"${c}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "khoan-thu-chu-nha.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Đã tải bảng kê tháng này", "success");
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Khoản thu"
        description="Tiền thuê thu về, phí dịch vụ ký gửi và tiền cọc đang được giữ hộ theo hợp đồng."
        actions={
          <button type="button" className="btn btn-quiet" onClick={exportCsv}>
            <Download size={16} /> Tải bảng kê
          </button>
        }
      />

      <div className={styles.kpis}>
        <StatTile hero label="Thực nhận tháng này" value={vndShort(net)} delta={{ text: `đã trừ phí dịch vụ ${vndShort(fee)}`, tone: "flat" }} spark={series.map((s) => s.value)} />
        <StatTile label="Tổng thực nhận 6 tháng" value={vndShort(total6)} />
        <StatTile label="Cọc đang giữ hộ" value={vndShort(escrowTotal)} delta={{ text: "hoàn 100% khi thanh lý", tone: "flat" }} />
        <StatTile label="Phí dịch vụ ký gửi" value={`${Math.round(SERVICE_FEE_RATE * 100)}`} unit="%" delta={{ text: "mức mô phỏng của bản demo", tone: "flat" }} />
      </div>

      <Columns title="Thực nhận mỗi tháng" subtitle="Tiền thuê sau phí dịch vụ; tháng hiện tại được nhấn" data={series} axisFormat={(v) => (v === 0 ? "0" : `${v / 1_000_000}tr`)} valueFormat={(v) => `${vnd(v)}đ`} seriesName="Thực nhận" />

      <section className="card" style={{ overflow: "hidden" }} aria-label="Chi tiết theo căn">
        <h2 className={styles.h2} style={{ padding: "18px 20px 0" }}>Chi tiết theo căn, tháng này</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows}>
            <thead>
              <tr>
                <th scope="col">Căn hộ</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className={styles.r}>Tiền thuê</th>
                <th scope="col" className={styles.r}>Phí dịch vụ</th>
                <th scope="col" className={styles.r}>Thực nhận</th>
                <th scope="col" className={styles.r}>Cọc giữ hộ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u.id}>
                  <td>
                    <b>{unitAddress(r.u)}</b>
                  </td>
                  <td>
                    <span className={`badge ${r.s === "rented" ? "badge-ink" : r.s === "holding" ? "badge-amber-soft" : "badge-kelp"}`}>{{ rented: "Đang cho thuê", holding: "Đang giữ căn", available: "Đang trống" }[r.s]}</span>
                  </td>
                  <td className={`${styles.r} tnum`}>{r.rent ? vnd(r.rent) : "—"}</td>
                  <td className={`${styles.r} tnum`}>{r.fee ? `−${vnd(r.fee)}` : "—"}</td>
                  <td className={`${styles.r} tnum`}>
                    <b>{r.rent ? vnd(r.rent - r.fee) : "—"}</b>
                  </td>
                  <td className={`${styles.r} tnum`}>{r.escrow ? vnd(r.escrow) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Tổng</td>
                <td className={`${styles.r} tnum`}>{vnd(gross)}</td>
                <td className={`${styles.r} tnum`}>−{vnd(fee)}</td>
                <td className={`${styles.r} tnum`}>{vnd(net)}</td>
                <td className={`${styles.r} tnum`}>{vnd(escrowTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card" style={{ overflow: "hidden" }} aria-label="Lịch sử chi trả">
        <h2 className={styles.h2} style={{ padding: "18px 20px 0" }}>Lịch sử chi trả</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows} style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th scope="col">Kỳ</th>
                <th scope="col" className={styles.r}>Thực nhận</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((s, i) => {
                const idx = series.length - 1 - i;
                return (
                  <tr key={labels[idx].long}>
                    <td>{labels[idx].long}</td>
                    <td className={`${styles.r} tnum`}>
                      <b>{vnd(s.value)}đ</b>
                    </td>
                    <td>
                      <span className={`badge ${idx === series.length - 1 ? "badge-amber-soft" : "badge-kelp"}`}>{idx === series.length - 1 ? "Đang tích luỹ" : "Đã chuyển khoản"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
