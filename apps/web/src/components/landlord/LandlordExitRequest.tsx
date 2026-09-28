"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { cancelMandateExit, requestMandateExit, type ExitResult } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtDate } from "@/lib/mock/format";
import { exitableUnitRows, exitingUnitRows, type LandlordUnitRow } from "@/lib/mock/selectors-landlord";
import { useMock } from "@/lib/mock/store";
import { unitAddress } from "@/lib/mock/units";
import styles from "./Landlord.module.css";

const LID = DEMO_USERS.landlord.refId!;

const BLOCK_REASON: Partial<Record<LandlordUnitRow["status"], string>> = {
  holding: "đang giữ chỗ 24h",
  rented: "đang cho thuê",
};

type Reason = "Tự cho thuê" | "Ngưng cho thuê" | "Khác";
const REASONS: Reason[] = ["Tự cho thuê", "Ngưng cho thuê", "Khác"];

export function LandlordExitRequest() {
  const state = useMock();
  const [unitId, setUnitId] = useState("");
  const [reason, setReason] = useState<Reason | "">("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [result, setResult] = useState<ExitResult | null>(null);

  if (!state.ready) return <div className="skeleton" style={{ height: 420 }} />;

  const candidates = exitableUnitRows(state, LID);
  const exiting = exitingUnitRows(state, LID);
  const selected = candidates.find((r) => r.unit.id === unitId);
  const canSubmit = !!selected && selected.status === "available" && !!reason && agree;

  const submit = () => {
    if (!selected) return;
    const r = requestMandateExit(selected.unit);
    setResult(r);
    if (r.ok) {
      toast(r.hasViewingsToday ? "Đã ghi nhận. Host sẽ hoàn tất các lịch xem đã hẹn trước." : "Đã ghi nhận, bắt đầu đếm ngược 15 ngày", "success");
      setUnitId("");
      setReason("");
      setNote("");
      setAgree(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Thoát uỷ quyền" description="Ngừng ủy quyền ký gửi độc quyền cho một căn đang trống." />

      <Section>
        <p className="small muted" style={{ margin: 0 }}>
          Báo trước tối thiểu 15 ngày. Căn phải đang trống — không có cọc giữ chỗ hay hợp đồng thuê hiệu lực. Sau 15 ngày, mã cửa và chìa cơ của căn được gỡ khỏi mạng lưới Field Host.
        </p>
      </Section>

      <Section>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
          <label className="field">
            <span className="label">Căn muốn thoát uỷ quyền</span>
            <select className="select" value={unitId} onChange={(e) => { setUnitId(e.target.value); setResult(null); }}>
              <option value="">Chọn căn</option>
              {candidates.map((r) => (
                <option key={r.unit.id} value={r.unit.id} disabled={r.status !== "available"}>
                  {unitAddress(r.unit)}
                  {BLOCK_REASON[r.status] ? ` — ${BLOCK_REASON[r.status]}, chưa thể thoát` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Lý do</span>
            <select className="select" value={reason} onChange={(e) => setReason(e.target.value as Reason)}>
              <option value="">Chọn lý do</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Ghi chú (không bắt buộc)</span>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nói thêm lý do nếu cần" />
          </label>

          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>Căn đang trống và tôi đã nhận đủ khoản thu.</span>
          </label>

          {result && !result.ok && (
            <p className="field-error" role="alert">
              {result.reason}
            </p>
          )}

          <button type="button" className="btn btn-danger" disabled={!canSubmit} onClick={submit} style={{ alignSelf: "flex-start" }}>
            Gửi yêu cầu thoát uỷ quyền
          </button>

          {result?.ok && (
            <p className="small" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ok)" }}>
              <CheckCircle2 size={16} /> Đã ghi nhận. Ủy quyền kết thúc từ ngày {fmtDate(result.effectiveAt)}.
            </p>
          )}
        </div>
      </Section>

      <Section title="Đang đếm ngược thoát uỷ quyền" flush>
        <DataTable
          columns={[
            { key: "unit", header: "Căn", render: (r: LandlordUnitRow) => unitAddress(r.unit) },
            { key: "effective", header: "Ngày hiệu lực", render: (r: LandlordUnitRow) => (state.mandates[r.unit.id]?.exitEffectiveAt ? fmtDate(state.mandates[r.unit.id]!.exitEffectiveAt!) : "—") },
            {
              key: "action",
              header: "",
              align: "right",
              render: (r: LandlordUnitRow) => (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => {
                    cancelMandateExit(r.unit);
                    toast("Đã huỷ yêu cầu thoát, ủy quyền tiếp tục", "success");
                  }}
                >
                  Huỷ yêu cầu
                </button>
              ),
            },
          ]}
          rows={exiting}
          empty="Không có căn nào đang thoát uỷ quyền."
        />
      </Section>
    </div>
  );
}
