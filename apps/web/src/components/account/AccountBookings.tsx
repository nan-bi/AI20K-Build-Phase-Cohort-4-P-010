"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUS_META, type Tone } from "@/components/booking/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDateTime, vnd } from "@/lib/mock/format";
import { bookingUnit, hostName, tenantAllIn } from "@/lib/mock/selectors";
import { tenantPastBookings, tenantUpcomingBookings } from "@/lib/mock/selectors-tenant";
import { useMock } from "@/lib/mock/store";
import type { Booking } from "@/lib/mock/types";
import { unitAddress } from "@/lib/mock/units";

const TONE_MAP: Record<Tone, StatusTone> = { info: "info", success: "ok", warning: "warn", alert: "danger", muted: "neutral" };

export function AccountBookings() {
  const state = useMock();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  if (!state.ready) return <div className="skeleton" style={{ height: 320 }} />;

  const phone = (state.tenantProfile ?? { phone: DEMO_USERS.tenant.phone! }).phone;
  const rows = tab === "upcoming" ? tenantUpcomingBookings(state, phone) : tenantPastBookings(state, phone);

  const columns: DataTableColumn<Booking>[] = [
    { key: "ref", header: "Mã", render: (b) => b.ref },
    { key: "unit", header: "Căn", render: (b) => unitAddress(bookingUnit(b)) },
    { key: "slot", header: "Thời gian", render: (b) => fmtDateTime(b.slot) },
    { key: "host", header: "Field Host", render: (b) => hostName(b.hostId) },
    { key: "status", header: "Trạng thái", render: (b) => <StatusBadge tone={TONE_MAP[STATUS_META[b.status].tone]}>{STATUS_META[b.status].label}</StatusBadge> },
    { key: "allin", header: "All-in/tháng", align: "right", render: (b) => `${vnd(tenantAllIn(bookingUnit(b), b.tenant.persons).total)}đ` },
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
        <button type="button" role="tab" aria-selected={tab === "upcoming"} className={`btn btn-sm ${tab === "upcoming" ? "btn-quiet" : "btn-ghost"}`} onClick={() => setTab("upcoming")}>
          Sắp tới
        </button>
        <button type="button" role="tab" aria-selected={tab === "past"} className={`btn btn-sm ${tab === "past" ? "btn-quiet" : "btn-ghost"}`} onClick={() => setTab("past")}>
          Đã qua
        </button>
      </div>

      <Section flush>
        <DataTable
          columns={columns}
          rows={rows}
          rowHref={(b) => `/booking/${b.ref}`}
          empty={
            <EmptyState
              title="Bạn chưa có lịch xem nào"
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
