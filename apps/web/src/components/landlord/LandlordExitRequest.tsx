"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { toast } from "@/components/ui/Toast";
import { fmtDate } from "@/lib/mock/format";
import { errorText, landlordApi } from "@/lib/landlord/api";
import { queries } from "@/lib/landlord/queries";
import { exitBlockReason, unitLabel } from "@/lib/landlord/labels";
import type { UnitRow } from "@/lib/landlord/types";
import { invalidateLandlordData, useLandlordQuery } from "@/lib/landlord/useLandlordQuery";
import { QueryView } from "./QueryView";
import styles from "./Landlord.module.css";

type Reason = "Tự cho thuê" | "Ngưng cho thuê" | "Khác";
const REASONS: Reason[] = ["Tự cho thuê", "Ngưng cho thuê", "Khác"];

export function LandlordExitRequest() {
  const units = useLandlordQuery(queries.units);
  const [mandateId, setMandateId] = useState("");
  const [reason, setReason] = useState<Reason | "">("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<string | null>(null);

  const submit = async () => {
    if (!mandateId || !reason) return;
    setBusy(true);
    setError(null);
    const res = await landlordApi.requestExit(mandateId, note.trim() ? `${reason}: ${note.trim()}` : reason);
    setBusy(false);
    if (!res.ok) {
      setError(errorText(res));
      return;
    }
    toast("Đã ghi nhận, bắt đầu đếm ngược 15 ngày", "success");
    setDoneAt(res.data.exitEffectiveAt);
    setMandateId("");
    setReason("");
    setNote("");
    setAgree(false);
    invalidateLandlordData();
  };

  const cancel = async (id: string) => {
    const res = await landlordApi.cancelExit(id);
    if (!res.ok) {
      toast(errorText(res));
      return;
    }
    toast("Đã huỷ yêu cầu thoát, ủy quyền tiếp tục", "success");
    invalidateLandlordData();
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Thoát uỷ quyền" description="Ngừng ủy quyền ký gửi độc quyền cho một căn đang trống." />

      <Section>
        <p className="small muted" style={{ margin: 0 }}>
          Báo trước tối thiểu 15 ngày. Căn phải đang trống — không có cọc giữ chỗ hay hợp đồng thuê hiệu lực. Sau 15 ngày, mã cửa và chìa cơ của căn được gỡ khỏi mạng lưới Field Host.
        </p>
      </Section>

      <QueryView query={units} skeleton="form">
        {(rows) => {
          // Liệt kê MỌI căn để người dùng thấy căn nào, vì sao chưa thoát được (thay vì danh sách rỗng khó hiểu).
          const options = rows.filter((r) => r.mandate?.status !== "exiting");
          const exiting = rows.filter((r) => r.mandate?.status === "exiting");
          const selectable = options.filter((r) => !exitBlockReason(r));
          const selected = selectable.find((r) => r.mandate?.id === mandateId);
          const canSubmit = !!selected && !!reason && agree && !busy;

          return (
            <>
              <Section>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
                  <label className="field">
                    <span className="label">Căn muốn thoát uỷ quyền</span>
                    <select
                      className="select"
                      value={mandateId}
                      onChange={(e) => {
                        setMandateId(e.target.value);
                        setError(null);
                        setDoneAt(null);
                      }}
                    >
                      <option value="">Chọn căn</option>
                      {options.map((r: UnitRow) => {
                        const why = exitBlockReason(r);
                        return (
                          <option key={r.id} value={r.mandate?.id ?? `unit:${r.id}`} disabled={!!why}>
                            {unitLabel(r)}
                            {why ? ` — ${why}, chưa thể thoát` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {rows.length === 0 && <span className="muted xs">Bạn chưa có căn nào đã ký gửi.</span>}
                    {rows.length > 0 && selectable.length === 0 && exiting.length < rows.length && (
                      <span className="muted xs">Hiện chưa có căn nào thoát được: căn phải có ủy quyền đang hiệu lực và đang trống (không giữ chỗ, không cho thuê).</span>
                    )}
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
                    <textarea className="input" rows={3} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nói thêm lý do nếu cần" />
                  </label>

                  <label className="check">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    <span>Căn đang trống và tôi đã nhận đủ khoản thu.</span>
                  </label>

                  {error && (
                    <p className="field-error" role="alert">
                      {error}
                    </p>
                  )}

                  <button type="button" className="btn btn-danger" disabled={!canSubmit} onClick={submit} style={{ alignSelf: "flex-start" }}>
                    Gửi yêu cầu thoát uỷ quyền
                  </button>

                  {doneAt && (
                    <p className="small" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ok)" }}>
                      <CheckCircle2 size={16} /> Đã ghi nhận. Ủy quyền kết thúc từ ngày {fmtDate(doneAt)}.
                    </p>
                  )}
                </div>
              </Section>

              <Section title="Đang đếm ngược thoát uỷ quyền" flush>
                <DataTable
                  columns={[
                    { key: "unit", header: "Căn", render: (r: UnitRow) => unitLabel(r) },
                    { key: "effective", header: "Ngày hiệu lực", render: (r: UnitRow) => (r.mandate?.exitEffectiveAt ? fmtDate(r.mandate.exitEffectiveAt) : "—") },
                    {
                      key: "action",
                      header: "",
                      align: "right",
                      render: (r: UnitRow) => (
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => cancel(r.mandate!.id)}>
                          Huỷ yêu cầu
                        </button>
                      ),
                    },
                  ]}
                  rows={exiting}
                  empty="Không có căn nào đang thoát uỷ quyền."
                />
              </Section>
            </>
          );
        }}
      </QueryView>
    </div>
  );
}
