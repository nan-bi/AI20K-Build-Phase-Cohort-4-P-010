"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, Compass, Lock, Moon, RotateCcw, Search, UserPlus, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { fmtPhone, vnd } from "@/lib/format";
import {
  ACCEPT_SLA_SECONDS,
  adminHostsApi,
  hostErrorText,
  invalidateHosts,
  mmss,
  rolesOfChoice,
  useHostList,
  useHostZones,
  type HostAdminView,
  type HostFilters,
  type HostRoleChoice,
} from "@/lib/admin/hosts";
import { HostRoleRadios } from "./HostRoleRadios";
import { HostsSubnav } from "./HostsSubnav";
import styles from "./Admin.module.css";

export const DUTY_LABEL: Record<HostAdminView["dutyStatus"], { label: string; badge: string; dot: string; hint: string }> = {
  ONLINE_AVAILABLE: { label: "Đang trực", badge: "badge-kelp", dot: styles.dotOn, hint: "Sẵn sàng nhận ca" },
  BUSY_VIEWING: { label: "Đang dẫn khách", badge: "badge-amber-soft", dot: styles.dotBusy, hint: "Đang trong ca xem" },
  OFF_DUTY: { label: "Nghỉ ca", badge: "badge-plain", dot: styles.dotOff, hint: "Không nhận ca mới" },
};

type RoleFilter = "all" | "sale" | "inspector";
type StatusFilter = "all" | HostAdminView["dutyStatus"] | "locked";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Trạng thái hiển thị: tài khoản bị khoá luôn ưu tiên hơn trạng thái trực. */
const statusOf = (h: HostAdminView): StatusFilter => (h.isActive ? h.dutyStatus : "locked");

export function DutyStatus({ host }: { host: HostAdminView }) {
  if (!host.isActive) {
    return (
      <span className={styles.lockedBadge} title="Tài khoản bị khoá: không đăng nhập, không nhận ca">
        <Lock size={11} /> Đã khoá
      </span>
    );
  }
  const d = DUTY_LABEL[host.dutyStatus];
  return (
    <span className={styles.dutyCell} title={d.hint}>
      <span className={`${styles.dot} ${d.dot}`} />
      {d.label}
    </span>
  );
}

export function AcceptTime({ seconds }: { seconds: number | null }) {
  if (seconds === null) return <span className="muted">—</span>;
  const slow = seconds > ACCEPT_SLA_SECONDS;
  return (
    <span className={`${slow ? styles.warnText : styles.okText} tnum`} title={slow ? "Vượt SLA 3 phút" : "Trong SLA 3 phút"}>
      {slow ? <AlertTriangle size={14} aria-label="Vượt SLA" /> : <CheckCircle2 size={14} aria-label="Đạt SLA" />}
      {mmss(seconds)}
    </span>
  );
}

