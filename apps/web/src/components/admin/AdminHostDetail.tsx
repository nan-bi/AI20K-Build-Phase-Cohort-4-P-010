"use client";

import { notFound } from "next/navigation";
import { STATUS_META } from "@/components/booking/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { fmtDate, fmtDateTime, fmtPhone, vnd } from "@/lib/mock/format";
import { hostBookings, hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { hostById, unitAddress, unitById, zoneById, type HostStatus } from "@/lib/mock/units";
import type { Booking } from "@/lib/mock/types";
import styles from "./Admin.module.css";

const mm = (s: number) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, "0")}″`;

const STATUS_TONE: Record<HostStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang trực", tone: "ok" },
  busy: { label: "Đang bận", tone: "warn" },
  off_duty: { label: "Nghỉ ca", tone: "neutral" },
};

/** Hồ sơ một Field Host. */
export function AdminHostDetail({ id }: { id: string }) {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 420 }} />;

  const host = hostById(id);
  if (!host) notFound();

  const e = hostEarnings(state, host, state.fees);
  const bookings = hostBookings(state, host.id).sort((a, b) => b.slot.localeCompare(a.slot));

  return (
    <div className={styles.page}>
      <PageHeader title={host.name} back={{ href: "/admin/hosts", label: "Field Host" }} />

      <Section title="Hồ sơ Field Host">
        <KeyValue
          items={[
            { label: "Số điện thoại", value: fmtPhone(host.phone) },
            { label: "Khu phụ trách", value: host.zones.map((z) => zoneById(z).name).join(", ") },
            { label: "Thẻ RFID", value: host.rfid },
            { label: "Đánh giá", value: `${String(host.rating).replace(".", ",")} ★` },
            { label: "Nhận ca trung bình", value: `${mm(host.avgAcceptSec)} (SLA 3′00″)` },
            { label: "Khách bỏ hẹn", value: `${Math.round(host.noShowRate * 100)}%` },
            { label: "Tham gia", value: fmtDate(host.joined) },
            { label: "Trạng thái", value: <StatusBadge tone={STATUS_TONE[host.status].tone}>{STATUS_TONE[host.status].label}</StatusBadge> },
          ]}
        />
      </Section>

      <Section title="Thu nhập tháng" description="Tính theo tuần hiện tại, cộng dồn thành số tháng trên bảng kê thanh toán.">
        <KeyValue
          items={[
            { label: "Lượt dẫn", value: e.viewings },
            { label: "Thù lao lượt dẫn", value: `${vnd(e.viewingFee)}đ` },
            { label: "Deal chốt cọc", value: e.deals },
            { label: "Hoa hồng", value: `${vnd(e.commission)}đ${e.multiplier > 1 ? ` (×${String(e.multiplier).replace(".", ",")})` : ""}` },
            { label: "Thưởng nóng", value: `${vnd(e.bonus)}đ` },
            { label: "Tổng thực nhận", value: <b>{vnd(e.total)}đ</b> },
          ]}
        />
      </Section>

      <Section title="Lịch xem" flush>
        <DataTable<Booking>
          columns={
            [
              { key: "slot", header: "Giờ hẹn", render: (b) => fmtDateTime(b.slot) },
              { key: "unit", header: "Căn hộ", render: (b) => unitAddress(unitById(b.unitId)!) },
              { key: "tenant", header: "Khách", render: (b) => b.tenant.name },
              { key: "status", header: "Trạng thái", render: (b) => <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span> },
            ] satisfies DataTableColumn<Booking>[]
          }
          rows={bookings}
          empty={<span className="muted">Chưa có lịch xem nào.</span>}
        />
      </Section>
    </div>
  );
}
