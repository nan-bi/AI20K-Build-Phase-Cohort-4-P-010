"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import type { HostRoleCode } from "@/lib/auth/portals";
import {
  adminHostsApi,
  hostErrorText,
  invalidateHosts,
  useHostList,
  useHostZones,
  type HostAdminView,
  type HostFilters,
} from "@/lib/admin/hosts";
import styles from "./Admin.module.css";

export const DUTY_LABEL: Record<HostAdminView["dutyStatus"], { label: string; badge: string }> = {
  ONLINE_AVAILABLE: { label: "Đang trực", badge: "badge-kelp" },
  BUSY_VIEWING: { label: "Đang bận", badge: "badge-amber-soft" },
  OFF_DUTY: { label: "Nghỉ ca", badge: "badge-plain" },
};

export const ROLE_LABEL: Record<HostRoleCode, string> = { sale: "Sale", inspector: "Thẩm định" };

type RoleFilter = "all" | "sale" | "inspector" | "both";
type ActiveFilter = "all" | "true" | "false";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const fmtLogin = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN") : "Chưa đăng nhập");

export function AdminHosts() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [zone, setZone] = useState("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const filters: HostFilters = {
    q: debouncedQ,
    role: roleFilter === "all" ? undefined : roleFilter,
    zone: zone === "all" ? undefined : zone,
    active: active === "all" ? undefined : active === "true",
  };
  const list = useHostList(filters);
  const zones = useHostZones();
  const zoneOptions = zones.state.status === "ready" ? zones.state.data : [];

  const rows = list.state.status === "ready" ? list.state.data : [];
  const sale = rows.filter((h) => h.roles.includes("sale")).length;
  const inspector = rows.filter((h) => h.roles.includes("inspector")).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Danh sách Field Host"
        description={
          list.state.status === "ready"
            ? `${rows.length} Host · ${sale} Sale · ${inspector} Thẩm định · thù lao là biến phí, không lương cứng`
            : "Đang tải…"
        }
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <UserPlus size={17} /> Thêm Field Host
          </button>
        }
      />

      <div className={styles.tools}>
        <label className={styles.search}>
          <Search size={16} />
          <span className="sr-only">Tìm Host</span>
          <input
            className="input"
            placeholder="Tìm theo tên, email hoặc số điện thoại"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          className="select"
          value={active}
          onChange={(e) => setActive(e.target.value as ActiveFilter)}
          aria-label="Lọc theo tài khoản"
        >
          <option value="all">Mọi tài khoản</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khoá</option>
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
        <select className="select" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Lọc theo phân khu">
          <option value="all">Mọi phân khu</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>

      {list.state.status === "loading" && <div className="skeleton" style={{ height: 360 }} />}
      {list.state.status === "error" && (
        <div role="alert">
          <p>{list.state.message}</p>
          <button type="button" className="btn btn-quiet" onClick={list.reload}>
            Thử lại
          </button>
        </div>
      )}
      {list.state.status === "ready" && (
        <DataTable<HostAdminView>
          columns={
            [
              {
                key: "host",
                header: "Field Host",
                render: (h) => (
                  <span className={styles.person}>
                    <span className={styles.avatar}>{initials(h.fullName ?? h.email ?? "?")}</span>
                    <span>
                      <b>{h.fullName ?? "(chưa có tên)"}</b>
                      <span className="muted xs">{h.email}</span>
                      <span className="muted xs">{h.phone ?? "Chưa xác thực SĐT"}</span>
                    </span>
                  </span>
                ),
              },
              { key: "zone", header: "Phân khu", render: (h) => h.assignedZone },
              {
                key: "roles",
                header: "Vai",
                render: (h) => (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {h.roles.map((r) => (
                      <span key={r} className={`badge ${r === "sale" ? "badge-kelp" : "badge-plain"}`}>
                        {ROLE_LABEL[r]}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Trạng thái",
                render: (h) =>
                  h.isActive ? (
                    <span className={`badge ${DUTY_LABEL[h.dutyStatus].badge}`}>{DUTY_LABEL[h.dutyStatus].label}</span>
                  ) : (
                    <span className="badge badge-plain">Đã khoá</span>
                  ),
              },
              { key: "login", header: "Đăng nhập gần nhất", render: (h) => fmtLogin(h.lastLoginAt) },
              {
                key: "rating",
                header: "Đánh giá",
                align: "right",
                render: (h) => `${String(h.rating).replace(".", ",")}★`,
              },
            ] satisfies DataTableColumn<HostAdminView>[]
          }
          rows={rows}
          rowHref={(h) => `/admin/hosts/${h.id}`}
          empty={<span className="muted">Không có Host nào khớp bộ lọc.</span>}
        />
      )}

      <CreateHostModal open={creating} zones={zoneOptions} onClose={() => setCreating(false)} />
    </div>
  );
}

function CreateHostModal({ open, zones, onClose }: { open: boolean; zones: string[]; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [zone, setZone] = useState("");
  const [roles, setRoles] = useState<HostRoleCode[]>(["sale"]);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const chosenZone = zone || zones[0] || "";
  const toggleRole = (r: HostRoleCode) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || fullName.trim().length < 2) {
      return setErr("Nhập email và họ tên hợp lệ.");
    }
    if (!chosenZone) return setErr("Chọn phân khu phụ trách.");
    if (roles.length === 0) return setErr("Chọn ít nhất một vai cho Field Host.");
    if (password && password.length < 8) return setErr("Mật khẩu tối thiểu 8 ký tự (hoặc để trống).");
    setBusy(true);
    setErr("");
    const res = await adminHostsApi.create({
      email: email.trim(),
      fullName: fullName.trim(),
      assignedZone: chosenZone,
      roles,
      ...(password ? { password } : {}),
    });
    setBusy(false);
    if (!res.ok) return setErr(hostErrorText(res));
    toast(`Đã thêm Field Host ${res.data.fullName ?? res.data.email}`, "success");
    invalidateHosts();
    setEmail("");
    setFullName("");
    setPassword("");
    setRoles(["sale"]);
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
          <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
            <label className="check">
              <input type="checkbox" checked={roles.includes("sale")} onChange={() => toggleRole("sale")} />
              <span>Sale (Dẫn khách xem phòng)</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={roles.includes("inspector")} onChange={() => toggleRole("inspector")} />
              <span>Thẩm định (Kiểm tra 32 hạng mục)</span>
            </label>
          </div>
        </div>

        <label className="field">
          <span className="label">Mật khẩu ban đầu (tuỳ chọn)</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
