"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, UserPlus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { fmtPhone, initials, isValidVnPhone, vnd } from "@/lib/mock/format";
import { hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { HOSTS, ZONES, zoneById, type FieldHost, type HostStatus } from "@/lib/mock/units";
import styles from "./Admin.module.css";

const STATUS: Record<HostStatus, { label: string; badge: string }> = {
  active: { label: "Đang trực", badge: "badge-kelp" },
  busy: { label: "Đang bận", badge: "badge-amber-soft" },
  off_duty: { label: "Nghỉ ca", badge: "badge-plain" },
};

const mm = (s: number) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, "0")}″`;

export function AdminHosts() {
  const state = useMock();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<HostStatus | "all">("all");
  const [zone, setZone] = useState("all");
  const [invite, setInvite] = useState(false);

  if (!state.ready) return <div className="skeleton" style={{ height: 360 }} />;

  const list = HOSTS.filter(
    (h) =>
      (status === "all" || h.status === status) &&
      (zone === "all" || h.zones.includes(zone as never)) &&
      (q === "" || h.name.toLowerCase().includes(q.toLowerCase()) || h.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))),
  );
  const active = HOSTS.filter((h) => h.status === "active").length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Danh sách Field Host"
        description={`${HOSTS.length} Host · ${active} đang trực · thù lao là biến phí, không lương cứng`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setInvite(true)}>
            <UserPlus size={17} /> Mời Field Host
          </button>
        }
      />

      <div className={styles.tools}>
        <label className={styles.search}>
          <Search size={16} />
          <span className="sr-only">Tìm Host</span>
          <input className="input" placeholder="Tìm theo tên hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as HostStatus | "all")} aria-label="Lọc theo trạng thái">
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang trực</option>
          <option value="busy">Đang bận</option>
          <option value="off_duty">Nghỉ ca</option>
        </select>
        <select className="select" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Lọc theo phân khu">
          <option value="all">Mọi phân khu</option>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable<FieldHost>
        columns={
          [
            {
              key: "host",
              header: "Field Host",
              render: (h) => (
                <span className={styles.person}>
                  <span className={styles.avatar}>{initials(h.name)}</span>
                  <span>
                    <b>{h.name}</b>
                    <span className="muted xs">{fmtPhone(h.phone)}</span>
                  </span>
                </span>
              ),
            },
            { key: "zone", header: "Phân khu", render: (h) => h.zones.map((z) => zoneById(z).short).join(", ") },
            { key: "status", header: "Trạng thái", render: (h) => <span className={`badge ${STATUS[h.status].badge}`}>{STATUS[h.status].label}</span> },
            { key: "tickets", header: "Ticket", align: "right", render: (h) => hostEarnings(state, h, state.fees).viewings },
            { key: "deals", header: "Deal", align: "right", render: (h) => hostEarnings(state, h, state.fees).deals },
            {
              key: "accept",
              header: "Nhận ca TB",
              render: (h) => {
                const slow = h.avgAcceptSec > 180;
                return (
                  <span className={`${slow ? styles.warnText : styles.okText} tnum`}>
                    {slow ? <AlertTriangle size={14} aria-label="Vượt SLA" /> : <CheckCircle2 size={14} aria-label="Đạt SLA" />}
                    {mm(h.avgAcceptSec)}
                  </span>
                );
              },
            },
            { key: "noshow", header: "Bỏ hẹn", align: "right", render: (h) => `${Math.round(h.noShowRate * 100)}%` },
            { key: "rating", header: "Đánh giá", align: "right", render: (h) => `${String(h.rating).replace(".", ",")}★` },
            {
              key: "earn",
              header: "Thu nhập tuần",
              align: "right",
              render: (h) => <b>{vnd(hostEarnings(state, h, state.fees).total)}đ</b>,
            },
          ] satisfies DataTableColumn<FieldHost>[]
        }
        rows={list}
        rowHref={(h) => `/admin/hosts/${h.id}`}
        empty={<span className="muted">Không có Host nào khớp bộ lọc.</span>}
      />

      <InviteModal open={invite} onClose={() => setInvite(false)} />
    </div>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState<string>(ZONES[0].id);
  const [err, setErr] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Mời Field Host mới"
      description="Host nhận lời mời qua Zalo, đăng nhập và nhập mã thẻ cư dân RFID để kích hoạt."
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            if (name.trim().length < 2 || !isValidVnPhone(phone)) {
              setErr("Nhập họ tên và số điện thoại hợp lệ.");
              return;
            }
            toast(`Đã gửi lời mời qua Zalo tới ${name.trim()}`, "success");
            setName("");
            setPhone("");
            setErr("");
            onClose();
          }}
        >
          Gửi lời mời
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="field">
          <span className="label">Họ và tên</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Số điện thoại Zalo</span>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Phân khu phụ trách</span>
          <select className="select" value={zone} onChange={(e) => setZone(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        {err && <p className="field-error">{err}</p>}
      </div>
    </Modal>
  );
}
