"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { KeyValue } from "@/components/ui/KeyValue";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import type { HostRoleCode } from "@/lib/auth/portals";
import {
  adminHostsApi,
  hostErrorText,
  invalidateHosts,
  useHost,
  useHostZones,
  type HostAdminDetail,
  type TicketStatusKey,
  type UpdateHostInput,
} from "@/lib/admin/hosts";
import styles from "./Admin.module.css";

const TICKET_LABEL: Record<TicketStatusKey, string> = {
  OFFERED: "Đang chào ca",
  ACCEPTED: "Đã nhận",
  CHECKED: "Đã có mặt",
  COMPLETED: "Hoàn tất",
  EXPIRED: "Quá hạn",
  ESCALATED: "Chuyển cấp",
  CANCELLED: "Đã huỷ",
};

/** Hồ sơ một Field Host (dữ liệu thật qua `/admin/field-hosts/:id`). */
export function AdminHostDetail({ id }: { id: string }) {
  const q = useHost(id);

  if (q.state.status === "loading") return <div className="skeleton" style={{ height: 420 }} />;
  if (q.state.status === "error") {
    return (
      <div className={styles.page}>
        <PageHeader title="Field Host" back={{ href: "/admin/hosts", label: "Field Host" }} />
        <p role="alert">{q.state.httpStatus === 404 ? "Không tìm thấy Field Host." : q.state.message}</p>
        <Link href="/admin/hosts" className="btn btn-quiet">
          Về danh sách
        </Link>
      </div>
    );
  }
  // `key` theo toàn bộ dữ liệu máy chủ ⇒ sau khi lưu, các form nội bộ nạp lại giá trị mới.
  return <HostForms key={JSON.stringify(q.state.data)} host={q.state.data} reload={q.reload} />;
}

