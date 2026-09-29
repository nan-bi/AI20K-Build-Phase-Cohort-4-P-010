"use client";

import { DataTable } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDate, maskPhone, vnd } from "@/lib/mock/format";
import { bookingUnit } from "@/lib/mock/selectors";
import { tenantContracts } from "@/lib/mock/selectors-tenant";
import { useMock } from "@/lib/mock/store";
import { unitAddress } from "@/lib/mock/units";
import styles from "./AccountContracts.module.css";

const HANDOVER_ITEMS = ["Tường", "Sàn", "Sofa", "Điều hoà", "Tủ lạnh", "Bếp", "Máy giặt", "Giường", "Rèm", "Công tơ điện nước"];

interface Technician {
  name: string;
  trade: string;
  phone: string;
}

const TECHNICIANS: Technician[] = [
  { name: "Anh Quân", trade: "Điện lạnh", phone: "0912345678" },
  { name: "Anh Hòa", trade: "Điện nước", phone: "0987654321" },
  { name: "Anh Tùng", trade: "Đồ gỗ nội thất", phone: "0977123456" },
  { name: "Chị Lan", trade: "Vệ sinh công nghiệp", phone: "0966789123" },
];

export function AccountContracts() {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const phone = (state.tenantProfile ?? { phone: DEMO_USERS.tenant.phone! }).phone;
  const bookings = tenantContracts(state, phone);

  return (
    <div>
      <PageHeader
        title="Hợp đồng & tiền cọc"
        description="Theo dõi khoản cọc, thoả thuận và hợp đồng thuê của bạn."
        actions={
          <a href="#danh-ba-tho" className="btn btn-quiet">
            Danh bạ thợ kỹ thuật ngoài
          </a>
        }
      />

      {bookings.length === 0 ? (
        <Section>
          <p className="muted">Chưa có khoản cọc nào</p>
        </Section>
      ) : (
        bookings.map((b) => {
          const unit = bookingUnit(b);
          return (
            <Section key={b.id} title={unitAddress(unit)} description={`Mã lịch hẹn ${b.ref}`}>
              <KeyValue
                items={[
                  { label: "Căn", value: unitAddress(unit) },
                  {
                    label: "Tiền giữ chỗ",
                    value: b.deposit ? (
                      <>
                        {vnd(b.deposit.amount)}đ · <StatusBadge tone={b.deposit.paidAt ? "ok" : "warn"}>{b.deposit.paidAt ? "Đã thanh toán" : "Chờ thanh toán"}</StatusBadge>
                      </>
                    ) : (
                      "Chưa phát sinh"
                    ),
                  },
                  { label: "Điều khoản cọc", value: b.depositConsentAt ? `Đã đồng ý ngày ${fmtDate(b.depositConsentAt)}` : "Chưa xác nhận" },
                  {
                    label: "Hợp đồng thuê",
                    value: b.lease ? `Từ ${fmtDate(b.lease.startDate)} · ${b.lease.months} tháng · ${vnd(b.lease.rent)}đ/tháng` : "Chưa ký",
                  },
                ]}
              />
              {b.deposit && (
                <p className={`muted small ${styles.note}`}>
                  Khi ký hợp đồng thuê, 2.000.000 đ này chuyển toàn bộ thành tiền cọc bảo đảm tài sản, không trừ vào tiền thuê tháng đầu.
                </p>
              )}

              <h3 className={styles.handoverTitle}>Hộ chiếu bàn giao</h3>
              <ul className={styles.handoverList}>
                {HANDOVER_ITEMS.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                    <StatusBadge tone="neutral">Chờ bàn giao</StatusBadge>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })
      )}

      <div id="danh-ba-tho">
        <Section title="Danh bạ thợ kỹ thuật ngoài" flush>
          <DataTable<Technician>
            columns={[
              { key: "name", header: "Tên" },
              { key: "trade", header: "Nghề" },
              { key: "phone", header: "Số điện thoại", render: (t) => <span className="num">{maskPhone(t.phone)}</span> },
            ]}
            rows={TECHNICIANS}
            empty={<p className="muted">Chưa có thợ nào</p>}
          />
        </Section>
        <p className={`muted small ${styles.techNote}`}>VinStay chỉ giới thiệu. Bạn và thợ tự thoả thuận chi phí.</p>
      </div>
    </div>
  );
}
