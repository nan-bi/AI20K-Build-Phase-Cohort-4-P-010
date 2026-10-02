"use client";

import { useState } from "react";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { loginPathFor } from "@/lib/auth/portals";
import { DEMO_USERS } from "@/lib/mock/actors";
import { signOut } from "@/lib/auth/client";
import { hostById, zoneById } from "@/lib/mock/units";
import styles from "./Host.module.css";

const HOST = DEMO_USERS.host;

const SHIFTS = [
  { id: "morning", label: "Ca sáng", time: "08:30–11:30" },
  { id: "afternoon", label: "Ca chiều", time: "14:00–18:00" },
] as const;

const RULES = [
  "Không dùng hộp khoá treo cửa hay dán mã QR ở sảnh — vi phạm quy chế BQL.",
  "Mã cửa hiện ngay khi bạn xác nhận xem phòng và tự ẩn sau 10 phút.",
  "Có sự cố tại căn: chỉ giới thiệu danh bạ thợ ngoài, khách và thợ tự thoả thuận.",
];

/** Hồ sơ Field Host: thông tin cá nhân, thẻ RFID, ca trực và quy tắc cốt lõi. */
export function AccountView() {
  const host = hostById(HOST.refId!)!;
  const [onShift, setOnShift] = useState<Record<string, boolean>>({ morning: true, afternoon: true });

  return (
    <div className={styles.page}>
      <PageHeader title="Tài khoản" />

      <div className={styles.two}>
        <div className={styles.stack}>
          <Section title="Thông tin cá nhân">
            <KeyValue
              items={[
                { label: "Họ tên", value: host.name },
                { label: "Số điện thoại", value: host.phone },
                { label: "Khu phụ trách", value: host.zones.map((z) => zoneById(z).short).join(" & ") },
                { label: "Đánh giá", value: `${String(host.rating).replace(".", ",")} ★` },
              ]}
            />
          </Section>

          <Section title="Thẻ cư dân RFID">
            <KeyValue
              items={[
                { label: "Số thẻ", value: "VS-0412" },
                { label: "Trạng thái", value: <StatusBadge tone="ok">Đã xác minh</StatusBadge> },
              ]}
            />
            <p className="muted small">Thẻ do Ban quản lý cấp, dùng để đưa khách lên tầng. Mất thẻ báo ngay trưởng khu.</p>
          </Section>
        </div>

        <div className={styles.stack}>
          <Section title="Ca trực">
            <ul className={styles.stack}>
              {SHIFTS.map((s) => (
                <li key={s.id} className={styles.shiftRow}>
                  <div>
                    <b>{s.label}</b>
                    <p className="muted small">{s.time}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={onShift[s.id]}
                    aria-label={`Nhận ${s.label.toLowerCase()}`}
                    className={`${styles.switch} ${onShift[s.id] ? styles.switchOn : ""}`}
                    onClick={() => setOnShift((v) => ({ ...v, [s.id]: !v[s.id] }))}
                  >
                    <span />
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Quy tắc">
            <ul className={styles.rules}>
              {RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => void signOut(loginPathFor("host"))}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
