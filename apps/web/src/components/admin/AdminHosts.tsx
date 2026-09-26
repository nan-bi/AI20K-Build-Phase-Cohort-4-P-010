"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { fmtPhone, initials, isValidVnPhone, vnd } from "@/lib/mock/format";
import { hostBookings, hostEarnings } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import { HOSTS, ZONES, unitAddress, unitById, zoneById, type FieldHost, type HostStatus } from "@/lib/mock/units";
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
  const [open, setOpen] = useState<FieldHost | null>(null);
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
      <header className={styles.head}>
        <div>
          <h1>Danh sách Field Host</h1>
          <p className="muted">
            {HOSTS.length} Host · {active} đang trực · thù lao là biến phí, không lương cứng
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setInvite(true)}>
          <UserPlus size={17} /> Mời Field Host
        </button>
      </header>

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

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableScroll}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">Field Host</th>
                <th scope="col">Phân khu</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className={styles.right}>Ticket</th>
                <th scope="col" className={styles.right}>Deal</th>
                <th scope="col">Nhận ca TB</th>
                <th scope="col" className={styles.right}>Bỏ hẹn</th>
                <th scope="col" className={styles.right}>Đánh giá</th>
                <th scope="col" className={styles.right}>Thu nhập tuần</th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const e = hostEarnings(state, h, state.fees);
                const slow = h.avgAcceptSec > 180;
                return (
                  <tr key={h.id}>
                    <td>
                      <button type="button" className={`${styles.person} link`} style={{ background: "none", border: 0, padding: 0, textDecoration: "none", textAlign: "left" }} onClick={() => setOpen(h)}>
                        <span className={styles.avatar}>{initials(h.name)}</span>
                        <span>
                          <b>{h.name}</b>
                          <span className="muted xs">{fmtPhone(h.phone)}</span>
                        </span>
                      </button>
                    </td>
                    <td>{h.zones.map((z) => zoneById(z).short).join(", ")}</td>
                    <td>
                      <span className={`badge ${STATUS[h.status].badge}`}>{STATUS[h.status].label}</span>
                    </td>
                    <td className={`${styles.right} tnum`}>{e.viewings}</td>
                    <td className={`${styles.right} tnum`}>{e.deals}</td>
                    <td>
                      <span className={`${slow ? styles.warnText : styles.okText} tnum`}>
                        {slow ? <AlertTriangle size={14} aria-label="Vượt SLA" /> : <CheckCircle2 size={14} aria-label="Đạt SLA" />}
                        {mm(h.avgAcceptSec)}
                      </span>
                    </td>
                    <td className={`${styles.right} tnum`}>{Math.round(h.noShowRate * 100)}%</td>
                    <td className={`${styles.right} tnum`}>{String(h.rating).replace(".", ",")}★</td>
                    <td className={`${styles.right} tnum`}>
                      <b>{vnd(e.total)}đ</b>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    Không có Host nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HostDrawer host={open} onClose={() => setOpen(null)} />
      <InviteModal open={invite} onClose={() => setInvite(false)} />
    </div>
  );
}

function HostDrawer({ host, onClose }: { host: FieldHost | null; onClose: () => void }) {
  const state = useMock();
  const e = host ? hostEarnings(state, host, state.fees) : null;
  const recent = host ? hostBookings(state, host.id).sort((a, b) => b.slot.localeCompare(a.slot)).slice(0, 5) : [];
  return (
    <Modal open={!!host} onClose={onClose} title={host?.name} description={host ? `${host.zones.map((z) => zoneById(z).name).join(", ")} · thẻ ${host.rfid.replace(/\d{2}$/, "••")}` : undefined}>
      {host && e && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <dl className={styles.reqMeta}>
            <div>
              <dt>Điện thoại</dt>
              <dd>{fmtPhone(host.phone)}</dd>
            </div>
            <div>
              <dt>Tham gia</dt>
              <dd>{new Date(host.joined).toLocaleDateString("vi-VN")}</dd>
            </div>
            <div>
              <dt>Nhận ca trung bình</dt>
              <dd>{mm(host.avgAcceptSec)} (SLA 3′00″)</dd>
            </div>
            <div>
              <dt>Khách bỏ hẹn</dt>
              <dd>{Math.round(host.noShowRate * 100)}%</dd>
            </div>
            <div>
              <dt>Đánh giá</dt>
              <dd>{String(host.rating).replace(".", ",")} sao {host.rating >= 4.8 && "· ×" + String(state.fees.ratingMultiplier).replace(".", ",") + " hoa hồng"}</dd>
            </div>
            <div>
              <dt>Thu nhập tuần này</dt>
              <dd>{vnd(e.total)}đ</dd>
            </div>
          </dl>
          <div>
            <h4 style={{ fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 8, letterSpacing: 0 }}>Lịch gần đây</h4>
            {recent.length === 0 ? (
              <p className="muted small">Chưa có lịch nào trong phiên này.</p>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recent.map((b) => (
                  <li key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                    <span>
                      {unitAddress(unitById(b.unitId)!)} · {b.tenant.name}
                    </span>
                    <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-quiet" onClick={() => toast(`Đã gửi lại lời mời cập nhật thẻ RFID cho ${host.name}`)}>
              Gửi lại yêu cầu xác thực RFID
            </button>
            <button type="button" className="btn btn-danger" onClick={() => toast(`Đã tạm ngưng nhận lead của ${host.name}`)}>
              Tạm ngưng nhận lead
            </button>
          </div>
        </div>
      )}
    </Modal>
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
