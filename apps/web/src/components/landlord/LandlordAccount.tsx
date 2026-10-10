"use client";

import { PhoneVerifyCard } from "@/components/host/PhoneVerifyCard";
import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { fmtDate } from "@/lib/format";
import { queries } from "@/lib/landlord/queries";
import { unitLabel } from "@/lib/landlord/labels";
import { invalidateLandlordData, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

export function LandlordAccount() {
  const profile = useLandlordQuery(queries.profile);
  const units = useLandlordQuery(queries.units);

  return (
    <div className={styles.page}>
      <PageHeader title="Tài khoản" description="Thông tin liên hệ và hợp đồng uỷ quyền của bạn." />

      <Section title="Thông tin chủ nhà">
        <QueryView query={profile} skeleton="form">
          {(p) => (
            <KeyValue
              items={[
                { label: "Họ tên", value: p.fullName ?? "—" },
                { label: "Email", value: p.email ?? "—" },
                { label: "Tham gia từ", value: fmtDate(p.createdAt) },
              ]}
            />
          )}
        </QueryView>
      </Section>

      <QueryView query={profile} skeleton="form">
        {(p) => (
          <PhoneVerifyCard
            me={p}
            description="Cần xác thực một lần để ký ủy quyền ký gửi căn hộ. Số được lưu mã hoá."
            onVerified={() => { invalidateLandlordData(); profile.reload(); }}
          />
        )}
      </QueryView>

      <Section title="Hợp đồng uỷ quyền" description="Hợp đồng ký gửi độc quyền đã ký cho từng căn." flush>
        <QueryView query={units}>
          {(rows) => {
            const signed = rows.filter((r) => r.mandate?.signedAt && r.mandate.status !== "ended");
            return (
              <div className={styles.contractList}>
                {signed.map((r) => (
                  <div key={r.id} className={styles.contractRow}>
                    <div>
                      <b>{unitLabel(r)}</b>
                      <p className="muted small" style={{ margin: 0 }}>
                        Ký ngày {fmtDate(r.mandate!.signedAt!)}
                      </p>
                    </div>
                  </div>
                ))}
                {signed.length === 0 && <p className="muted small" style={{ padding: "16px 20px" }}>Chưa có hợp đồng ký gửi nào.</p>}
              </div>
            );
          }}
        </QueryView>
      </Section>
    </div>
  );
}
