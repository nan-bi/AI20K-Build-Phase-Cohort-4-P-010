"use client";

import { FileText } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { fmtDate, maskPhone, vnd } from "@/lib/mock/format";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { tenantApi } from "@/lib/tenant/api";
import { toUnit } from "@/lib/tenant/adapters";
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

const CONTRACT_STATUS_MAP: Record<"active" | "expiring" | "ended", { label: string; tone: StatusTone }> = {
  active: { label: "Đang hiệu lực", tone: "ok" },
  expiring: { label: "Sắp hết hạn", tone: "warn" },
  ended: { label: "Đã kết thúc", tone: "neutral" },
};

export function AccountContracts() {
  const { state: contractsState } = useApiQuery(tenantQueries.contracts());

  if (contractsState.status === "loading") {
    return <div className="skeleton" style={{ height: 320 }} />;
  }

  const contracts = contractsState.status === "ready" ? contractsState.data : [];

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

      {contracts.length === 0 ? (
        <Section>
          <p className="muted">Chưa có hợp đồng hoặc khoản cọc nào trong tài khoản.</p>
        </Section>
      ) : (
        contracts.map((c) => {
          const unit = toUnit(c.unit);
          const statusInfo = CONTRACT_STATUS_MAP[c.status] || CONTRACT_STATUS_MAP.active;
          return (
            <Section
              key={c.id}
              title={unitAddress(unit)}
              description={`Số hợp đồng ${c.contractNumber} · Lịch hẹn ${c.bookingRef}`}
              actions={
                <a
                  href={tenantApi.contractPdfUrl(c.id)}
                  download
                  className="btn btn-quiet btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <FileText size={15} /> Tải PDF hợp đồng
                </a>
              }
            >
              <KeyValue
                items={[
                  { label: "Căn hộ", value: unitAddress(unit) },
                  {
                    label: "Trạng thái",
                    value: <StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>,
                  },
                  {
                    label: "Thời hạn thuê",
                    value: `Từ ${fmtDate(c.startDate)} đến ${fmtDate(c.endDate)} (${c.months} tháng)`,
                  },
                  {
                    label: "Giá thuê mỗi tháng",
                    value: `${vnd(c.monthlyRent)}đ/tháng (Kỳ thanh toán: ${c.paymentCycle} tháng/lần)`,
                  },
                  {
                    label: "Tiền cọc bảo đảm tài sản",
                    value: `${vnd(c.securityDeposit)}đ (gồm 2.000.000đ cọc giữ chỗ chuyển đổi 100%)`,
                  },
                  {
                    label: "Số tiền kỳ đầu cần thanh toán",
                    value: `${vnd(c.firstPaymentDue.total)}đ (Tiền thuê kỳ 1: ${vnd(c.firstPaymentDue.rent)}đ + bù cọc bảo đảm: ${vnd(c.firstPaymentDue.depositTopUp)}đ)`,
                  },
                ]}
              />

              <p className={`muted small ${styles.note}`}>
                Khoản cọc giữ chỗ 2.000.000đ đã chuyển 100% thành tiền cọc bảo đảm tài sản (Security Deposit), tuyệt đối không trừ vào tiền thuê tháng đầu tiên.
              </p>

              <h3 className={styles.handoverTitle}>Hộ chiếu bàn giao số (10 hạng mục)</h3>
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
        <p className={`muted small ${styles.techNote}`}>VinStay chỉ giới thiệu danh bạ thợ uy tín tại Ocean Park. Bạn và thợ tự thoả thuận chi phí và chịu trách nhiệm trực tiếp.</p>
      </div>
    </div>
  );
}
