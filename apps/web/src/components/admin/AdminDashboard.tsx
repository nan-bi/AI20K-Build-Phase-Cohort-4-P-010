"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardCheck, Clock3, FileSignature, RefreshCw, Timer } from "lucide-react";
import { BarList } from "@/components/charts/BarList";
import { Funnel } from "@/components/charts/Funnel";
import { Heatmap, type HeatRow } from "@/components/charts/Heatmap";
import { StackBar } from "@/components/charts/StackBar";
import { StatTile } from "@/components/charts/StatTile";
import { Trend } from "@/components/charts/Trend";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { api } from "@/lib/apiClient";
import { fmtTime, relTime } from "@/lib/format";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

/** SLA nhận ticket 3 phút (AGENTS.md — điểm nghẽn vận hành #5). */
const SLA = 180;
const POLL_MS = 30_000;

interface BiData {
  funnel: {
    stages: { stage: string; count: number | null; available: boolean; dropRate: number | null }[];
    noShowRate: number | null;
  };
  dailyBookings: { date: string; count: number }[];
  occupancyHeatmap: { buildingCode: string; zone: string; total: number; rented: number }[];
  portfolioStatus: { totalUnits: number; rentedUnits: number; holdingUnits: number; availableUnits: number };
}

interface SlaTicket {
  ticketId: string;
  bookingRef: string;
  unitCode: string;
  building: string;
  hostName: string;
  tier: number;
  status: string;
  offeredAt: string;
  secondsOverdue: number;
  isBreached: boolean;
}

interface SlaSummary {
  breachedCount: number;
  byHost: { hostId: string; hostName: string; accepted: number; avgAcceptSeconds: number; overSla: number }[];
  avgAcceptSeconds: number | null;
}

interface InventoryRow {
  mandateStatus: string;
  exitCountdownDays: number | null;
  canTerminate: boolean;
}

interface ContractRow {
  status: string;
  endDate: string;
}

const TICKET_LABEL: Record<string, string> = {
  OFFERED: "Đang mời Host",
  ACCEPTED: "Đã nhận ca",
  CHECKED: "Đã đón khách",
  COMPLETED: "Hoàn tất",
  EXPIRED: "Hết hạn",
  ESCALATED: "Đã leo thang",
  CANCELLED: "Đã huỷ",
};

/** "3. Đặt lịch OTP xác thực SĐT" → "Đặt lịch OTP xác thực SĐT". */
const stageLabel = (s: string) => s.replace(/^\d+\.\s*/, "");
const mmss = (sec: number) => `${Math.floor(sec / 60)}′${String(sec % 60).padStart(2, "0")}″`;
const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function toHeatRows(data: BiData): HeatRow[] {
  const zones = new Map<string, HeatRow["cells"]>();
  for (const item of data.occupancyHeatmap) {
    const cells = zones.get(item.zone) ?? [];
    cells.push({ building: item.buildingCode, total: item.total, used: item.rented });
    zones.set(item.zone, cells);
  }
  return [...zones].sort(([a], [b]) => a.localeCompare(b)).map(([zone, cells]) => ({ zone, cells }));
}