function HostForms({ host, reload }: { host: HostAdminDetail; reload: () => void }) {
  const zones = useHostZones();
  const zoneOptions = zones.state.status === "ready" ? zones.state.data : [host.assignedZone];

  const [roles, setRoles] = useState<HostRoleCode[]>(host.roles);
  const [roleError, setRoleError] = useState("");
  const [fullName, setFullName] = useState(host.fullName ?? "");
  const [zone, setZone] = useState(host.assignedZone);
  const [password, setPassword] = useState("");
  const [confirmLock, setConfirmLock] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(dto: UpdateHostInput, okText: string): Promise<boolean> {
    setBusy(true);
    const res = await adminHostsApi.update(host.id, dto);
    setBusy(false);
    if (!res.ok) {
      toast(hostErrorText(res), "info");
      return false;
    }
    toast(okText, "success");
    invalidateHosts();
    reload();
    return true;
  }

  const toggleRole = (r: HostRoleCode) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    setRoleError("");
  };

  async function saveRoles() {
    if (roles.length === 0) return setRoleError("Field Host phải có ít nhất một vai.");
    await save({ roles }, `Đã cập nhật vai cho ${host.fullName ?? host.email}`);
  }

  async function savePassword() {
    if (password.length < 8) return toast("Mật khẩu tối thiểu 8 ký tự.", "info");
    if (await save({ password }, "Đã đặt lại mật khẩu")) setPassword("");
  }

  async function lock() {
    setBusy(true);
    const res = await adminHostsApi.deactivate(host.id);
    setBusy(false);
    setConfirmLock(false);
    if (!res.ok) return toast(hostErrorText(res), "info");
    toast("Đã khoá tài khoản Field Host", "success");
    invalidateHosts();
    reload();
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={host.fullName ?? host.email ?? "Field Host"}
        back={{ href: "/admin/hosts", label: "Field Host" }}
      />

      <Section
        title="Phân quyền & Vai đảm nhiệm"
        description="Mỗi Host có thể đảm nhiệm một hoặc cả hai vai. Vai quyết định menu truy cập và quy trình phân bổ ticket tự động."
      >
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            <label className="check" style={{ alignItems: "flex-start", gap: 10 }}>
              <input type="checkbox" checked={roles.includes("sale")} onChange={() => toggleRole("sale")} style={{ marginTop: 3 }} />
              <div>
                <strong>Sale (Tiếp đón & Dẫn xem phòng)</strong>
                <p className="muted small" style={{ margin: "2px 0 0" }}>
                  Nhận lịch xem, đón khách tại sảnh phân khu, dùng thẻ cư dân thang máy dẫn lên phòng và cấp mã cửa.
                </p>
              </div>
            </label>
            <label className="check" style={{ alignItems: "flex-start", gap: 10 }}>
              <input type="checkbox" checked={roles.includes("inspector")} onChange={() => toggleRole("inspector")} style={{ marginTop: 3 }} />
              <div>
                <strong>Thẩm định (Kiểm định hiện trạng ký gửi)</strong>
                <p className="muted small" style={{ margin: "2px 0 0" }}>
                  Nhận ticket ký gửi từ chủ nhà, tới kiểm tra hiện trạng theo bảng kê 32 hạng mục Điều 5 và đo diện tích thông thuỷ trong 48 giờ.
                </p>
              </div>
            </label>
            {roleError && <p className="field-error" style={{ margin: 0 }}>{roleError}</p>}
            <div>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={saveRoles}>
                <ShieldCheck size={14} /> Lưu phân quyền vai
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Hồ sơ Field Host">
        <div className="card" style={{ padding: "var(--s-4)", display: "grid", gap: 12, maxWidth: 420 }}>
          <label className="field">
            <span className="label">Họ và tên</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Phân khu phụ trách</span>
            <select className="select" value={zone} onChange={(e) => setZone(e.target.value)}>
              {!zoneOptions.includes(zone) && <option value={zone}>{zone}</option>}
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || fullName.trim().length < 2 || (fullName.trim() === (host.fullName ?? "") && zone === host.assignedZone)}
              onClick={() => save({ fullName: fullName.trim(), assignedZone: zone }, "Đã lưu hồ sơ")}
            >
              Lưu hồ sơ
            </button>
          </div>
        </div>
        <KeyValue
          items={[
            { label: "Email đăng nhập", value: host.email ?? "—" },
            { label: "Số điện thoại", value: host.phone ? `${host.phone}${host.isPhoneVerified ? " (đã xác thực)" : ""}` : "Host chưa xác thực" },
            { label: "Đánh giá", value: `${String(host.rating).replace(".", ",")} ★` },
            { label: "Tham gia", value: new Date(host.createdAt).toLocaleDateString("vi-VN") },
            { label: "Đăng nhập gần nhất", value: host.lastLoginAt ? new Date(host.lastLoginAt).toLocaleString("vi-VN") : "Chưa đăng nhập" },
            {
              label: "Tài khoản",
              value: (
                <StatusBadge tone={host.isActive ? "ok" : "neutral"}>{host.isActive ? "Đang hoạt động" : "Đã khoá"}</StatusBadge>
              ),
            },
          ]}
        />
      </Section>

      <Section
        title="Mật khẩu"
        description={host.hasPassword ? "Host đang có mật khẩu. Đặt lại sẽ thay mật khẩu cũ." : "Host chưa có mật khẩu (chỉ đăng nhập bằng Google). Đặt mật khẩu để cho phép đăng nhập bằng email."}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 420 }}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Mật khẩu mới (≥ 8 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="btn btn-quiet btn-sm" disabled={busy || password.length < 8} onClick={savePassword}>
            {host.hasPassword ? "Đặt lại mật khẩu" : "Đặt mật khẩu"}
          </button>
        </div>
      </Section>

      <Section title="Trạng thái tài khoản">
        {host.isActive ? (
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setConfirmLock(true)}>
            Khoá tài khoản
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => save({ isActive: true }, "Đã mở khoá tài khoản")}
          >
            Mở khoá
          </button>
        )}
      </Section>

      <Section title="Hoạt động ticket" description="Số ticket điều phối theo trạng thái. Thu nhập và lịch xem chi tiết có ở hồ sơ kế tiếp.">
        <KeyValue
          items={(Object.keys(TICKET_LABEL) as TicketStatusKey[]).map((k) => ({
            label: TICKET_LABEL[k],
            value: host.ticketStats[k] ?? 0,
          }))}
        />
      </Section>

      <Modal
        open={confirmLock}
        onClose={() => setConfirmLock(false)}
        title="Khoá tài khoản Field Host?"
        description="Host sẽ bị đăng xuất và không đăng nhập được nữa. Lịch sử ca và hoa hồng được giữ nguyên. Có thể mở khoá sau."
        footer={
          <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={lock}>
            Khoá tài khoản
          </button>
        }
      >
        <p className="muted small">Host đang có ca được giao hoặc đang dẫn sẽ không khoá được cho tới khi điều phối lại.</p>
      </Modal>
    </div>
  );
}
