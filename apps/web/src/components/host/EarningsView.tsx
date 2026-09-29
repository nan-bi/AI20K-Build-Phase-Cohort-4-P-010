"use client";

import { Wallet } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDate, vnd } from "@/lib/mock/format";
import { hostBookings, hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { hostById, unitAddress, unitById } from "@/lib/mock/units";
import styles from "./Host.module.css";

const host = hostById(DEMO_USERS.host.refId!)!;

export function EarningsView() {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 280 }} />;
  const { fees } = state;
  const e = hostEarnings(state, host, fees);
  const deals = hostBookings(state, host.id).filter((b) => ["holding", "leased"].includes(b.status));
  const perDeal = Math.round(fees.dealCommission * e.multiplier);

  const dealColumns: DataTableColumn<Booking>[] = [
    {
      key: "unit",
      header: "Căn hộ",
      render: (b) => <b style={{ whiteSpace: "nowrap" }}>{unitAddress(unitById(b.unitId)!)}</b>,
    },
    {
      key: "tenant",
      header: "Khách",
      render: (b) => <span style={{ whiteSpace: "nowrap" }}>{b.tenant.name}</span>,
    },
    {
      key: "date",
      header: "Ngày cọc",
      render: (b) => <span className="small muted" style={{ whiteSpace: "nowrap" }}>{b.deposit?.paidAt ? fmtDate(b.deposit.paidAt) : "—"}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (b) => <span className={`badge ${STATUS_META[b.status].badge}`} style={{ whiteSpace: "nowrap" }}>{STATUS_META[b.status].label}</span>,
    },
    {
      key: "commission",
      header: "Hoa hồng",
      align: "right",
      render: () => <b className="num" style={{ whiteSpace: "nowrap" }}>+{vnd(perDeal)}đ</b>,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Thu nhập"
        description="Tạm tính tuần này. Đối soát và chuyển khoản vào Chủ nhật hàng tuần."
      />

      <div className={styles.kpis}>
        <StatTile label="Thu nhập tuần" value={vnd(e.total)} unit="đ" delta={{ text: "Chuyển khoản CN", tone: "good" }} />
        <StatTile label="Lượt dẫn" value={String(e.viewings)} delta={{ text: `${vnd(fees.baseViewingFee)}đ / lượt`, tone: "flat" }} />
        <StatTile label="Deal chốt cọc" value={String(e.deals)} delta={{ text: `${vnd(fees.dealCommission)}đ / deal`, tone: "flat" }} />
        <StatTile
          label="Đánh giá"
          value={`${String(host.rating).replace(".", ",")}★`}
          delta={
            host.rating >= 4.8
              ? { text: `hệ số ×${String(fees.ratingMultiplier).replace(".", ",")}`, tone: "good", dir: "up" }
              : { text: "Chuẩn dịch vụ", tone: "good" }
          }
        />
      </div>

      <div className={styles.earningsLayout}>
        <Section title="Cách tính">
          <dl className={styles.lines}>
            <div>
              <dt>
                Thù lao dẫn khách
                <span className="muted xs">
                  {e.viewings} lượt × {vnd(fees.baseViewingFee)}đ
                </span>
              </dt>
              <dd className="num">{vnd(e.viewingFee)}đ</dd>
            </div>
            <div>
              <dt>
                Hoa hồng chốt cọc
                <span className="muted xs">
                  {e.deals} deal × {vnd(fees.dealCommission)}đ
                  {e.multiplier > 1 ? ` × ${String(e.multiplier).replace(".", ",")}` : ""}
                </span>
              </dt>
              <dd className="num">{vnd(e.commission)}đ</dd>
            </div>
            <div>
              <dt>
                Thưởng nóng chiến dịch
                <span className="muted xs">{vnd(fees.campaignBonus)}đ / deal (tối đa 3 deal)</span>
              </dt>
              <dd className="num">{vnd(e.bonus)}đ</dd>
            </div>
          </dl>
          <p className="muted xs">
            Mức thù lao do Admin cấu hình và có hiệu lực ngay với ticket mới. Bạn không cần đợi cập nhật ứng dụng.
          </p>
        </Section>

        <Section title="Deal gần đây" flush>
          <DataTable<Booking>
            columns={dealColumns}
            rows={deals}
            rowHref={(b) => `/host/viewing/${b.id}`}
            empty={
              <div className={styles.empty}>
                <Wallet size={26} />
                <b>Chưa có deal trong phiên này</b>
                <p className="muted small">Chốt một căn từ tab Lịch để thấy hoa hồng cộng vào đây.</p>
              </div>
            }
          />
        </Section>
      </div>
    </div>
  );
}
