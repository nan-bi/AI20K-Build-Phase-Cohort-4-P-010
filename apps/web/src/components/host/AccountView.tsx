"use client";

import { useState } from "react";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { loginPathFor } from "@/lib/auth/portals";
import { signOut } from "@/lib/auth/client";
import { useHostMe } from "@/lib/host/api";
import styles from "./Host.module.css";
import { PhoneVerifyCard } from "./PhoneVerifyCard";

const ROLE_LABEL = { sale: "Sale", inspector: "Thẩm định" } as const;

const SHIFTS = [
  { id: "morning", label: "Ca sáng", time: "08:30–11:30" },
  { id: "afternoon", label: "Ca chiều", time: "14:00–18:00" },
] as const;

const RULES = [
  "Không dùng hộp khoá treo cửa hay dán mã QR ở sảnh — vi phạm quy chế BQL.",
  "Mã cửa hiện ngay khi bạn xác nhận xem phòng và tự ẩn sau 10 phút.",
  "Có sự cố tại căn: chỉ giới thiệu danh bạ thợ ngoài, khách và thợ tự thoả thuận.",
];

/** Hồ sơ Field Host: dữ liệu thật từ `GET /host/me`; ca trực và quy tắc cốt lõi giữ nguyên (ca trực: hồ sơ 15). */
export function AccountView() {
  const me = useHostMe();
  const [onShift, setOnShift] = useState<Record<string, boolean>>({ morning: true, afternoon: true });

  if (me.state.status === "loading") return <div className="skeleton" style={{ height: 360 }} />;
  if (me.state.status === "error") {
    return (
      <div className={styles.page}>
        <PageHeader title="Tài khoản" />
        <p role="alert">{me.state.message}</p>
        <button type="button" className="btn btn-quiet" onClick={me.reload}>
          Thử lại
        </button>
      </div>
    );
  }
  const host = me.state.data;

  return (
    <div className={styles.page}>
      <PageHeader title="Tài khoản" />

      <div className={styles.two}>
        <div className={styles.stack}>
          <Section title="Thông tin cá nhân">
            <KeyValue
              items={[
                { label: "Họ tên", value: host.fullName ?? "—" },
                { label: "Email", value: host.email ?? "—" },
                { label: "Khu phụ trách", value: host.assignedZone },
                { label: "Vai", value: host.roles.map((r) => ROLE_LABEL[r]).join(" + ") || "Chưa gán vai" },
                { label: "Đánh giá", value: `${String(host.rating).replace(".", ",")} ★` },
              ]}
            />
          </Section>

          <PhoneVerifyCard me={host} onVerified={me.reload} />
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
