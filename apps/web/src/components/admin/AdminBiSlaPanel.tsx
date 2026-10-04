"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, Clock3, RefreshCw } from "lucide-react";
import { Funnel } from "@/components/charts/Funnel";
import { Heatmap, type HeatRow } from "@/components/charts/Heatmap";
import { StackBar } from "@/components/charts/StackBar";
import { StatTile } from "@/components/charts/StatTile";
import { Section } from "@/components/ui/Section";
import styles from "./Admin.module.css";

interface BiData {
  funnel: {
    stages: { stage: string; count: number | null; available: boolean; dropRate: number | null }[];
    noShowRate: number | null;
  };
  occupancyHeatmap: { buildingCode: string; zone: string; total: number; rented: number; occupancyRate: number; alert: string }[];
  portfolioStatus: { totalUnits: number; rentedUnits: number; holdingUnits: number; availableUnits: number };
}

interface SlaTicket {
  ticketId: string;
  unitCode: string;
  building: string;
  hostName: string;
  tier: number;
  slaSeconds: number;
  status: string;
  offeredAt: string;
  deadlineAt: string;
  secondsOverdue: number;
  isBreached: boolean;
}

interface SlaSummary {
  byTier: Record<string, { total: number; offered: number; accepted: number; expired: number; escalated: number; breached: number }>;
  breachedCount: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  code?: string;
}

interface DashboardData {
  bi: BiData;
  tickets: SlaTicket[];
  sla: SlaSummary;
}

async function getAdminData<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as Envelope<T>;
  if (!response.ok || body.success !== true) {
    throw new Error(body.code === "unauthorized" ? "Phiên Admin đã hết hạn. Hãy đăng nhập lại." : "Không tải được dữ liệu BI/SLA.");
  }
  return body.data;
}

function toHeatRows(data: BiData): HeatRow[] {
  const zones = new Map<string, HeatRow["cells"]>();
  for (const item of data.occupancyHeatmap) {
    const cells = zones.get(item.zone) ?? [];
    cells.push({ building: item.buildingCode, total: item.total, used: item.rented });
    zones.set(item.zone, cells);
  }
  return [...zones].sort(([a], [b]) => a.localeCompare(b)).map(([zone, cells]) => ({ zone, cells }));
}

