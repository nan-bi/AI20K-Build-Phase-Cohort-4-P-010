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
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtTime, relTime, vnd, vndShort } from "@/lib/mock/format";
import { monthlyRent, noticesFor, occupancy } from "@/lib/mock/selectors";
import { landlordConsignments, landlordUnitRows, type LandlordUnitRow } from "@/lib/mock/selectors-landlord";
import { LANDLORD_HISTORY, SERVICE_FEE_RATE } from "@/lib/mock/stats";
import { useMock } from "@/lib/mock/store";
import { unitAddress } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;
const UNIT_STATUS_META: Record<LandlordUnitRow["status"], { label: string; tone: "neutral" | "warn" | "ok" }> = {
  available: { label: "Đang trống", tone: "neutral" },
  holding: { label: "Đang giữ chỗ 24h", tone: "warn" },
  rented: { label: "Đang cho thuê", tone: "ok" },
};

const monthLabels = (now: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (n - 1 - i), 1);
    return `T${d.getMonth() + 1}`;
  });

export function LandlordDashboard() {
  const state = useMock();
  const now = useNow(60_000);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 480 }} />;

  const rows = landlordUnitRows(state, LID);
  const occ = occupancy(state, rows.map((r) => r.unit));
  const rent = monthlyRent(state, LID);
  const mine = landlordConsignments(state, LID);
  const inProgress = mine.filter((c) => c.status !== "approved");
  const feed = noticesFor(state, "landlord", LID).slice(0, 8);
  const history = LANDLORD_HISTORY[LID];
  const series = [...history, rent].map((v, i, arr) => ({ label: monthLabels(now, arr.length)[i], value: Math.round(v * (1 - SERVICE_FEE_RATE)) }));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tổng quan"
        description="Bạn ở nhà 100%: Field Host đón khách, mở cửa và báo bạn từng bước qua Zalo."
        actions={
          <Link href="/landlord/consign" className="btn btn-primary">
            Ký gửi căn mới
          </Link>
        }
      />

      {inProgress.length > 0 && (
        <ul className={styles.alerts}>
          {inProgress.map((c) => {
            const meta = CONSIGN_STATUS_META[c.status];
            return (
              <li key={c.id}>
                <FileSignature size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
                    <b>
                      Căn {c.building} · Tầng {c.floor} · Căn {c.door}
                    </b>
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                  </div>
                  <p className="small muted" style={{ margin: "var(--s-1) 0 0" }}>
                    {meta.landlordHint}
                  </p>
                </div>
                {c.status === "draft" ? (
                  <Link href={`/landlord/consign?draft=${c.id}`} className="btn btn-amber btn-sm">
                    Ký ngay <ArrowRight size={14} />
                  </Link>
                ) : (
                  <Link href={`/landlord/consignments/${c.id}`} className="btn btn-secondary btn-sm">
                    Chi tiết <ArrowRight size={14} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.kpis}>
        <StatTile hero label="Thu tiền thuê tháng này" value={vndShort(Math.round(rent * (1 - SERVICE_FEE_RATE)))} delta={{ text: "sau phí dịch vụ ký gửi", tone: "flat" }} spark={series.slice(-6).map((s) => s.value)} />
        <StatTile label="Đang cho thuê" value={String(occ.rented)} unit={`/ ${rows.length}`} delta={{ text: `${occ.holding} đang giữ chỗ 24h`, tone: "flat" }} />
        <StatTile label="Đang giữ chỗ 24h" value={String(occ.holding)} delta={{ text: "khách đã chuyển cọc, chờ ký hợp đồng", tone: "flat" }} />
        <StatTile label="Còn trống, đang mở khách" value={String(occ.available)} delta={{ text: "Host đón khách thay bạn", tone: "good", dir: "up" }} />
      </div>

      <div className={styles.two}>
        <Columns title="Tiền thuê thu về mỗi tháng" subtitle="Sau khi trừ phí dịch vụ ký gửi; tháng hiện tại được nhấn" data={series} axisFormat={(v) => (v === 0 ? "0" : `${v / 1_000_000}tr`)} valueFormat={(v) => `${vnd(v)}đ`} seriesName="Thu về" />
        <Section title="Thông báo tức thì">
          <ul className={styles.feed}>
            {feed.map((n) => (
              <li key={n.id} className={n.tone ? styles[`t-${n.tone}`] : ""}>
                <div>
                  <b>{n.title}</b>
                  <p className="small muted">{n.body}</p>
                </div>
                <span className="xs muted">
                  {fmtTime(n.at)} · {relTime(n.at, now)}
                </span>
              </li>
            ))}
            {feed.length === 0 && <li className="muted small">Chưa có thông báo. Khi Host mở cửa hoặc khách cọc, Zalo báo bạn ở đây.</li>}
          </ul>
        </Section>
      </div>

      <Section
        title="Căn của bạn"
        description={rows.length > 5 ? `5 trên tổng ${rows.length} căn đã ký gửi` : undefined}
        actions={
          <Link href="/landlord/units" className="btn btn-quiet btn-sm">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        }
        flush
      >
        <DataTable
          columns={[
            { key: "unit", header: "Căn", render: (r: LandlordUnitRow) => unitAddress(r.unit) },
            { key: "building", header: "Toà", render: (r: LandlordUnitRow) => r.unit.building },
            { key: "layout", header: "Loại căn", render: (r: LandlordUnitRow) => r.unit.layoutLabel },
            { key: "rent", header: "Giá thuê", align: "right", render: (r: LandlordUnitRow) => <span className="tnum">{vnd(r.rent)}đ</span> },
            {
              key: "status",
              header: "Trạng thái",
              render: (r: LandlordUnitRow) => <StatusBadge tone={UNIT_STATUS_META[r.status].tone}>{UNIT_STATUS_META[r.status].label}</StatusBadge>,
            },
          ]}
          rows={rows.slice(0, 5)}
          rowHref={(r) => `/landlord/units/${r.unit.id}`}
          empty="Bạn chưa ký gửi căn nào."
        />
      </Section>
    </div>
  );
}
