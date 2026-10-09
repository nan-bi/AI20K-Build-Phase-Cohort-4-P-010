"use client";

import { CrumbLabel } from "@/components/ui/Breadcrumbs";
import { useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck, Unlock } from "lucide-react";
import { vnd } from "@/lib/format";
import { AcceptTime, DutyStatus } from "./AdminHosts";
import { KeyValue } from "@/components/ui/KeyValue";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import {
  adminHostsApi,
  choiceOfRoles,
  hostErrorText,
  hostRoleLabel,
  invalidateHosts,
  rolesOfChoice,
  useHost,
  useHostZones,
  type HostAdminDetail,
  type HostRoleChoice,
  type TicketStatusKey,
  type UpdateHostInput,
} from "@/lib/admin/hosts";
import { HostRoleRadios } from "./HostRoleRadios";
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

  const [roleChoice, setRoleChoice] = useState<HostRoleChoice>(choiceOfRoles(host.roles));
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

  async function saveRoles() {
    await save({ roles: rolesOfChoice(roleChoice) }, `Đã cập nhật vai cho ${host.fullName ?? host.email}`);
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

  const s = host.stats;
  const lockBlocked = host.isActive && s.openTickets > 0;

  return (
    <div className={styles.page}>
      <CrumbLabel label={host.fullName ?? host.email} />
      <PageHeader
        title={host.fullName ?? host.email ?? "Field Host"}
        description={`${host.assignedZone} · ${hostRoleLabel(host.roles)} · tham gia ${new Date(host.createdAt).toLocaleDateString("vi-VN")}`}
        back={{ href: "/admin/hosts", label: "Field Host" }}
        actions={
          host.isActive ? (
            <button
              type="button"
              className="btn btn-quiet"
              style={{ color: "var(--danger)" }}
              disabled={busy || lockBlocked}
              title={lockBlocked ? "Host còn ca đang mở — điều phối lại trước khi khoá" : undefined}
              onClick={() => setConfirmLock(true)}
            >
              <Lock size={15} /> Khoá tài khoản
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save({ isActive: true }, "Đã mở khoá tài khoản")}>
              <Unlock size={15} /> Mở khoá tài khoản
            </button>
          )
        }
      />

      {!host.isActive && (
        <div role="status" className={styles.lockBanner}>
          <Lock size={20} />
          <div>
            <b>Tài khoản đang bị khoá.</b> Host không đăng nhập được, không xuất hiện trong điều phối nên không nhận ca dẫn khách hay
            thẩm định mới. Lịch sử ca và thu nhập vẫn được giữ nguyên. Bấm “Mở khoá tài khoản” để khôi phục.
          </div>
        </div>
      )}

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>Trạng thái trực</div>
            <div className={styles.kpiVal}>
              <DutyStatus host={host} />
            </div>
          </div>
        </div>
        <Stat label="Ca đã dẫn xong" value={String(s.completedViewings)} sub={s.openTickets > 0 ? `${s.openTickets} ca đang mở` : "Không có ca đang mở"} />
        <Stat label="Deal chốt cọc" value={String(s.deals)} sub="Cọc 2.000.000đ đã thu" />
        <div className={styles.kpiCard}>
          <div>
            <div className={styles.kpiLabel}>Nhận ca trung bình</div>
            <div className={styles.kpiVal}>
              <AcceptTime seconds={s.avgAcceptSeconds} />
            </div>
            <div className={styles.kpiLabel}>Mục tiêu ≤ 3′00″</div>
          </div>
        </div>
        <Stat
          label="Khách bỏ hẹn"
          value={s.noShowRate === null ? "—" : `${String(s.noShowRate).replace(".", ",")}%`}
          sub={`Đánh giá ${String(host.rating).replace(".", ",")}★`}
        />
        <Stat label="Thu nhập tuần này" value={`${vnd(s.weekEarnings)}đ`} sub="Theo bảng kê biến phí" />
      </div>

      <Section
        title="Phân quyền & Vai đảm nhiệm"
        description="Mỗi Host luôn là Sale; có thể kiêm Thẩm định. Vai quyết định menu truy cập và quy trình phân bổ ticket tự động."
      >
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            <HostRoleRadios name="host-role" value={roleChoice} onChange={setRoleChoice} />
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

      <Section
        title="Trạng thái tài khoản"
        description="Khoá là tạm ngừng tài khoản, không xoá dữ liệu. Dùng khi Host nghỉ việc, vi phạm quy chuẩn tiếp đón hoặc làm mất thẻ cư dân."
      >
        <div className="card" style={{ padding: "var(--s-4)", display: "grid", gap: 10 }}>
          <p>
            Hiện tại:{" "}
            {host.isActive ? <StatusBadge tone="ok">Đang hoạt động</StatusBadge> : <StatusBadge tone="danger">Đã khoá</StatusBadge>}
          </p>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            <li>Khoá ⇒ Host bị đăng xuất ngay, không đăng nhập lại được và không được điều phối ca mới (dẫn khách lẫn thẩm định).</li>
            <li>Lịch sử ca, đánh giá và các khoản thu nhập đã ghi nhận được giữ nguyên để đối soát.</li>
            <li>Host đang có ca được giao, đã nhận hoặc đang đón khách thì không khoá được — điều phối lại ca đó trước.</li>
            <li>Mở khoá ⇒ Host đăng nhập lại bình thường, bắt đầu ở trạng thái “Nghỉ ca” cho tới khi tự bật trực.</li>
          </ul>
          {lockBlocked && (
            <p className="small" style={{ color: "var(--danger)" }}>
              Host đang có {s.openTickets} ca mở nên chưa khoá được.{" "}
              <Link href="/admin/bookings" className="link">
                Mở màn điều phối
              </Link>
            </p>
          )}
        </div>
      </Section>

      <Section title="Hoạt động ticket" description="Số ticket điều phối của Host theo trạng thái.">
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
        title={`Khoá tài khoản ${host.fullName ?? host.email ?? "Field Host"}?`}
        description="Host sẽ bị đăng xuất ngay, không đăng nhập được và không nhận ca mới. Lịch sử ca và thu nhập được giữ nguyên. Có thể mở khoá bất cứ lúc nào."
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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className={styles.kpiCard}>
      <div>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiVal}>{value}</div>
        <div className={styles.kpiLabel}>{sub}</div>
      </div>
    </div>
  );
}
