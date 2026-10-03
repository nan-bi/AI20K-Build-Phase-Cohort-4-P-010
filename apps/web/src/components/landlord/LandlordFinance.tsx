"use client";

import { Download } from "lucide-react";
import { Columns } from "@/components/charts/Columns";
import { StatTile } from "@/components/charts/StatTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { vnd, vndShort } from "@/lib/mock/format";
import { queries } from "@/lib/landlord/queries";
import { UNIT_STATUS_META, axisMillions } from "@/lib/landlord/labels";
import type { Finance } from "@/lib/landlord/types";
import { useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

export function LandlordFinance() {
  const query = useLandlordQuery(queries.finance);
  return (
    <div className={styles.page}>
      <QueryView query={query} skeleton="cards">{(f) => <FinanceBody f={f} />}</QueryView>
    </div>
  );
}

function FinanceBody({ f }: { f: Finance }) {
  const series = f.history.map((m) => ({ label: m.label, value: m.net }));
  const gross = f.perUnit.reduce((sum, r) => sum + r.rent, 0);
  const feeTotal = f.perUnit.reduce((sum, r) => sum + r.fee, 0);
  const defaultFee = f.feeSource === "default";

  const exportCsv = () => {
    const csv = [["Căn hộ", "Trạng thái", "Tiền thuê", "Phí dịch vụ", "Thực nhận", "Cọc đang giữ hộ"], ...f.perUnit.map((r) => [r.unitCode, UNIT_STATUS_META[r.status].label, r.rent, r.fee, r.net, r.escrow])]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "khoan-thu-chu-nha.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Đã tải bảng kê tháng này", "success");
  };

  return (
    <>
      <PageHeader
        title="Khoản thu"
        description="Tiền thuê theo hợp đồng, phí dịch vụ ký gửi và tiền cọc đang được giữ hộ."
        actions={
          <button type="button" className="btn btn-quiet" onClick={exportCsv}>
            <Download size={16} /> Tải bảng kê
          </button>
        }
      />

      <div className={styles.kpis}>
        <StatTile hero label="Thực nhận tháng này" value={vndShort(f.thisMonth.net)} delta={{ text: `đã trừ phí dịch vụ ${vndShort(f.thisMonth.fee)}`, tone: "flat" }} spark={series.map((s) => s.value)} />
        <StatTile label="Tổng thực nhận 6 tháng" value={vndShort(f.totalNet6Months)} />
        <StatTile label="Cọc đang giữ hộ" value={vndShort(f.escrowTotal)} delta={{ text: "hoàn 100% khi thanh lý", tone: "flat" }} />
        <StatTile label="Phí dịch vụ ký gửi" value={`${f.serviceFeePercent}`} unit="%" delta={{ text: defaultFee ? "mức tạm, Admin chưa cấu hình" : "do Admin cấu hình", tone: "flat" }} />
      </div>

      <Columns title="Thực nhận mỗi tháng" subtitle="Tiền thuê sau phí dịch vụ; tháng hiện tại được nhấn" data={series} axisFormat={axisMillions} scaleFloor={1_000_000} valueFormat={(v) => `${vnd(v)}đ`} seriesName="Thực nhận" />

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
              {f.perUnit.map((r) => (
                <tr key={r.unitId}>
                  <td>
                    <b>{r.unitCode}</b>
                  </td>
                  <td>
                    <span className={`badge ${r.status === "rented" ? "badge-ink" : r.status === "holding" || r.status === "viewing" ? "badge-amber-soft" : "badge-kelp"}`}>{UNIT_STATUS_META[r.status].label}</span>
                  </td>
                  <td className={`${styles.r} tnum`}>{r.rent ? vnd(r.rent) : "—"}</td>
                  <td className={`${styles.r} tnum`}>{r.fee ? `−${vnd(r.fee)}` : "—"}</td>
                  <td className={`${styles.r} tnum`}>
                    <b>{r.rent ? vnd(r.net) : "—"}</b>
                  </td>
                  <td className={`${styles.r} tnum`}>{r.escrow ? vnd(r.escrow) : "—"}</td>
                </tr>
              ))}
              {f.perUnit.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 28 }}>
                    Chưa có căn nào đã ký gửi.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Tổng</td>
                <td className={`${styles.r} tnum`}>{vnd(gross)}</td>
                <td className={`${styles.r} tnum`}>−{vnd(feeTotal)}</td>
                <td className={`${styles.r} tnum`}>{vnd(gross - feeTotal)}</td>
                <td className={`${styles.r} tnum`}>{vnd(f.escrowTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card" style={{ overflow: "hidden" }} aria-label="Tiền thuê theo tháng">
        <h2 className={styles.h2} style={{ padding: "18px 20px 0" }}>Tiền thuê theo tháng</h2>
        <div className={styles.tableScroll}>
          <table className={styles.finRows} style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th scope="col">Kỳ</th>
                <th scope="col" className={styles.r}>Tiền thuê</th>
                <th scope="col" className={styles.r}>Thực nhận</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {[...f.history].reverse().map((m, i) => (
                <tr key={m.month}>
                  <td>Tháng {m.month.slice(5)}/{m.month.slice(0, 4)}</td>
                  <td className={`${styles.r} tnum`}>{m.gross ? `${vnd(m.gross)}đ` : "—"}</td>
                  <td className={`${styles.r} tnum`}>
                    <b>{m.gross ? `${vnd(m.net)}đ` : "—"}</b>
                  </td>
                  <td>
                    <span className={`badge ${i === 0 ? "badge-amber-soft" : "badge-plain"}`}>{i === 0 ? "Đang tích luỹ" : "Theo hợp đồng"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted xs" style={{ padding: "0 20px 16px", margin: 0 }}>
          Số liệu tính từ hợp đồng thuê còn hiệu lực trong từng tháng; trạng thái chuyển khoản sẽ có khi hệ thống ghi nhận chi trả.
        </p>
      </section>
    </>
  );
}
