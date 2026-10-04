"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardCheck, Clock3, Timer } from "lucide-react";
import { AdminBiSlaPanel } from "./AdminBiSlaPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { fmtTime, relTime } from "@/lib/mock/format";
import { noticesFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { contractKpis, contractRows } from "@/lib/mock/contracts";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

export function AdminDashboard() {
  const state = useMock();
  const now = useNow(1000);
  if (!state.ready || !now) return <div className="skeleton" style={{ height: 480 }} />;

  const pendingCs = state.consignments.filter((c) => c.status === "reviewing").length;
  const exiting = Object.values(state.mandates).filter((m) => m.status === "exiting");
  const feed = noticesFor(state, "admin").slice(0, 8);

  const cRows = contractRows(state, now);
  const cKpis = contractKpis(cRows);
  const exitDueCount = cRows.filter((r) => r.status === "exit_due").length;
  const expiringCount = cRows.filter((r) => r.status === "expiring" && r.needsAction).length;

  const workItems = [
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
      <PageHeader title="Tổng quan vận hành" description="Vinhomes Ocean Park 1 · BI/SLA lấy từ backend; các khối vận hành khác vẫn dùng dữ liệu demo." />

      {workItems.length > 0 && (
        <Section title="Việc cần xử lý (demo)" flush>
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

      <AdminBiSlaPanel />

      <Section title="Dòng sự kiện (demo)" flush>
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
      </Section>
    </div>
  );
}
