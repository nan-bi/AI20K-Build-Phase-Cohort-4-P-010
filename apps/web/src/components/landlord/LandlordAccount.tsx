"use client";

import { KeyValue } from "@/components/ui/KeyValue";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { DEMO_USERS } from "@/lib/mock/actors";
import { fmtDate, maskPhone } from "@/lib/mock/format";
import { landlordUnitRows } from "@/lib/mock/selectors-landlord";
import { useMock } from "@/lib/mock/store";
import { landlordById, unitAddress } from "@/lib/mock/units";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;
/** Dữ liệu tài khoản nhận tiền — mô phỏng, chưa có trong dữ liệu mock gốc. */
const PAYOUT_ACCOUNT = { bank: "Vietcombank — CN Thăng Long", number: "**** **** 4821", holder: "NGUYEN VAN HUNG" };

export function LandlordAccount() {
  const state = useMock();
  if (!state.ready) return <div className="skeleton" style={{ height: 420 }} />;

  const landlord = landlordById(LID)!;
  const contracts = landlordUnitRows(state, LID).filter((r) => r.mandateStatus !== "ended" && r.mandateSignedAt);

  return (
    <div className={styles.page}>
      <PageHeader title="Tài khoản" description="Thông tin liên hệ, tài khoản nhận tiền và hợp đồng uỷ quyền của bạn." />

      <Section title="Thông tin chủ nhà">
        <KeyValue
          items={[
            { label: "Họ tên", value: landlord.name },
            {
              label: "Số điện thoại",
              value: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {maskPhone(landlord.phone)}
                  <StatusBadge tone="ok">Đã mã hoá</StatusBadge>
                </span>
              ),
            },
            { label: "Email", value: landlord.email },
          ]}
        />
      </Section>

      <Section
        title="Tài khoản nhận tiền"
        actions={
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => toast("Đã cập nhật tài khoản nhận tiền", "success")}>
            Cập nhật
          </button>
        }
      >
        <KeyValue
          items={[
            { label: "Ngân hàng", value: PAYOUT_ACCOUNT.bank },
            { label: "Số tài khoản", value: PAYOUT_ACCOUNT.number },
            { label: "Chủ tài khoản", value: PAYOUT_ACCOUNT.holder },
          ]}
        />
      </Section>

      <Section title="Hợp đồng uỷ quyền" description="Hợp đồng ký gửi độc quyền đã ký cho từng căn." flush>
        <div className={styles.contractList}>
          {contracts.map((r) => (
            <div key={r.unit.id} className={styles.contractRow}>
              <div>
                <b>{unitAddress(r.unit)}</b>
                <p className="muted small" style={{ margin: 0 }}>
                  Ký ngày {fmtDate(r.mandateSignedAt!)}
                </p>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => toast("Đang mở hợp đồng (mô phỏng)")}>
                Xem
              </button>
            </div>
          ))}
          {contracts.length === 0 && <p className="muted small" style={{ padding: "16px 20px" }}>Chưa có hợp đồng ký gửi nào.</p>}
        </div>
      </Section>
    </div>
  );
}
