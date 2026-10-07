"use client";

import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import { Columns } from "@/components/charts/Columns";
import { StatTile } from "@/components/charts/StatTile";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { useSession } from "@/lib/auth/client";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { landlordApi } from "@/lib/landlord/api";
import type { Consignment, Finance, UnitRow } from "@/lib/landlord/types";
import { vnd, vndShort } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const statusText: Record<UnitRow["status"], string> = {
  available: "Đang trống",
  viewing: "Có lịch xem",
  holding: "Đang giữ căn",
  rented: "Đang cho thuê",
  unlisted: "Chưa mở khách",
  maintenance: "Bảo trì",
};

export function LandlordDashboard() {
  const session = useSession();
  const now = useNow(60_000);
  const units = useApiQuery<UnitRow[]>({ key: "units", fetch: landlordApi.units });
  const consignments = useApiQuery<Consignment[]>({ key: "consignments", fetch: landlordApi.consignments });
  const finance = useApiQuery<Finance>({ key: "finance", fetch: landlordApi.finance });

  const loading = units.state.status === "loading" || consignments.state.status === "loading" || finance.state.status === "loading";
  const failure = [units, consignments, finance].find((query) => query.state.status === "error");
  if (loading) return <div className="skeleton" style={{ height: 480 }} />;
  if (failure?.state.status === "error") return <div role="alert"><p>{failure.state.message}</p><button className="btn btn-secondary btn-sm" onClick={() => { units.reload(); consignments.reload(); finance.reload(); }}>Thử tải lại</button></div>;
  if (units.state.status !== "ready" || consignments.state.status !== "ready" || finance.state.status !== "ready") return null;

  const unitRows = units.state.data;
  const financeData = finance.state.data;
  // Hồ sơ chờ chủ đồng ý giá lên đầu mục "Cần xử lý" (hồ sơ 18).
  const liveConsignments = consignments.state.data
    .filter((c) => !["approved", "rejected"].includes(c.status))
    .sort((a, b) => Number(b.status === "awaiting_landlord") - Number(a.status === "awaiting_landlord"));
  const active = unitRows.filter((u) => u.mandate?.status === "active");
  const series = financeData.history.map((month) => ({ label: month.label, value: month.net }));
  const holdCount = unitRows.filter((u) => u.status === "holding").length;
  const availableCount = unitRows.filter((u) => u.status === "available").length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tổng quan"
        description={`Xin chào${session.user?.fullName ? `, ${session.user.fullName}` : ""}. Trạng thái và khoản thu bên dưới được lấy từ hồ sơ của bạn.`}
        actions={<Link href="/landlord/consign" className="btn btn-primary">Ký gửi căn mới</Link>}
      />

      {liveConsignments.length > 0 && <h2 style={{ margin: 0, fontSize: "var(--fs-17)" }}>Cần xử lý</h2>}
      {liveConsignments.length > 0 && <ul className={styles.alerts}>
        {liveConsignments.map((c) => {
          const meta = CONSIGN_STATUS_META[c.status];
          return <li key={c.id}>
            <FileSignature size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
                <b>{c.building} · Tầng {c.floor} · Căn {c.door || c.unitCode}</b>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <p className="small muted" style={{ margin: "var(--s-1) 0 0" }}>{meta.landlordHint}</p>
            </div>
            <Link href={c.status === "draft" ? `/landlord/consign?draft=${c.id}` : `/landlord/consignments/${c.id}`} className={c.status === "awaiting_landlord" ? "btn btn-amber btn-sm" : "btn btn-secondary btn-sm"}>
              {c.status === "awaiting_landlord" ? "Xem đề xuất giá" : "Chi tiết"} <ArrowRight size={14} />
            </Link>
          </li>;
        })}
      </ul>}

      <div className={styles.kpis}>
        <StatTile hero label="Thu ròng tháng này" value={vndShort(financeData.thisMonth.net)} delta={{ text: `Phí dịch vụ ${financeData.serviceFeePercent}%`, tone: "flat" }} />
        <StatTile label="Căn đang quản lý" value={String(active.length)} unit={`/ ${unitRows.length}`} />
        <StatTile label="Đang giữ căn" value={String(holdCount)} delta={{ text: "Theo trạng thái thanh toán thực tế", tone: "flat" }} />
        <StatTile label="Đang mở khách" value={String(availableCount)} />
      </div>

      <div className={styles.two}>
        <Columns title="Tiền thu ròng theo tháng" subtitle="Số liệu tổng hợp từ giao dịch và cấu hình phí trong hệ thống" data={series} axisFormat={(value) => (value === 0 ? "0" : `${value / 1_000_000}tr`)} valueFormat={(value) => `${vnd(value)}đ`} seriesName="Thu ròng" />
        <Section title="Tình hình danh mục">
          <ul className={styles.feed}>
            <li><b>Tổng thu ròng 6 tháng</b><span>{vnd(financeData.totalNet6Months)}đ</span></li>
            <li><b>Tiền cọc đang giữ</b><span>{vnd(financeData.escrowTotal)}đ</span></li>
            <li><b>Hồ sơ ký gửi đang xử lý</b><span>{liveConsignments.length}</span></li>
          </ul>
        </Section>
      </div>

      <Section title="Căn của bạn" description={unitRows.length > 5 ? `5 trên tổng ${unitRows.length} căn đã ký gửi` : undefined} actions={<Link href="/landlord/units" className="btn btn-quiet btn-sm">Xem tất cả <ArrowRight size={14} /></Link>} flush>
        <DataTable
          columns={[
            { key: "unitCode", header: "Mã căn", render: (unit: UnitRow) => unit.unitCode },
            { key: "building", header: "Toà", render: (unit: UnitRow) => unit.building },
            { key: "layout", header: "Loại căn", render: (unit: UnitRow) => unit.layout },
            { key: "rent", header: "Giá thuê", align: "right", render: (unit: UnitRow) => <span className="tnum">{vnd(unit.rent)}đ</span> },
            { key: "status", header: "Trạng thái", render: (unit: UnitRow) => <StatusBadge tone={unit.status === "rented" ? "ok" : unit.status === "holding" ? "warn" : "neutral"}>{statusText[unit.status]}</StatusBadge> },
            { key: "expires", header: "Hạn giữ căn", render: (unit: UnitRow) => unit.holdExpiresAt && now && unit.status === "holding" ? `${Math.max(0, Math.ceil((Date.parse(unit.holdExpiresAt) - now) / 3_600_000))} giờ` : "—" },
          ]}
          rows={unitRows.slice(0, 5)}
          rowHref={(unit: UnitRow) => `/landlord/units/${unit.id}`}
          empty="Bạn chưa ký gửi căn nào."
        />
      </Section>
    </div>
  );
}
