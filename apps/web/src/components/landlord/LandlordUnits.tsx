"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { vnd } from "@/lib/format";
import { LAYOUT_LABEL, LEASE_TERM_LABEL, MANDATE_META, UNIT_STATUS_META, hoursLeft, unitLabel } from "@/lib/landlord/labels";
import type { Consignment, UnitRow, UnitStatus } from "@/lib/landlord/types";
import { queries } from "@/lib/landlord/queries";
import { prefetchLandlord, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { useNow } from "@/lib/useNow";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

type Filter = "all" | Extract<UnitStatus, "available" | "viewing" | "holding" | "rented">;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "available", label: "Đang trống" },
  { key: "viewing", label: "Có khách xem" },
  { key: "holding", label: "Đang giữ căn" },
  { key: "rented", label: "Đang cho thuê" },
];

function UnitStatusBadge({ row, now }: { row: UnitRow; now: number }) {
  const meta = UNIT_STATUS_META[row.status];
  if (row.status === "holding") {
    const hours = hoursLeft(row.holdExpiresAt, now);
    return <StatusBadge tone={meta.tone}>{hours === null ? meta.label : `${meta.label} · còn ${hours} giờ`}</StatusBadge>;
  }
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function LandlordUnits() {
  const units = useLandlordQuery(queries.units);
  const consignments = useLandlordQuery(queries.consignments);
  const now = useNow(10_000);
  const [filter, setFilter] = useState<Filter>("all");

  // Có danh sách là tải trước chi tiết các căn: bấm vào căn là thấy ngay, không chờ API.
  const unitIds = units.state.status === "ready" ? units.state.data.map((u) => u.id).join(",") : "";
  useEffect(() => {
    for (const id of unitIds.split(",").filter(Boolean).slice(0, 6)) prefetchLandlord(queries.unit(id));
  }, [unitIds]);

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

      <QueryView query={units}>
        {(rows) => {
          const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
          return (
            <>
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
                    { key: "unit", header: "Căn", render: (r: UnitRow) => unitLabel(r) },
                    { key: "building", header: "Toà", render: (r: UnitRow) => r.building },
                    { key: "layout", header: "Loại căn", render: (r: UnitRow) => LAYOUT_LABEL[r.layoutKind] },
                    { key: "rent", header: "Giá thuê", align: "right", render: (r: UnitRow) => <span className="tnum">{vnd(r.rent)}đ</span> },
                    { key: "status", header: "Trạng thái căn", render: (r: UnitRow) => <UnitStatusBadge row={r} now={now} /> },
                    {
                      key: "mandate",
                      header: "Uỷ quyền",
                      render: (r: UnitRow) => {
                        const meta = MANDATE_META[r.mandate?.status ?? "none"];
                        return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
                      },
                    },
                  ]}
                  rows={shown}
                  rowHref={(r) => `/landlord/units/${r.id}`}
                  empty={
                    <EmptyState
                      title={rows.length === 0 ? "Bạn chưa có căn nào" : "Không có căn nào ở trạng thái này"}
                      description={rows.length === 0 ? "Ký gửi căn đầu tiên để VinStay lo khách, lịch xem và mở cửa." : "Đổi bộ lọc phía trên hoặc ký gửi thêm căn mới."}
                      action={
                        <Link href="/landlord/consign" className="btn btn-primary">
                          Ký gửi căn mới
                        </Link>
                      }
                    />
                  }
                />
              </Section>
            </>
          );
        }}
      </QueryView>

      <Section title="Hồ sơ ký gửi" description="Các căn bạn đã đăng ký ủy quyền trên VinStay." flush>
        <QueryView query={consignments}>
          {(list) => (
            <DataTable<Consignment>
              columns={[
                {
                  key: "unit",
                  header: "Căn",
                  render: (c) => `${c.building} · Tầng ${c.floor} · Căn ${c.door ?? "—"} (${c.areaM2} m²)`,
                },
                { key: "layout", header: "Loại căn", render: (c) => LAYOUT_LABEL[c.layoutKind] },
                { key: "rent", header: "Giá thuê", align: "right", render: (c) => <span className="tnum">{vnd(c.askRent)}đ</span> },
                { key: "deposit", header: "Tiền cọc đề xuất", align: "right", render: (c) => <span className="tnum">{vnd(c.suggestedDeposit)}đ</span> },
                { key: "leaseTerm", header: "Thời gian thuê", render: (c) => LEASE_TERM_LABEL[c.leaseTerm ?? "long"] },
                {
                  key: "status",
                  header: "Trạng thái",
                  render: (c) => <StatusBadge tone={CONSIGN_STATUS_META[c.status].tone}>{CONSIGN_STATUS_META[c.status].label}</StatusBadge>,
                },
                {
                  key: "action",
                  header: "",
                  render: (c) =>
                    c.status === "draft" ? (
                      <Link href={`/landlord/consign?draft=${c.id}`} className="btn btn-primary btn-sm" onClick={(e) => e.stopPropagation()}>
                        Ký ủy quyền
                      </Link>
                    ) : null,
                },
              ]}
              rows={[...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
              rowHref={(c) => `/landlord/consignments/${c.id}`}
              empty="Bạn chưa có hồ sơ ký gửi nào."
            />
          )}
        </QueryView>
      </Section>
    </div>
  );
}
