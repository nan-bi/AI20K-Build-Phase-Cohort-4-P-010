"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, Clock3, RefreshCw } from "lucide-react";
import { Funnel } from "@/components/charts/Funnel";
import { Heatmap, type HeatRow } from "@/components/charts/Heatmap";
import { StackBar } from "@/components/charts/StackBar";
import { StatTile } from "@/components/charts/StatTile";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/button";

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
          <div className="animate-pulse bg-muted/50 rounded-2xl h-[360px] border border-border/50" aria-label="Đang tải dữ liệu BI và SLA" />
        ) : (
          <div role="alert" className="flex flex-col gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" className="w-fit border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={() => { setLoading(true); void refresh(); }}>
              <RefreshCw size={14} className="mr-2" /> Thử lại
            </Button>
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
    <div className="flex flex-col gap-8">
      <Section
        title="BI & SLA trực tiếp"
        description={`Dữ liệu từ backend · tự cập nhật mỗi 30 giây${updatedAt ? ` · cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </Button>
        }
      >
        {error && <p role="status" className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20 mb-6">{error} Đang hiển thị lần tải thành công gần nhất.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile hero label="Tỷ lệ căn đã thuê" value={occupancy === null ? "—" : String(occupancy)} unit="%" delta={{ text: `${portfolioStatus.rentedUnits}/${portfolioStatus.totalUnits} căn`, tone: "flat" }} />
          <StatTile label="Căn đang giữ chỗ" value={String(portfolioStatus.holdingUnits)} delta={{ text: "HOLDING từ dữ liệu Unit", tone: "flat" }} />
          <StatTile label="Tỷ lệ khách bỏ hẹn" value={noShow === null ? "—" : String(noShow)} unit={noShow === null ? undefined : "%"} delta={{ text: noShow === null ? "Chưa có mẫu số" : "COMPLETED + NO_SHOW", tone: "flat" }} />
          <StatTile label="Ticket quá SLA" value={String(data.sla.breachedCount)} delta={{ text: `${data.tickets.length} ticket điều phối`, tone: data.sla.breachedCount > 0 ? "bad" : "flat" }} />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Funnel steps={funnel.stages.map((stage, i) => ({ key: `backend-${i}`, label: stage.stage, value: stage.available ? stage.count : null }))} />
        <Heatmap rows={toHeatRows(data.bi)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Danh mục căn hộ" description="Trạng thái lấy trực tiếp từ Unit trong cơ sở dữ liệu.">
          <StackBar title={`${portfolioStatus.totalUnits} căn trong danh mục`} segments={[
            { label: "Đã thuê", value: portfolioStatus.rentedUnits },
            { label: "Đang giữ chỗ", value: portfolioStatus.holdingUnits },
            { label: "Còn trống", value: portfolioStatus.availableUnits },
          ]} />
        </Section>

        <Section title="SLA theo tầng" description="Số ticket và ticket vi phạm theo từng tầng điều phối.">
          {slaTiers.length === 0 ? <p className="text-sm text-muted-foreground p-4 bg-muted/10 rounded-xl border border-dashed border-border/50">Chưa có ticket điều phối.</p> : (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border/50 text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tầng</th>
                    <th className="px-4 py-3">Tổng</th>
                    <th className="px-4 py-3">Đang mời</th>
                    <th className="px-4 py-3">Đã nhận</th>
                    <th className="px-4 py-3">Hết hạn</th>
                    <th className="px-4 py-3">Vi phạm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {slaTiers.map(([tier, row]) => (
                    <tr key={tier} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">Tầng {tier}</td>
                      <td className="px-4 py-3">{row.total}</td>
                      <td className="px-4 py-3">{row.offered}</td>
                      <td className="px-4 py-3">{row.accepted}</td>
                      <td className="px-4 py-3">{row.expired}</td>
                      <td className={`px-4 py-3 font-semibold ${row.breached > 0 ? "text-destructive" : "text-foreground"}`}>{row.breached}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Section title="Ticket điều phối và đồng hồ SLA" description="Danh sách đồng bộ từ API dispatch-sla; ticket quá hạn được đánh dấu đỏ.">
        {data.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center p-6 bg-muted/10 rounded-xl border border-dashed border-border/50 justify-center">
            <Activity size={16} className="mr-2 opacity-70" /> Chưa có ticket điều phối.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border/50 text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Căn</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Tầng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hạn SLA</th>
                  <th className="px-4 py-3">Đồng hồ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.tickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{ticket.unitCode} <span className="text-muted-foreground font-normal">· {ticket.building}</span></td>
                    <td className="px-4 py-3">{ticket.hostName}</td>
                    <td className="px-4 py-3">Tầng {ticket.tier}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                        {statusLabel[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ticket.slaSeconds} giây · {dateTime(ticket.deadlineAt)}</td>
                    <td className="px-4 py-3">
                      {ticket.isBreached ? (
                        <span className="inline-flex items-center gap-1.5 text-destructive font-medium bg-destructive/10 px-2.5 py-1 rounded-md text-xs">
                          <AlertTriangle size={14} /> Quá {ticket.secondsOverdue} giây
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-md text-xs">
                          <Clock3 size={14} /> Trong hạn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