export function AdminHosts() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [zone, setZone] = useState("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Bộ đếm KPI/pill tính trên toàn bộ Host; bộ lọc tìm/phân khu/vai gửi backend.
  const all = useHostList({});
  const filters: HostFilters = {
    q: debouncedQ,
    role: roleFilter === "all" ? undefined : roleFilter,
    zone: zone === "all" ? undefined : zone,
  };
  const list = useHostList(filters);
  const zones = useHostZones();
  const zoneOptions = zones.state.status === "ready" ? zones.state.data : [];

  const everyone = all.state.status === "ready" ? all.state.data : [];
  const count = (s: StatusFilter) => everyone.filter((h) => statusOf(h) === s).length;
  const sale = everyone.filter((h) => h.roles.includes("sale")).length;
  const inspector = everyone.filter((h) => h.roles.includes("inspector")).length;

  const matched = list.state.status === "ready" ? list.state.data : [];
  const rows = status === "all" ? matched : matched.filter((h) => statusOf(h) === status);
  const isFiltered = q !== "" || zone !== "all" || roleFilter !== "all" || status !== "all";

  function resetFilters() {
    setQ("");
    setZone("all");
    setRoleFilter("all");
    setStatus("all");
  }

  const pills: { key: StatusFilter; label: string; dot?: string; icon?: typeof Lock }[] = [
    { key: "all", label: "Tất cả" },
    { key: "ONLINE_AVAILABLE", label: "Đang trực", dot: styles.dotOn },
    { key: "BUSY_VIEWING", label: "Đang dẫn khách", dot: styles.dotBusy },
    { key: "OFF_DUTY", label: "Nghỉ ca", dot: styles.dotOff },
    { key: "locked", label: "Đã khoá", icon: Lock },
  ];

  const columns: DataTableColumn<HostAdminView>[] = [
    {
      key: "host",
      header: "Field Host",
      render: (h) => (
        <span className={styles.person}>
          <span className={styles.avatar}>{initials(h.fullName ?? h.email ?? "?")}</span>
          <span>
            <b>{h.fullName ?? "(chưa có tên)"}</b>
            <span className="muted xs" style={{ display: "block" }}>
              {h.phone ? fmtPhone(h.phone) : h.email}
            </span>
          </span>
        </span>
      ),
    },
    { key: "zone", header: "Phân khu", render: (h) => h.assignedZone },
    {
      key: "roles",
      header: "Vai",
      render: (h) => (
        <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
          {h.roles.includes("sale") && <span className="badge badge-kelp">Sale</span>}
          {h.roles.includes("inspector") && <span className="badge badge-plain">Thẩm định</span>}
        </span>
      ),
    },
    { key: "status", header: "Trạng thái", render: (h) => <DutyStatus host={h} /> },
    { key: "viewings", header: "Ca đã dẫn", align: "right", render: (h) => h.stats.completedViewings },
    { key: "deals", header: "Deal", align: "right", render: (h) => h.stats.deals },
    { key: "accept", header: "Nhận ca TB", render: (h) => <AcceptTime seconds={h.stats.avgAcceptSeconds} /> },
    {
      key: "noshow",
      header: "Bỏ hẹn",
      align: "right",
      render: (h) => (h.stats.noShowRate === null ? <span className="muted">—</span> : `${String(h.stats.noShowRate).replace(".", ",")}%`),
    },
    { key: "rating", header: "Đánh giá", align: "right", render: (h) => `${String(h.rating).replace(".", ",")}★` },
    { key: "earn", header: "Thu nhập tuần", align: "right", render: (h) => <b>{vnd(h.stats.weekEarnings)}đ</b> },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Danh sách Field Host"
        description="Mạng lưới Host đón khách tại sảnh và thẩm định căn ký gửi · thù lao biến phí theo hiệu quả, không lương cứng"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <UserPlus size={17} /> Thêm Field Host
          </button>
        }
      />

      <HostsSubnav />

      <div className={styles.kpiStrip}>
        <Kpi icon={Users} value={`${everyone.length} Field Host`} label={`${sale} Sale · ${inspector} Thẩm định`} />
        <Kpi icon={Activity} value={`${count("ONLINE_AVAILABLE")} đang trực`} label="Sẵn sàng đón khách tại sảnh" />
        <Kpi icon={Compass} value={`${count("BUSY_VIEWING")} đang dẫn khách`} label="Đang trong ca xem thực địa" />
        <Kpi icon={Moon} value={`${count("OFF_DUTY")} nghỉ ca`} label={count("locked") > 0 ? `${count("locked")} tài khoản đã khoá` : "Không nhận ca mới"} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tools}>
          <label className={styles.search}>
            <Search size={16} />
            <span className="sr-only">Tìm Host</span>
            <input className="input" placeholder="Tìm theo tên, email hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="select" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Lọc theo phân khu">
            <option value="all">Mọi phân khu</option>
            {zoneOptions.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} aria-label="Lọc theo vai">
            <option value="all">Mọi vai</option>
            <option value="sale">Sale (dẫn khách)</option>
            <option value="inspector">Kiêm Thẩm định (ký gửi)</option>
          </select>
        </div>
        <div className={styles.quickRow}>
          <div className={styles.pills} role="tablist" aria-label="Lọc nhanh trạng thái">
            {pills.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={status === p.key}
                className={`${styles.pill} ${status === p.key ? styles.pillActive : ""}`}
                onClick={() => setStatus(p.key)}
              >
                {p.dot && <span className={`${styles.dot} ${p.dot}`} />}
                {p.icon && <p.icon size={12} />}
                {p.label} ({p.key === "all" ? everyone.length : count(p.key)})
              </button>
            ))}
          </div>
          <span className={styles.resultCount}>
            Hiển thị <b>{rows.length}</b> / {everyone.length} Host
            {isFiltered && (
              <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                <RotateCcw size={13} /> Đặt lại bộ lọc
              </button>
            )}
          </span>
        </div>
      </div>

      {list.state.status === "loading" && <div className="skeleton" style={{ height: 360 }} />}
      {list.state.status === "error" && (
        <div role="alert" className="card">
          <p>{list.state.message}</p>
          <button type="button" className="btn btn-quiet" onClick={list.reload}>
            Thử lại
          </button>
        </div>
      )}
      {list.state.status === "ready" && (
        <section className={`card ${styles.tableCard}`}>
          <DataTable<HostAdminView>
            columns={columns}
            rows={rows}
            rowHref={(h) => `/admin/hosts/${h.id}`}
            empty={<span className="muted">Không có Host nào khớp bộ lọc.</span>}
          />
        </section>
      )}
      <p className="muted xs">
        Nhận ca TB: thời gian từ lúc hệ thống mời đến lúc Host bấm nhận, mục tiêu ≤ 3 phút. Bỏ hẹn: tỷ lệ khách không đến trên các ca Host đã nhận. Bấm vào một hàng để mở hồ sơ Host.
      </p>

      <CreateHostModal open={creating} zones={zoneOptions} onClose={() => setCreating(false)} />
    </div>
  );
}

