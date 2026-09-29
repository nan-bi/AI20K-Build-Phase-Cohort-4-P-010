"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, UserPlus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { fmtPhone, initials, isValidVnPhone, vnd } from "@/lib/mock/format";
import { hostEarnings, hostRoles } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import {
  HOSTS,
  ZONES,
  zoneById,
  type FieldHost,
  type HostRole,
  type HostStatus,
} from "@/lib/mock/units";
import styles from "./Admin.module.css";

const STATUS: Record<HostStatus, { label: string; badge: string }> = {
  active: { label: "Đang trực", badge: "badge-kelp" },
  busy: { label: "Đang bận", badge: "badge-amber-soft" },
  off_duty: { label: "Nghỉ ca", badge: "badge-plain" },
};

const mm = (s: number) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, "0")}″`;

type RoleFilter = "all" | "sale" | "inspector" | "both";

export function AdminHosts() {
  const state = useMock();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<HostStatus | "all">("all");
  const [zone, setZone] = useState("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [invite, setInvite] = useState(false);

  if (!state.ready) return <div className="skeleton" style={{ height: 360 }} />;

  const list = HOSTS.filter((h) => {
    const roles = hostRoles(state, h.id);
    const roleMatch =
      roleFilter === "all" ||
      (roleFilter === "both" && roles.includes("sale") && roles.includes("inspector")) ||
      (roleFilter === "sale" && roles.includes("sale") && !roles.includes("inspector")) ||
      (roleFilter === "inspector" && roles.includes("inspector") && !roles.includes("sale"));

    return (
      (status === "all" || h.status === status) &&
      (zone === "all" || h.zones.includes(zone as never)) &&
      roleMatch &&
      (q === "" ||
        h.name.toLowerCase().includes(q.toLowerCase()) ||
        h.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
    );
  });

  const active = HOSTS.filter((h) => h.status === "active").length;
  const saleCount = HOSTS.filter((h) => hostRoles(state, h.id).includes("sale")).length;
  const inspectorCount = HOSTS.filter((h) => hostRoles(state, h.id).includes("inspector")).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Danh sách Field Host"
        description={`${HOSTS.length} Host · ${saleCount} Sale · ${inspectorCount} Thẩm định · ${active} đang trực · thù lao là biến phí, không lương cứng`}
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
          <input
            className="input"
            placeholder="Tìm theo tên hoặc số điện thoại"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as HostStatus | "all")}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang trực</option>
          <option value="busy">Đang bận</option>
          <option value="off_duty">Nghỉ ca</option>
        </select>
        <select
          className="select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          aria-label="Lọc theo vai"
        >
          <option value="all">Mọi vai</option>
          <option value="sale">Sale</option>
          <option value="inspector">Thẩm định</option>
          <option value="both">Cả hai</option>
        </select>
        <select
          className="select"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          aria-label="Lọc theo phân khu"
        >
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
            {
              key: "zone",
              header: "Phân khu",
              render: (h) => h.zones.map((z) => zoneById(z).short).join(", "),
            },
            {
              key: "roles",
              header: "Vai",
              render: (h) => {
                const roles = hostRoles(state, h.id);
                return (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {roles.includes("sale") && <span className="badge badge-kelp">Sale</span>}
                    {roles.includes("inspector") && (
                      <span className="badge badge-plain">Thẩm định</span>
                    )}
                  </div>
                );
              },
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (h) => (
                <span className={`badge ${STATUS[h.status].badge}`}>{STATUS[h.status].label}</span>
              ),
            },
            {
              key: "tickets",
              header: "Ticket",
              align: "right",
              render: (h) => hostEarnings(state, h, state.fees).viewings,
            },
            {
              key: "deals",
              header: "Deal",
              align: "right",
              render: (h) => hostEarnings(state, h, state.fees).deals,
            },
            {
              key: "accept",
              header: "Nhận ca TB",
              render: (h) => {
                const slow = h.avgAcceptSec > 180;
                return (
                  <span className={`${slow ? styles.warnText : styles.okText} tnum`}>
                    {slow ? (
                      <AlertTriangle size={14} aria-label="Vượt SLA" />
                    ) : (
                      <CheckCircle2 size={14} aria-label="Đạt SLA" />
                    )}
                    {mm(h.avgAcceptSec)}
                  </span>
                );
              },
            },
            {
              key: "noshow",
              header: "Bỏ hẹn",
              align: "right",
              render: (h) => `${Math.round(h.noShowRate * 100)}%`,
            },
            {
              key: "rating",
              header: "Đánh giá",
              align: "right",
              render: (h) => `${String(h.rating).replace(".", ",")}★`,
            },
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
  const [roles, setRoles] = useState<HostRole[]>(["sale"]);
  const [err, setErr] = useState("");

  const toggleRole = (r: HostRole) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Mời Field Host mới"
      description="Host nhận lời mời qua Zalo, đăng nhập và kích hoạt tài khoản theo vai được gán."
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            if (name.trim().length < 2 || !isValidVnPhone(phone)) {
              setErr("Nhập họ tên và số điện thoại hợp lệ.");
              return;
            }
            if (roles.length === 0) {
              setErr("Chọn ít nhất một vai cho Field Host.");
              return;
            }
            toast(
              `Đã gửi lời mời vai ${roles.map((r) => (r === "sale" ? "Sale" : "Thẩm định")).join(" + ")} qua Zalo tới ${name.trim()}`,
              "success",
            );
            setName("");
            setPhone("");
            setRoles(["sale"]);
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
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
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

        <div className="field">
          <span className="label">Vai đảm nhiệm</span>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <label className="check">
              <input
                type="checkbox"
                checked={roles.includes("sale")}
                onChange={() => toggleRole("sale")}
              />
              <span>Sale (Dẫn khách xem phòng)</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={roles.includes("inspector")}
                onChange={() => toggleRole("inspector")}
              />
              <span>Thẩm định (Kiểm tra 32 hạng mục)</span>
            </label>
          </div>
        </div>

        {err && <p className="field-error">{err}</p>}
      </div>
    </Modal>
  );
}
