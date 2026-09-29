"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { DEMO_USERS } from "@/lib/mock/auth";
import { vnd } from "@/lib/mock/format";
import { holdDaysLeft, isOpenBooking, unitDisplayStatus } from "@/lib/mock/selectors";
import { landlordConsignments, landlordUnitRows, type LandlordUnitRow } from "@/lib/mock/selectors-landlord";
import { useMock } from "@/lib/mock/store";
import type { Consignment } from "@/lib/mock/types";
import { LAYOUT_LABEL, LEASE_TERM_LABEL, type UnitDisplayStatus, unitAddress } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;

const MANDATE_STATUS_META: Record<LandlordUnitRow["mandateStatus"], { label: string; tone: StatusTone }> = {
  active: { label: "Hiệu lực", tone: "ok" },
  exiting: { label: "Đang đếm ngược", tone: "warn" },
  ended: { label: "Đã kết thúc", tone: "neutral" },
};

type Filter = "all" | UnitDisplayStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "available", label: "Đang trống" },
  { key: "viewing", label: "Có khách xem" },
  { key: "holding", label: "Đang giữ căn" },
  { key: "rented", label: "Đang cho thuê" },
];

export function LandlordUnits() {
  const state = useMock();
  const now = useNow(10_000);
  const [filter, setFilter] = useState<Filter>("all");
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 480 }} />;

  const rows = landlordUnitRows(state, LID);
  const shown =
    filter === "all"
      ? rows
      : rows.filter((r) => unitDisplayStatus(state, r.unit) === filter);
  const consignments = landlordConsignments(state, LID).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Căn hộ"
        description="Các căn bạn đã ký gửi độc quyền cho VinStay."
        actions={
          <Link href="/landlord/consign" className="btn btn-primary">
            Ký gửi căn mới
          </Link>
        }
      />

      <div className={styles.segmented} role="tablist" aria-label="Lọc theo trạng thái căn">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={filter === f.key ? styles.segOn : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Section flush>
        <DataTable
          columns={[
            { key: "unit", header: "Căn", render: (r: LandlordUnitRow) => unitAddress(r.unit) },
            { key: "building", header: "Toà", render: (r: LandlordUnitRow) => r.unit.building },
            { key: "layout", header: "Loại căn", render: (r: LandlordUnitRow) => r.unit.layoutLabel },
            { key: "rent", header: "Giá thuê", align: "right", render: (r: LandlordUnitRow) => <span className="tnum">{vnd(r.rent)}đ</span> },
            {
              key: "status",
              header: "Trạng thái căn",
              render: (r: LandlordUnitRow) => {
                const ds = unitDisplayStatus(state, r.unit);
                if (ds === "viewing") {
                  const openCount = state.bookings.filter((b) => b.unitId === r.unit.id && isOpenBooking(b)).length;
                  return (
                    <span className="badge badge-amber-soft">
                      Có khách xem · {openCount} lịch
                    </span>
                  );
                }
                if (ds === "holding") {
                  const holdingBooking = state.bookings.find(
                    (b) => b.unitId === r.unit.id && (b.status === "holding" || b.deposit?.paidAt)
                  );
                  const days = holdingBooking ? holdDaysLeft(holdingBooking, now) : 7;
                  return <StatusBadge tone="warn">{`Đang giữ căn · còn ${days} ngày`}</StatusBadge>;
                }
                if (ds === "rented") {
                  return <StatusBadge tone="ok">Đang cho thuê</StatusBadge>;
                }
                return <StatusBadge tone="neutral">Đang trống</StatusBadge>;
              },
            },
            {
              key: "mandate",
              header: "Uỷ quyền",
              render: (r: LandlordUnitRow) => <StatusBadge tone={MANDATE_STATUS_META[r.mandateStatus].tone}>{MANDATE_STATUS_META[r.mandateStatus].label}</StatusBadge>,
            },
          ]}
          rows={shown}
          rowHref={(r) => `/landlord/units/${r.unit.id}`}
          empty={
            <EmptyState
              title="Không có căn nào ở trạng thái này"
              description="Đổi bộ lọc phía trên hoặc ký gửi thêm căn mới."
              action={
                <Link href="/landlord/consign" className="btn btn-primary">
                  Ký gửi căn mới
                </Link>
              }
            />
          }
        />
      </Section>

      <Section title="Hồ sơ ký gửi" description="Các căn bạn đã đăng ký ủy quyền trên VinStay." flush>
        <DataTable<Consignment>
          columns={[
            {
              key: "unit",
              header: "Căn",
              render: (c: Consignment) => `${c.building} · Tầng ${c.floor} · Căn ${c.door} (${c.areaM2} m²)`,
            },
            { key: "layout", header: "Loại căn", render: (c: Consignment) => LAYOUT_LABEL[c.layout] },
            {
              key: "rent",
              header: "Giá thuê",
              align: "right",
              render: (c: Consignment) => <span className="tnum">{vnd(c.askRent)}đ</span>,
            },
            {
              key: "deposit",
              header: "Tiền cọc đề xuất",
              align: "right",
              render: (c: Consignment) => <span className="tnum">{vnd(c.suggestedDeposit ?? c.askRent)}đ</span>,
            },
            {
              key: "leaseTerm",
              header: "Thời gian thuê",
              render: (c: Consignment) =>
                c.leaseTerm ? (LEASE_TERM_LABEL[c.leaseTerm] ?? c.leaseTerm) : "Dài hạn: 12 tháng",
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (c: Consignment) => <StatusBadge tone={CONSIGN_STATUS_META[c.status].tone}>{CONSIGN_STATUS_META[c.status].label}</StatusBadge>,
            },
            {
              key: "action",
              header: "",
              render: (c: Consignment) =>
                c.status === "draft" ? (
                  <Link
                    href={`/landlord/consign?draft=${c.id}`}
                    className="btn btn-primary btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ký ủy quyền
                  </Link>
                ) : null,
            },
          ]}
          rows={consignments}
          rowHref={(c) => `/landlord/consignments/${c.id}`}
          empty="Bạn chưa có hồ sơ ký gửi nào."
        />
      </Section>
    </div>
  );
}