function Kpi({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon}>
        <Icon size={20} />
      </div>
      <div>
        <div className={styles.kpiVal}>{value}</div>
        <div className={styles.kpiLabel}>{label}</div>
      </div>
    </div>
  );
}

function CreateHostModal({ open, zones, onClose }: { open: boolean; zones: string[]; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [zone, setZone] = useState("");
  const [roleChoice, setRoleChoice] = useState<HostRoleChoice>("sale");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const chosenZone = zone || zones[0] || "";
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || fullName.trim().length < 2) {
      return setErr("Nhập email và họ tên hợp lệ.");
    }
    if (!chosenZone) return setErr("Chọn phân khu phụ trách.");
    if (password && password.length < 8) return setErr("Mật khẩu tối thiểu 8 ký tự (hoặc để trống).");
    setBusy(true);
    setErr("");
    const res = await adminHostsApi.create({
      email: email.trim(),
      fullName: fullName.trim(),
      assignedZone: chosenZone,
      roles: rolesOfChoice(roleChoice),
      ...(password ? { password } : {}),
    });
    setBusy(false);
    if (!res.ok) return setErr(hostErrorText(res));
    toast(`Đã thêm Field Host ${res.data.fullName ?? res.data.email}`, "success");
    invalidateHosts();
    setEmail("");
    setFullName("");
    setPassword("");
    setRoleChoice("sale");
    onClose();
    router.push(`/admin/hosts/${res.data.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Thêm Field Host"
      description="Admin tạo tài khoản. Host đăng nhập bằng email này (Google hoặc mật khẩu) và tự xác thực số điện thoại trong hồ sơ."
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={submit}>
          Thêm Host
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="field">
          <span className="label">Email đăng nhập</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Họ và tên</span>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Phân khu phụ trách</span>
          <select className="select" value={chosenZone} onChange={(e) => setZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="label">Vai đảm nhiệm</span>
          <HostRoleRadios name="create-host-role" value={roleChoice} onChange={setRoleChoice} />
        </div>

        <label className="field">
          <span className="label">Mật khẩu ban đầu (tuỳ chọn)</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="muted xs">Để trống nếu Host chỉ đăng nhập bằng Google.</span>
        </label>

        {err && (
          <p className="field-error" role="alert">
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}
