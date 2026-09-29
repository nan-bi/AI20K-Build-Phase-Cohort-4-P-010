"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardCheck, Clock3, Timer } from "lucide-react";
import { BarList } from "@/components/charts/BarList";
import { Funnel } from "@/components/charts/Funnel";
import { Heatmap } from "@/components/charts/Heatmap";
import { StackBar } from "@/components/charts/StackBar";
import { StatTile } from "@/components/charts/StatTile";
import { Trend } from "@/components/charts/Trend";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { dayLabel, fmtTime, relTime } from "@/lib/mock/format";
import { funnel, noShowRate, noticesFor, unitStatus } from "@/lib/mock/selectors";
import { dailyBookings, heatRows, occupancyOverall } from "@/lib/mock/stats";
import { useMock } from "@/lib/mock/store";
import { HOSTS, UNITS } from "@/lib/mock/units";
import { contractKpis, contractRows } from "@/lib/mock/contracts";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

const SLA = 180;

export function AdminDashboard() {
  const state = useMock();
  const now = useNow(1000);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 480 }} />;

  const occ = occupancyOverall(state);
  const overSla = state.bookings.filter((b) => b.status === "pending" && now - new Date(b.createdAt).getTime() > SLA * 1000);
  const pendingCs = state.consignments.filter((c) => c.status === "reviewing").length;
  const exiting = Object.values(state.mandates).filter((m) => m.status === "exiting");
  const nsr = noShowRate(state);
  const daily = dailyBookings(state, now);
  const todayCount = state.bookings.filter((b) => dayLabel(b.slot, now) === "Hôm nay" && !["cancelled", "rejected"].includes(b.status)).length;
  const avgAccept = Math.round(HOSTS.reduce((s, h) => s + h.avgAcceptSec, 0) / HOSTS.length);
  const holding = UNITS.filter((u) => unitStatus(state, u) === "holding").length;
  const counts = { rented: Math.max(0, occ.used - holding), holding, available: occ.total - occ.used };
  const feed = noticesFor(state, "admin").slice(0, 8);

  const cRows = contractRows(state, now);
  const cKpis = contractKpis(cRows);
  const exitDueCount = cRows.filter((r) => r.status === "exit_due").length;
  const expiringCount = cRows.filter((r) => r.status === "expiring" && r.needsAction).length;

  const workItems = [
    overSla.length > 0 && {
      key: "sla",
      icon: AlertTriangle,
      bad: true,
      title: `${overSla.length} ticket quá SLA 3 phút`,
      body: "Chưa có Host nhận, đã chuyển Open Pool 500m.",
      href: "/admin/bookings",
      cta: "Điều phối",
    },
    pendingCs > 0 && {
      key: "cs",
      icon: ClipboardCheck,
      title: `${pendingCs} báo cáo thẩm định chờ duyệt`,
      body: "Field Host đã nộp báo cáo % độ mới, chờ Admin chốt ký gửi.",
      href: "/admin/inventory?tab=requests",
      cta: "Xem",
    },
    exiting.length > 0 && {
      key: "exit",
      icon: Timer,
      title: `${exiting.length} căn đang đếm ngược thoát uỷ quyền`,
      body: "Hết 15 ngày hệ thống tự gỡ mã cửa khỏi mạng lưới Host.",
      href: "/admin/inventory?tab=exit",
      cta: "Xem",
    },
    cKpis.needsAction > 0 && {
      key: "contracts",
      icon: Clock3,
      bad: true,
      title: `${cKpis.needsAction} hợp đồng cần xử lý`,
      body: `${exitDueCount > 0 ? `${exitDueCount} quá hạn offboard` : ""}${exitDueCount > 0 && expiringCount > 0 ? " · " : ""}${expiringCount > 0 ? `${expiringCount} HĐ sắp hết hạn chưa nhắc` : ""}`,
      href: "/admin/contracts",
      cta: "Mở sổ hợp đồng",
    },
  ].filter(Boolean) as { key: string; icon: typeof AlertTriangle; bad?: boolean; title: string; body: string; href: string; cta: string }[];

  return (
    <div className={styles.page}>
      <PageHeader title="Tổng quan vận hành" description="Vinhomes Ocean Park 1 · dữ liệu tuần này, cập nhật theo thời gian thực" />

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
          <StatTile hero label="Tỷ lệ lấp đầy" value={`${Math.round(occ.rate * 100)}`} unit="%" delta={{ text: "+2 điểm so với tuần trước", tone: "good", dir: "up" }} spark={[71, 72, 72, 74, 73, 75, 76, 76, 77, 78, 78, Math.round(occ.rate * 100)]} />
          <StatTile label="Lịch xem hôm nay" value={String(todayCount)} delta={{ text: "so với 11 hôm qua", tone: "flat" }} spark={daily.slice(-12).map((d) => d.value)} />
          <StatTile label="Tỷ lệ khách bỏ hẹn" value={`${Math.round(nsr * 100)}`} unit="%" delta={{ text: "mục tiêu ≤ 5%", tone: nsr <= 0.05 ? "good" : "bad", dir: nsr <= 0.05 ? "down" : "up" }} />
          <StatTile label="Host nhận ca trung bình" value={`${Math.floor(avgAccept / 60)}′${String(avgAccept % 60).padStart(2, "0")}″`} delta={{ text: `SLA 3′00″ · ${HOSTS.filter((h) => h.avgAcceptSec > SLA).length} Host vượt`, tone: "bad", dir: "up" }} />
        </div>
      </Section>

      <div className={styles.two}>
        <Funnel steps={funnel(state)} />
        <Trend title="Lịch xem đặt mới mỗi ngày" subtitle="14 ngày gần nhất, đã xác thực OTP Zalo" data={daily} seriesName="Lịch xem" />
      </div>

      <div className={styles.two}>
        <Heatmap rows={heatRows(state)} />
        <div className={styles.stackCol}>
          <div className={`card ${styles.padCard}`}>
            <StackBar title={`Rổ hàng ký gửi ${occ.total} căn`} segments={[{ label: "Đã cho thuê", value: counts.rented }, { label: "Đang giữ căn", value: counts.holding }, { label: "Còn trống", value: counts.available }]} />
          </div>
          <div className={`card ${styles.padCard}`}>
            <h3 className={styles.feedTitle}>
              <Clock3 size={17} /> Dòng sự kiện
            </h3>
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
              {feed.length === 0 && <li className="muted small">Chưa có sự kiện.</li>}
            </ul>
          </div>
        </div>
      </div>

      <BarList
        title="Thời gian nhận ca của Field Host"
        subtitle="Trung bình tuần này; mục tiêu nhận ticket trong vòng 3 phút"
        items={HOSTS.map((h) => ({ label: h.name, value: h.avgAcceptSec }))}
        threshold={SLA}
        thresholdLabel="Ngưỡng SLA 3 phút (180 giây)"
        format={(v) => `${Math.floor(v / 60)}′${String(v % 60).padStart(2, "0")}″`}
        unit="Thời gian nhận ca"
      />
    </div>
  );
}