export function AdminDashboard() {
  const bi = useApiQuery({ key: "admin-bi-funnel", fetch: () => api.get<BiData>("/admin/bi-funnel") }, true, { pollMs: POLL_MS });
  const tickets = useApiQuery({ key: "admin-dispatch-sla", fetch: () => api.get<SlaTicket[]>("/admin/dispatch-sla") }, true, { pollMs: POLL_MS });
  const sla = useApiQuery({ key: "admin-dispatch-sla-summary", fetch: () => api.get<SlaSummary>("/admin/dispatch-sla/summary") }, true, { pollMs: POLL_MS });
  const inventory = useApiQuery({ key: "admin-exclusive-inventory", fetch: () => api.get<InventoryRow[]>("/admin/exclusive-inventory") });
  const contracts = useApiQuery({ key: "admin-contracts", fetch: () => api.get<ContractRow[]>("/admin/contracts") });
  const now = useNow(60_000);

  const queries = [bi, tickets, sla, inventory, contracts];
  const failed = queries.find((q) => q.state.status === "error");
  const refreshing = queries.some((q) => q.state.status === "ready" && q.state.refreshing);
  const refresh = () => queries.forEach((q) => q.reload());

  const header = (
    <PageHeader
      title="Tổng quan vận hành"
      description="Vinhomes Ocean Park 1 · số liệu trực tiếp từ hệ thống, tự cập nhật mỗi 30 giây"
      actions={
        <button type="button" className="btn btn-quiet btn-sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={15} /> Cập nhật
        </button>
      }
    />
  );

  if (bi.state.status !== "ready" || sla.state.status !== "ready" || tickets.state.status !== "ready" || !now) {
    return (
      <div className={styles.page}>
        {header}
        {failed?.state.status === "error" ? (
          <div role="alert" className="card">
            <b>Không tải được số liệu vận hành</b>
            <p className="small muted">{failed.state.message}</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={refresh}>
              Thử lại
            </button>
          </div>
        ) : (
          <div className="skeleton" style={{ height: 480 }} />
        )}
      </div>
    );
  }

  const biData = bi.state.data;
  const ticketRows = tickets.state.data;
  const slaData = sla.state.data;
  const inventoryRows = inventory.state.status === "ready" ? inventory.state.data : [];
  const contractRows = contracts.state.status === "ready" ? contracts.state.data : [];

  const { portfolioStatus: p, funnel } = biData;
  const occupancy = p.totalUnits > 0 ? Math.round((p.rentedUnits / p.totalUnits) * 100) : null;
  const noShow = funnel.noShowRate;
  const daily = biData.dailyBookings.map((d) => ({ label: dayLabel(d.date), value: d.count }));
  const today = daily.at(-1)?.value ?? 0;
  const yesterday = daily.at(-2)?.value ?? 0;
  const hostsOverSla = slaData.byHost.filter((h) => h.avgAcceptSeconds > SLA).length;

  const escalated = ticketRows.filter((t) => t.status === "ESCALATED");
  const overSla = ticketRows.filter((t) => t.isBreached);
  const pendingInspection = inventoryRows.filter((u) => u.mandateStatus === "PENDING_INSPECTION").length;
  const exiting = inventoryRows.filter((u) => u.mandateStatus === "EXIT_REQUESTED");
  const exitDue = exiting.filter((u) => u.canTerminate || u.exitCountdownDays === 0).length;
  const awaitingSign = contractRows.filter((c) => c.status === "AWAITING_TENANT_SIGN" || c.status === "AWAITING_LANDLORD_SIGN").length;
  const expiring = contractRows.filter((c) => {
    if (c.status !== "ACTIVE") return false;
    const left = Date.parse(c.endDate) - now;
    return left >= 0 && left <= 30 * 86_400_000;
  }).length;

  const workItems = [
    escalated.length > 0 && {
      key: "escalated",
      icon: AlertTriangle,
      bad: true,
      title: `${escalated.length} ticket cần điều phối tay`,
      body: "Đã leo thang qua các tầng nhưng chưa có Host nhận ca.",
      href: "/admin/bookings",
      cta: "Điều phối",
    },
    overSla.length > 0 && {
      key: "sla",
      icon: AlertTriangle,
      bad: true,
      title: `${overSla.length} ticket quá hạn SLA`,
      body: "Host được mời chưa nhận ca trong thời hạn của tầng hiện tại.",
      href: "/admin/bookings",
      cta: "Điều phối",
    },
    pendingInspection > 0 && {
      key: "inspection",
      icon: ClipboardCheck,
      title: `${pendingInspection} căn đang chờ thẩm định ký gửi`,
      body: "Host Thẩm định kiểm tra thực tế; đạt thì căn tự niêm yết.",
      href: "/admin/inventory?tab=requests",
      cta: "Xem",
    },
    exiting.length > 0 && {
      key: "exit",
      icon: Timer,
      title: `${exiting.length} căn đang đếm ngược thoát uỷ quyền`,
      body: exitDue > 0 ? `${exitDue} căn đã đủ 15 ngày, có thể hoàn tất thoát.` : "Hết 15 ngày báo trước mới được hoàn tất thoát.",
      href: "/admin/inventory?tab=exit",
      cta: "Xem",
    },
    expiring + awaitingSign > 0 && {
      key: "contracts",
      icon: FileSignature,
      title: `${expiring + awaitingSign} hợp đồng cần theo dõi`,
      body: [expiring > 0 && `${expiring} HĐ thuê hết hạn trong 30 ngày`, awaitingSign > 0 && `${awaitingSign} HĐ đang chờ ký`].filter(Boolean).join(" · "),
      href: "/admin/contracts",
      cta: "Mở sổ hợp đồng",
    },
  ].filter(Boolean) as { key: string; icon: typeof AlertTriangle; bad?: boolean; title: string; body: string; href: string; cta: string }[];

  const recentTickets = ticketRows.slice(0, 6);

  return (
    <div className={styles.page}>
      {header}

      {failed?.state.status === "error" && (
        <p role="status" className="small" style={{ color: "var(--danger)" }}>
          {failed.state.message} Một số khối đang hiển thị dữ liệu lần tải gần nhất.
        </p>
      )}

      {workItems.length > 0 && (
        <Section title="Việc cần xử lý" flush>
          <ul className={styles.alerts} aria-label="Cần xử lý">
            {workItems.map((w) => (
              <li key={w.key} className={w.bad ? styles.alertBad : undefined}>
                <w.icon size={20} />
                <div>
                  <b>{w.title}</b>
                  <p className="small">{w.body}</p>
                </div>
                <Link href={w.href} className="btn btn-quiet btn-sm">
                  {w.cta} <ArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section flush>
        <div className={styles.kpis}>
          <StatTile
            hero
            label="Tỷ lệ lấp đầy"
            value={occupancy === null ? "—" : String(occupancy)}
            unit={occupancy === null ? undefined : "%"}
            delta={{ text: `${p.rentedUnits}/${p.totalUnits} căn đã cho thuê`, tone: "flat" }}
          />
          <StatTile
            label="Lịch xem đặt mới hôm nay"
            value={String(today)}
            delta={{ text: `so với ${yesterday} hôm qua`, tone: "flat" }}
            spark={daily.slice(-12).map((d) => d.value)}
          />
          <StatTile
            label="Tỷ lệ khách bỏ hẹn"
            value={noShow === null ? "—" : String(noShow)}
            unit={noShow === null ? undefined : "%"}
            delta={noShow === null ? { text: "Chưa có ca xem kết thúc", tone: "flat" } : { text: "mục tiêu ≤ 5%", tone: noShow <= 5 ? "good" : "bad", dir: noShow <= 5 ? "down" : "up" }}
          />
          <StatTile
            label="Host nhận ca trung bình"
            value={slaData.avgAcceptSeconds === null ? "—" : mmss(slaData.avgAcceptSeconds)}
            delta={
              slaData.avgAcceptSeconds === null
                ? { text: "Chưa có ca được nhận", tone: "flat" }
                : { text: `SLA 3′00″ · ${hostsOverSla} Host vượt`, tone: hostsOverSla > 0 ? "bad" : "good", dir: hostsOverSla > 0 ? "up" : "down" }
            }
          />
        </div>
      </Section>

      <div className={styles.two}>
        <Funnel steps={funnel.stages.map((s, i) => ({ key: `stage-${i}`, label: stageLabel(s.stage), value: s.available ? s.count : null }))} />
        <Trend title="Lịch xem đặt mới mỗi ngày" subtitle="14 ngày gần nhất, đã xác thực OTP, không tính lịch đã huỷ" data={daily} seriesName="Lịch xem" />
      </div>

      <div className={styles.two}>
        <Heatmap rows={toHeatRows(biData)} />
        <div className={styles.stackCol}>
          <div className={`card ${styles.padCard}`}>
            <StackBar
              title={`Rổ hàng ký gửi ${p.totalUnits} căn`}
              segments={[
                { label: "Đã cho thuê", value: p.rentedUnits },
                { label: "Đang giữ căn", value: p.holdingUnits },
                { label: "Còn trống", value: p.availableUnits },
              ]}
            />
          </div>
          <div className={`card ${styles.padCard}`}>
            <h3 className={styles.feedTitle}>
              <Clock3 size={17} /> Ticket điều phối gần nhất
            </h3>
            <ul className={styles.feed}>
              {recentTickets.map((t) => (
                <li key={t.ticketId} className={t.isBreached ? styles["t-alert"] : ""}>
                  <div>
                    <b>
                      {t.unitCode} · {TICKET_LABEL[t.status] ?? t.status}
                    </b>
                    <p className="small muted">
                      {t.hostName} · tầng {t.tier}
                      {t.isBreached ? ` · quá hạn ${mmss(t.secondsOverdue)}` : ""}
                    </p>
                  </div>
                  <span className="xs muted">
                    {fmtTime(t.offeredAt)} · {relTime(t.offeredAt, now)}
                  </span>
                </li>
              ))}
              {recentTickets.length === 0 && <li className="muted small">Chưa có ticket điều phối.</li>}
            </ul>
            {ticketRows.length > recentTickets.length && (
              <Link href="/admin/bookings" className="link small">
                Xem tất cả {ticketRows.length} ticket
              </Link>
            )}
          </div>
        </div>
      </div>

      {slaData.byHost.length > 0 ? (
        <BarList
          title="Thời gian nhận ca của Field Host"
          subtitle="Trung bình từ lúc được mời đến lúc bấm nhận ca; mục tiêu nhận ticket trong vòng 3 phút"
          items={slaData.byHost.map((h) => ({ label: `${h.hostName} (${h.accepted} ca)`, value: h.avgAcceptSeconds }))}
          threshold={SLA}
          thresholdLabel="Ngưỡng SLA 3 phút (180 giây)"
          format={mmss}
          unit="Thời gian nhận ca"
        />
      ) : (
        <Section title="Thời gian nhận ca của Field Host" description="Mục tiêu nhận ticket trong vòng 3 phút.">
          <div className={styles.empty}>Chưa có ticket nào được Host nhận để tính thời gian.</div>
        </Section>
      )}
    </div>
  );
}
