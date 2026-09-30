"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { setHoldHours } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDateTime } from "@/lib/mock/format";
import { useMock } from "@/lib/mock/store";
import type { HoldAudit } from "@/lib/mock/types";
import { unitAddress, unitById } from "@/lib/mock/units";
import styles from "./Admin.module.css";

function HoldHoursForm({ defaultHours, adminName }: { defaultHours: number; adminName: string }) {
  const [hoursInput, setHoursInput] = useState<string>(String(defaultHours));
  const [error, setError] = useState<string>("");

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(hoursInput);
    const res = setHoldHours(null, val, adminName);
    if (!res.ok) {
      setError(res.reason);
    } else {
      setError("");
      toast("Đã cập nhật thời gian giữ chỗ mặc định toàn sàn", "success");
    }
  };

  return (
    <form onSubmit={handleSaveHours} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 8 }}>
      <label className="field">
        <span className="label">Thời gian giữ chỗ mặc định (12 – 72 giờ)</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min={12}
            max={72}
            step={1}
            className="input"
            value={hoursInput}
            onChange={(e) => {
              setHoursInput(e.target.value);
              setError("");
            }}
            style={{ width: 140 }}
          />
          <span className="small muted">giờ</span>
          <button type="submit" className="btn btn-primary btn-sm">
            Lưu cài đặt
          </button>
        </div>
        {error && <p className="xs" style={{ color: "var(--danger)", margin: "4px 0 0" }}>{error}</p>}
      </label>
    </form>
  );
}

/** Cài đặt: tài khoản quản trị và tham số nền tảng. */
export function AdminSettings() {
  const state = useMock();
  const admin = DEMO_USERS.admin;
  const defaultHours = state.holdPolicy?.defaultHours ?? 48;

  const auditRows = (state.holdAudit ?? []).slice(0, 5);

  const auditColumns: DataTableColumn<HoldAudit>[] = [
    {
      key: "at",
      header: "Thời gian",
      render: (a) => fmtDateTime(a.at),
    },
    {
      key: "by",
      header: "Người thực hiện",
      render: (a) => a.by,
    },
    {
      key: "scope",
      header: "Phạm vi",
      render: (a) => {
        if (!a.unitId) return <b>Mặc định toàn sàn</b>;
        const u = unitById(a.unitId);
        return <span>Riêng căn {u ? unitAddress(u) : a.unitId}</span>;
      },
    },
    {
      key: "change",
      header: "Thay đổi",
      render: (a) => {
        const fromStr = a.from !== null ? `${a.from}h` : "Mặc định";
        const toStr = a.to !== null ? `${a.to}h` : "Mặc định";
        return (
          <span>
            {fromStr} → <b>{toStr}</b>
          </span>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Cài đặt" description="Tài khoản quản trị và các tham số vận hành nền tảng." />

      <Section title="Tài khoản quản trị">
        <KeyValue
          items={[
            { label: "Họ và tên", value: admin.name },
            { label: "Email", value: "ops@vinstay.vn" },
            { label: "Vai trò", value: "Trưởng vận hành" },
          ]}
        />
      </Section>

      <Section title="Thời gian giữ chỗ toàn sàn (SPEC-P01)">
        <HoldHoursForm key={defaultHours} defaultHours={defaultHours} adminName={admin.name} />
      </Section>

      <Section title="Nhật ký thay đổi thời hạn giữ chỗ (5 lần gần nhất)" flush>
        <DataTable<HoldAudit>
          columns={auditColumns}
          rows={auditRows}
          empty={<span className="muted">Chưa có lịch sử thay đổi thời hạn giữ chỗ.</span>}
        />
      </Section>

      <Section title="Tham số nền tảng khác" description="Thay đổi tham số cần phê duyệt của ban điều hành.">
        <KeyValue
          items={[
            { label: "Tiền giữ chỗ", value: "2.000.000 đ" },
            { label: "SLA nhận ca", value: "3 phút" },
            { label: "Open Pool bán kính", value: "500 m" },
            { label: "Báo trước thoát uỷ quyền", value: "15 ngày" },
            { label: "Ngưỡng Căn hời", value: "≥ 10%" },
            { label: "Ngưỡng OCR nhập tay", value: "< 85%" },
          ]}
        />
        <p className="small muted" style={{ marginTop: 12 }}>
          Thù lao và hoa hồng Field Host chỉnh được tại{" "}
          <Link href="/admin/commission" className="link">
            Biến phí Host
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
