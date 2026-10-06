"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { adminApi, useAdminDispatch, type AdminDispatchTicket } from "@/lib/admin/api";
import { useHostList } from "@/lib/admin/hosts";
import { fmtTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

const OPEN = new Set(["OFFERED", "EXPIRED", "ESCALATED"]);
const ticketLabel: Record<string, string> = {
  OFFERED: "Đang chờ Host",
  ACCEPTED: "Đã nhận ca",
  CHECKED: "Đã đến điểm hẹn",
  COMPLETED: "Hoàn tất",
  EXPIRED: "Hết thời gian phản hồi",
  ESCALATED: "Đã chuyển tầng điều phối",
  CANCELLED: "Đã huỷ",
};

type Filter = "today" | "open" | "all";

export function AdminBookings() {
  const tickets = useAdminDispatch();
  const hosts = useHostList({ active: true });
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>("open");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const all = useMemo(
    () => tickets.state.status === "ready" ? [...tickets.state.data].sort((a, b) => a.viewingSlot.localeCompare(b.viewingSlot)) : [],
    [tickets.state],
  );
  const list = useMemo(() => all.filter((ticket) => {
    if (filter === "all") return true;
    if (filter === "today") return new Date(ticket.viewingSlot).toDateString() === new Date(now).toDateString();
    return OPEN.has(ticket.status);
  }), [all, filter, now]);
  const breaches = all.filter((ticket) => OPEN.has(ticket.status) && Date.parse(ticket.deadlineAt) < now).length;

  async function reassign(ticket: AdminDispatchTicket) {
    const hostId = pick[ticket.ticketId];
    const why = reason[ticket.ticketId]?.trim();
    if (!hostId || !why) return;
    setSaving(ticket.ticketId);
    const res = await adminApi.reassign(ticket.viewingId, hostId, why);
    setSaving(null);
    if (!res.ok) {
      toast(res.message || "Không thể điều phối lại ca xem.");
      return;
    }
    toast(res.data.message || `Đã điều phối lại ${ticket.bookingRef}.`, "success");
    setPick((prev) => ({ ...prev, [ticket.ticketId]: "" }));
    setReason((prev) => ({ ...prev, [ticket.ticketId]: "" }));
    tickets.reload();
  }

  const columns: DataTableColumn<AdminDispatchTicket>[] = [
    { key: "viewingSlot", header: "Giờ hẹn", render: (ticket) => <><b className="tnum">{fmtTime(ticket.viewingSlot)}</b><span className="muted xs" style={{ display: "block" }}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(ticket.viewingSlot))}</span></> },
    { key: "unitCode", header: "Căn hộ", render: (ticket) => <><b>{ticket.unitCode}</b><span className="muted xs" style={{ display: "block" }}>{ticket.building} · {ticket.bookingRef}</span></> },
    { key: "host", header: "Field Host", render: (ticket) => <><span>{ticket.hostName}</span><span className="muted xs" style={{ display: "block" }}>Tầng điều phối {ticket.tier}</span></> },
    { key: "status", header: "Ticket", render: (ticket) => <span className={`badge ${OPEN.has(ticket.status) ? "badge-coral-soft" : "badge-plain"}`}>{ticketLabel[ticket.status] ?? ticket.status}</span> },
    { key: "sla", header: "SLA nhận ca", render: (ticket) => {
      const remaining = Math.ceil((Date.parse(ticket.deadlineAt) - now) / 1000);
      if (OPEN.has(ticket.status) && remaining <= 0) return <span className={styles.warnText}><AlertTriangle size={14} /> Quá {Math.floor(Math.abs(remaining) / 60)} phút</span>;
      if (OPEN.has(ticket.status)) return <span className="muted tnum">Còn {Math.max(0, remaining)} giây</span>;
      return <span className={styles.okText}><CheckCircle2 size={14} /> Đã phản hồi</span>;
    } },
    { key: "dispatch", header: "Điều phối lại", render: (ticket) => OPEN.has(ticket.status) ? <div style={{ display: "grid", gap: 5, minWidth: 190 }}>
      <select className="select" style={{ minHeight: 34 }} value={pick[ticket.ticketId] ?? ""} onChange={(e) => setPick({ ...pick, [ticket.ticketId]: e.target.value })} aria-label={`Giao ticket ${ticket.bookingRef} cho Host`}>
        <option value="">Chọn Host đang trực…</option>
        {hosts.state.status === "ready" && hosts.state.data.filter((host) => host.dutyStatus === "ONLINE_AVAILABLE" && host.id !== ticket.hostId).map((host) => <option key={host.id} value={host.id}>{host.fullName || host.email || host.id} · {host.assignedZone}</option>)}
      </select>
      <input className="input" value={reason[ticket.ticketId] ?? ""} onChange={(e) => setReason({ ...reason, [ticket.ticketId]: e.target.value })} placeholder="Lý do điều phối" aria-label={`Lý do giao ticket ${ticket.bookingRef}`} />
      <button type="button" className="btn btn-quiet btn-sm" disabled={!pick[ticket.ticketId] || !reason[ticket.ticketId]?.trim() || saving === ticket.ticketId || hosts.state.status !== "ready"} onClick={() => void reassign(ticket)}>{saving === ticket.ticketId ? "Đang lưu…" : "Giao ca"}</button>
    </div> : <span className="muted">—</span> },
  ];

  return <div className={styles.page}>
    <PageHeader title="Điều phối lịch xem" description="Lịch xem và thời hạn phản hồi được tải trực tiếp từ ticket điều phối trong hệ thống." />
    <div className={styles.tabs} role="tablist">
      {([ ["open", "Đang xử lý"], ["today", "Hôm nay"], ["all", "Tất cả"] ] as [Filter, string][]).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    {breaches > 0 && <p className={styles.warnText}><AlertTriangle size={16} /> {breaches} ticket quá hạn theo SLA đã lưu</p>}
    {tickets.state.status === "loading" ? <div className="skeleton" style={{ height: 360 }} /> : tickets.state.status === "error" ? <div role="alert"><p>{tickets.state.message}</p><button className="btn btn-secondary btn-sm" onClick={tickets.reload}>Thử lại</button></div> : <DataTable<AdminDispatchTicket> columns={columns} rows={list} empty={<span className="muted">Không có ticket trong dữ liệu hiện tại.</span>} />}
    {hosts.state.status === "error" && <p role="alert" className="small muted">Không tải được danh sách Host: {hosts.state.message}</p>}
  </div>;
}
