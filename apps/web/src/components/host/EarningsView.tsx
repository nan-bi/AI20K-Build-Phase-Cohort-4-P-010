"use client";

import Link from "next/link";
import { Award, Wallet } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDate, vnd } from "@/lib/mock/format";
import { hostBookings, hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { hostById, unitAddress, unitById } from "@/lib/mock/units";
import styles from "./Host.module.css";

const host = hostById(DEMO_USERS.host.refId!)!;

export function EarningsView() {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 280 }} />;
  const { fees } = state;
  const e = hostEarnings(state, host, fees);
  const deals = hostBookings(state, host.id).filter((b) => ["holding", "signed", "leased"].includes(b.status));
  const perDeal = Math.round(fees.dealCommission * e.multiplier);

  return (
    <div className={styles.stack}>
      <section className={styles.earnHero}>
        <p className="small">Thu nhập tuần này (tạm tính)</p>
        <p className={`num ${styles.earnTotal}`}>{vnd(e.total)}đ</p>
        <p className="small">Đối soát và chuyển khoản vào Chủ nhật hàng tuần</p>
      </section>

      <section className={`card ${styles.block}`}>
        <h2>Cách tính</h2>
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
                {e.deals} deal × {vnd(fees.dealCommission)}đ{e.multiplier > 1 ? ` × ${String(e.multiplier).replace(".", ",")}` : ""}
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
        <p className="muted xs">Mức thù lao do Admin cấu hình và có hiệu lực ngay với ticket mới. Bạn không cần đợi cập nhật ứng dụng.</p>
      </section>

      <section className={`card ${styles.block} ${styles.rate}`}>
        <Award size={26} />
        <div>
          <h2>Đánh giá {String(host.rating).replace(".", ",")} sao</h2>
          <p className="muted small">Từ 4,8 sao trở lên nhận hệ số ×{String(fees.ratingMultiplier).replace(".", ",")} hoa hồng và được ưu tiên bắn lead tầng 1.</p>
        </div>
      </section>

      <section>
        <h2 className={styles.h2}>Deal gần đây</h2>
        {deals.length === 0 ? (
          <div className={styles.empty}>
            <Wallet size={26} />
            <b>Chưa có deal trong phiên này</b>
            <p className="muted small">Chốt một căn từ tab Lịch để thấy hoa hồng cộng vào đây.</p>
          </div>
        ) : (
          <ul className={styles.stack}>
            {deals.map((b) => (
              <li key={b.id}>
                <Link href={`/host/viewing/${b.id}`} className={styles.item} style={{ gridTemplateColumns: "1fr auto" }}>
                  <div>
                    <b>{unitAddress(unitById(b.unitId)!)}</b>
                    <p className="muted small">
                      {b.tenant.name} · {b.deposit?.paidAt ? fmtDate(b.deposit.paidAt) : ""}
                    </p>
                    <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span>
                  </div>
                  <b className="num">+{vnd(perDeal)}đ</b>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
