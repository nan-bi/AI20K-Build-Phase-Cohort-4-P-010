"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { STATUS_META } from "@/components/booking/status";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { setHostRoles } from "@/lib/mock/actions";
import { fmtDate, fmtDateTime, fmtPhone, vnd } from "@/lib/mock/format";
import { hostBookings, hostEarnings, hostRoles, pickHostFor } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import {
  hostById,
  unitAddress,
  unitById,
  zoneById,
  type HostRole,
  type HostStatus,
} from "@/lib/mock/units";
import type { Booking } from "@/lib/mock/types";
import styles from "./Admin.module.css";

const mm = (s: number) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, "0")}″`;

const STATUS_TONE: Record<HostStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang trực", tone: "ok" },
  busy: { label: "Đang bận", tone: "warn" },
  off_duty: { label: "Nghỉ ca", tone: "neutral" },
};

/** Hồ sơ một Field Host. */
export function AdminHostDetail({ id }: { id: string }) {
  const state = useMock();
  const host = hostById(id);

  const initialRoles = useMemo<HostRole[]>(
    () => (state.ready && host ? hostRoles(state, host.id) : (["sale"] as HostRole[])),
    [state, host],
  );

  const [roles, setRoles] = useState<HostRole[]>(initialRoles);
  const [roleError, setRoleError] = useState("");

  if (!state.ready) return <div className="skeleton" style={{ height: 420 }} />;
  if (!host) notFound();

  const e = hostEarnings(state, host, state.fees);
  const bookings = hostBookings(state, host.id).sort((a, b) => b.slot.localeCompare(a.slot));

  const toggleRole = (r: HostRole) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    setRoleError("");
  };

  const handleSaveRoles = () => {
    if (roles.length === 0) {
      setRoleError("Field Host phải có ít nhất một vai.");
      return;
    }
    const res = setHostRoles(host.id, roles, "Admin");
    if (res.ok) {
      toast(`Đã cập nhật vai cho Field Host ${host.name}`, "success");
      setRoleError("");
    } else {
      toast(res.reason, "info");
    }
  };

  // Cảnh báo nếu phân khu bị thiếu vai
  const roleWarnings: string[] = [];
  for (const z of host.zones) {
    const zoneObj = zoneById(z);
    for (const r of ["sale", "inspector"] as HostRole[]) {
      // Giả lập state tạm thời nếu roles này được lưu
      const simulatedState = {
        ...state,
        hostRoles: {
          ...state.hostRoles,
          [host.id]: roles,
        },
      };
      const candidate = pickHostFor(simulatedState, z, r);
      if (candidate.fallback) {
        roleWarnings.push(
          `Phân khu ${zoneObj.short} sẽ không còn Host ${r === "sale" ? "Sale" : "Thẩm định"} — ticket mới sẽ giao tạm cho Host mặc định và báo Admin.`,
        );
      }
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title={host.name} back={{ href: "/admin/hosts", label: "Field Host" }} />

      <Section title="Phân quyền & Vai đảm nhiệm" description="Mỗi Host có thể đảm nhiệm một hoặc cả hai vai. Vai quyết định menu truy cập và quy trình phân bổ ticket tự động.">
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            <label className="check" style={{ alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={roles.includes("sale")}
                onChange={() => toggleRole("sale")}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong>Sale (Tiếp đón & Dẫn xem phòng)</strong>
                <p className="muted small" style={{ margin: "2px 0 0" }}>
                  Nhận lịch xem, đón khách tại sảnh phân khu, dùng thẻ cư dân thang máy dẫn lên phòng và cấp mã cửa.
                </p>
              </div>
            </label>

            <label className="check" style={{ alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox"
                checked={roles.includes("inspector")}
                onChange={() => toggleRole("inspector")}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong>Thẩm định (Kiểm định hiện trạng ký gửi)</strong>
                <p className="muted small" style={{ margin: "2px 0 0" }}>
                  Nhận ticket ký gửi từ chủ nhà, tới kiểm tra hiện trạng theo bảng kê 32 hạng mục Điều 5 và đo diện tích thông thuỷ trong 48 giờ.
                </p>
              </div>
            </label>

            {roleError && <p className="field-error" style={{ margin: 0 }}>{roleError}</p>}

            {roleWarnings.length > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--amber-050)",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  fontSize: "var(--fs-13)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <div>
                  {roleWarnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "var(--s-2)" }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveRoles}>
                <ShieldCheck size={14} /> Lưu phân quyền vai
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Hồ sơ Field Host">
        <KeyValue
          items={[
            { label: "Số điện thoại", value: fmtPhone(host.phone) },
            { label: "Khu phụ trách", value: host.zones.map((z) => zoneById(z).name).join(", ") },
            { label: "Thẻ RFID", value: host.rfid },
            { label: "Đánh giá", value: `${String(host.rating).replace(".", ",")} ★` },
            { label: "Nhận ca trung bình", value: `${mm(host.avgAcceptSec)} (SLA 3′00″)` },
            { label: "Khách bỏ hẹn", value: `${Math.round(host.noShowRate * 100)}%` },
            { label: "Tham gia", value: fmtDate(host.joined) },
            {
              label: "Trạng thái",
              value: (
                <StatusBadge tone={STATUS_TONE[host.status].tone}>
                  {STATUS_TONE[host.status].label}
                </StatusBadge>
              ),
            },
          ]}
        />
      </Section>

      <Section
        title="Thu nhập tháng"
        description="Tính theo tuần hiện tại, cộng dồn thành số tháng trên bảng kê thanh toán."
      >
        <KeyValue
          items={[
            { label: "Lượt dẫn", value: e.viewings },
            { label: "Thù lao lượt dẫn", value: `${vnd(e.viewingFee)}đ` },
            { label: "Deal chốt cọc", value: e.deals },
            {
              label: "Hoa hồng",
              value: `${vnd(e.commission)}đ${e.multiplier > 1 ? ` (×${String(e.multiplier).replace(".", ",")})` : ""}`,
            },
            { label: "Thưởng nóng", value: `${vnd(e.bonus)}đ` },
            { label: "Tổng thực nhận", value: <b>{vnd(e.total)}đ</b> },
          ]}
        />
      </Section>

      <Section title="Lịch xem" flush>
        <DataTable<Booking>
          columns={
            [
              { key: "slot", header: "Giờ hẹn", render: (b) => fmtDateTime(b.slot) },
              { key: "unit", header: "Căn hộ", render: (b) => unitAddress(unitById(b.unitId)!) },
              { key: "tenant", header: "Khách", render: (b) => b.tenant.name },
              {
                key: "status",
                header: "Trạng thái",
                render: (b) => (
                  <span className={`badge ${STATUS_META[b.status].badge}`}>
                    {STATUS_META[b.status].label}
                  </span>
                ),
              },
            ] satisfies DataTableColumn<Booking>[]
          }
          rows={bookings}
          empty={<span className="muted">Chưa có lịch xem nào.</span>}
        />
      </Section>
    </div>
  );
}
