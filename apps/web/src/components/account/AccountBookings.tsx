"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUS_META, type Tone } from "@/components/booking/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { fmtDateTime, vnd } from "@/lib/format";
import { allInCost } from "@/lib/pricing/cost";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantQueries } from "@/lib/tenant/queries";
import { splitTenantBookings, toUnit } from "@/lib/tenant/adapters";
import type { TenantBooking } from "@/lib/tenant/types";
import { unitAddress } from "@/lib/units";

const TONE_MAP: Record<Tone, StatusTone> = {
  info: "info",
  success: "ok",
  warning: "warn",
  alert: "danger",
  muted: "neutral",
};

export function AccountBookings() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { state: bookingsState } = useApiQuery(tenantQueries.bookings());

  if (bookingsState.status === "loading") {
    return <div className="skeleton" style={{ height: 320 }} />;
  }

  const allBookings = bookingsState.status === "ready" ? bookingsState.data : [];
  const { upcoming, past } = splitTenantBookings(allBookings);
  const rows = tab === "upcoming" ? upcoming : past;

  const columns: DataTableColumn<TenantBooking>[] = [
    { key: "ref", header: "Mã", render: (b) => b.ref },
    { key: "unit", header: "Căn", render: (b) => unitAddress(toUnit(b.unit)) },
    { key: "slot", header: "Thời gian", render: (b) => fmtDateTime(b.slot) },
    { key: "host", header: "Field Host", render: (b) => (b.host ? b.host.name : "Đang phân bổ") },
    {
      key: "status",
      header: "Trạng thái",
      render: (b) => (
        <StatusBadge tone={TONE_MAP[STATUS_META[b.status].tone]}>
          {STATUS_META[b.status].label}
        </StatusBadge>
      ),
    },
    {
      key: "allin",
      header: "All-in/tháng",
      align: "right",
      render: (b) => {
        const u = toUnit(b.unit);
        const cost = allInCost(u, {
          persons: b.contact.persons || 1,
          motorbikes: 1,
          cars: 0,
        });
        return `${vnd(cost.total)}đ`;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lịch xem của tôi"
        description="Theo dõi mọi lịch hẹn xem phòng đã đặt qua VinStay AI."
        actions={
          <Link href="/units" className="btn btn-primary">
            Tìm thêm căn
          </Link>
        }
      />

      <div className="tabs" role="tablist" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          className={`btn btn-sm ${tab === "upcoming" ? "btn-quiet" : "btn-ghost"}`}
          onClick={() => setTab("upcoming")}
        >
          Sắp tới ({upcoming.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "past"}
          className={`btn btn-sm ${tab === "past" ? "btn-quiet" : "btn-ghost"}`}
          onClick={() => setTab("past")}
        >
          Đã qua ({past.length})
        </button>
      </div>

      <Section flush>
        <DataTable
          columns={columns}
          rows={rows}
          rowHref={(b) => `/booking/${b.ref}`}
          empty={
            <EmptyState
              title={tab === "upcoming" ? "Bạn chưa có lịch xem sắp tới nào" : "Bạn chưa có lịch xem đã qua"}
              description="Tìm một căn ưng ý và đặt lịch xem, Field Host sẽ đón bạn tại sảnh."
              action={
                <Link href="/units" className="btn btn-primary">
                  Tìm căn
                </Link>
              }
              art
            />
          }
        />
      </Section>
    </div>
  );
}
