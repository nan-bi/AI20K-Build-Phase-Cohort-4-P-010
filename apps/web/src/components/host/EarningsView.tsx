"use client";

import { Wallet } from "lucide-react";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useHostEarnings, type HostEarnings } from "@/lib/admin/api";
import { fmtDate, vnd } from "@/lib/format";
import styles from "./Host.module.css";

type Payout = HostEarnings["payouts"][number];

const STATUS: Record<string, string> = { PENDING: "Chờ thanh toán", PAID: "Đã thanh toán" };

export function EarningsView() {
  const query = useHostEarnings();
  if (query.state.status === "loading") return <div className="skeleton" style={{ height: 320 }} />;
  if (query.state.status === "error") return <div role="alert"><p>{query.state.message}</p><button className="btn btn-secondary btn-sm" onClick={query.reload}>Thử lại</button></div>;

  const { stats, rating, walletBalance, payouts, currentPeriod, roles } = query.state.data;
  const isInspector = roles.includes("inspector");
  const columns: DataTableColumn<Payout>[] = [
    { key: "createdAt", header: "Ngày ghi nhận", render: (row) => <span className="small muted">{fmtDate(row.createdAt)}</span> },
    { key: "period", header: "Tuần", render: (row) => row.period },
    { key: "amount", header: "Số tiền", align: "right", render: (row) => <b className="num">{vnd(row.amount)}đ</b> },
    { key: "status", header: "Trạng thái", render: (row) => <span className="badge badge-neutral">{STATUS[row.status] ?? row.status}</span> },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Thu nhập" description={currentPeriod ? `Kỳ ghi nhận gần nhất: ${currentPeriod}. Số liệu đồng bộ từ ví Host trên hệ thống.` : "Số liệu đồng bộ từ ví Host trên hệ thống."} />
      <div className={styles.kpis}>
        <StatTile label="Tổng thu nhập ghi nhận" value={vnd(stats.totalEarnings)} unit="đ" />
        <StatTile label="Lượt dẫn được ghi nhận" value={String(stats.totalViewings)} />
        <StatTile label="Deal được ghi nhận" value={String(stats.totalDeals)} />
        {isInspector && <StatTile label="Phiếu thẩm định đã nộp" value={String(stats.totalInspections)} />}
        <StatTile label="Số dư ví" value={vnd(walletBalance)} unit="đ" delta={{ text: `${String(rating).replace(".", ",")}★`, tone: "flat" }} />
      </div>
      <div className={styles.earningsLayout}>
        <Section title="Chi tiết thu nhập đã ghi nhận">
          <dl className={styles.lines}>
            <div><dt>Phí dẫn khách</dt><dd className="num">{vnd(stats.viewingFeeTotal)}đ</dd></div>
            <div><dt>Hoa hồng giao dịch</dt><dd className="num">{vnd(stats.dealCommissionTotal)}đ</dd></div>
            <div><dt>Thưởng đánh giá</dt><dd className="num">{vnd(stats.ratingBonus)}đ</dd></div>
            <div><dt>Thưởng nóng chiến dịch</dt><dd className="num">{vnd(stats.campaignBonus)}đ</dd></div>
            {isInspector && <div><dt>Thù lao thẩm định ký gửi</dt><dd className="num">{vnd(stats.inspectionFeeTotal)}đ</dd></div>}
          </dl>
          <p className="muted xs">Các khoản chỉ xuất hiện sau khi nghiệp vụ tương ứng được ghi nhận trong cơ sở dữ liệu.</p>
        </Section>
        <Section title="Các khoản gần đây" flush>
          <DataTable<Payout> columns={columns} rows={payouts} empty={<div className={styles.empty}><Wallet size={26} /><b>Chưa có khoản thu nhập</b><p className="muted small">Khoản thu sẽ hiển thị sau khi ca xem hoặc giao dịch đủ điều kiện được ghi nhận.</p></div>} />
        </Section>
      </div>
    </div>
  );
}