const statusLabel: Record<string, string> = {
  OFFERED: "Đang mời Host",
  ACCEPTED: "Đã nhận ca",
  EXPIRED: "Hết hạn",
  ESCALATED: "Đã leo thang",
};

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function AdminBiSlaPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [bi, tickets, sla] = await Promise.all([
        getAdminData<BiData>("/api/v1/admin/bi-funnel"),
        getAdminData<SlaTicket[]>("/api/v1/admin/dispatch-sla"),
        getAdminData<SlaSummary>("/api/v1/admin/dispatch-sla/summary"),
      ]);
      if (!mounted.current) return;
      setData({ bi, tickets, sla });
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu BI/SLA.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      mounted.current = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  if (!data) {
    return (
      <Section title="BI & SLA trực tiếp" description="Dữ liệu đọc từ backend; tự cập nhật mỗi 30 giây.">
        {loading ? (
          <div className="skeleton" style={{ height: 360 }} aria-label="Đang tải dữ liệu BI và SLA" />
        ) : (
          <div role="alert" className={styles.alerts}>
            <p>{error}</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setLoading(true); void refresh(); }}>
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        )}
      </Section>
    );
  }

  const { portfolioStatus, funnel } = data.bi;
  const occupancy = portfolioStatus.totalUnits > 0
    ? Math.round((portfolioStatus.rentedUnits / portfolioStatus.totalUnits) * 100)
    : null;
  const noShow = funnel.noShowRate === null ? null : Math.round(funnel.noShowRate * 10) / 10;
  const slaTiers = Object.entries(data.sla.byTier).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className={styles.page}>
      <Section
        title="BI & SLA trực tiếp"
        description={`Dữ liệu từ backend · tự cập nhật mỗi 30 giây${updatedAt ? ` · cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}`}
        actions={
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} /> Làm mới
          </button>
        }
      >
        {error && <p role="status" className="small" style={{ marginBottom: 12 }}>{error} Đang hiển thị lần tải thành công gần nhất.</p>}
        <div className={styles.kpis}>
          <StatTile hero label="Tỷ lệ căn đã thuê" value={occupancy === null ? "—" : String(occupancy)} unit="%" delta={{ text: `${portfolioStatus.rentedUnits}/${portfolioStatus.totalUnits} căn`, tone: "flat" }} />
          <StatTile label="Căn đang giữ chỗ" value={String(portfolioStatus.holdingUnits)} delta={{ text: "HOLDING từ dữ liệu Unit", tone: "flat" }} />
          <StatTile label="Tỷ lệ khách bỏ hẹn" value={noShow === null ? "—" : String(noShow)} unit={noShow === null ? undefined : "%"} delta={{ text: noShow === null ? "Chưa có mẫu số" : "COMPLETED + NO_SHOW", tone: "flat" }} />
          <StatTile label="Ticket quá SLA" value={String(data.sla.breachedCount)} delta={{ text: `${data.tickets.length} ticket điều phối`, tone: data.sla.breachedCount > 0 ? "bad" : "flat" }} />
        </div>
      </Section>

      <div className={styles.two}>
        <Funnel steps={funnel.stages.map((stage, i) => ({ key: `backend-${i}`, label: stage.stage, value: stage.available ? stage.count : null }))} />
        <Heatmap rows={toHeatRows(data.bi)} />
      </div>

      <div className={styles.two}>
        <Section title="Danh mục căn hộ" description="Trạng thái lấy trực tiếp từ Unit trong cơ sở dữ liệu.">
          <StackBar title={`${portfolioStatus.totalUnits} căn trong danh mục`} segments={[
            { label: "Đã thuê", value: portfolioStatus.rentedUnits },
            { label: "Đang giữ chỗ", value: portfolioStatus.holdingUnits },
            { label: "Còn trống", value: portfolioStatus.availableUnits },
          ]} />
        </Section>

        <Section title="SLA theo tầng" description="Số ticket và ticket vi phạm theo từng tầng điều phối.">
          {slaTiers.length === 0 ? <p className="muted small">Chưa có ticket điều phối.</p> : (
            <div className={styles.tableScroll}>
              <table className={styles.tbl}>
                <thead><tr><th>Tầng</th><th>Tổng</th><th>Đang mời</th><th>Đã nhận</th><th>Hết hạn</th><th>Vi phạm</th></tr></thead>
                <tbody>{slaTiers.map(([tier, row]) => (
                  <tr key={tier}><td>Tầng {tier}</td><td>{row.total}</td><td>{row.offered}</td><td>{row.accepted}</td><td>{row.expired}</td><td>{row.breached}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Section title="Ticket điều phối và đồng hồ SLA" description="Danh sách đồng bộ từ API dispatch-sla; ticket quá hạn được đánh dấu đỏ.">
        {data.tickets.length === 0 ? (
          <p className="muted small"><Activity size={15} style={{ verticalAlign: "-3px" }} /> Chưa có ticket điều phối.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.tbl}>
              <thead><tr><th>Căn</th><th>Host</th><th>Tầng</th><th>Trạng thái</th><th>Hạn SLA</th><th>Đồng hồ</th></tr></thead>
              <tbody>{data.tickets.map((ticket) => (
                <tr key={ticket.ticketId}>
                  <td>{ticket.unitCode} · {ticket.building}</td>
                  <td>{ticket.hostName}</td>
                  <td>Tầng {ticket.tier}</td>
                  <td>{statusLabel[ticket.status] ?? ticket.status}</td>
                  <td>{ticket.slaSeconds} giây · {dateTime(ticket.deadlineAt)}</td>
                  <td>{ticket.isBreached ? <span className={styles.warnText}><AlertTriangle size={14} /> Quá {ticket.secondsOverdue} giây</span> : <span className={styles.okText}><Clock3 size={14} /> Trong hạn</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
