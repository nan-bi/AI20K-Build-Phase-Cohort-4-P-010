"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyValue } from "@/components/ui/KeyValue";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { STATUS_META } from "@/components/booking/status";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { InspectionReportView } from "@/components/consign/InspectionReportView";
import { CONSIGN_STATUS_META } from "@/components/consign/status";
import { approveConsignment, rejectConsignment } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { allInCost, DEFAULT_HOUSEHOLD } from "@/lib/mock/cost";
import { fmtDate, fmtDateTime, vnd } from "@/lib/mock/format";
import { unitStatus } from "@/lib/mock/selectors";
import { consignmentById, unitBookings } from "@/lib/mock/selectors-admin";
import { isInspectOverdue } from "@/lib/mock/selectors-inspection";
import { useMock } from "@/lib/mock/store";
import type { Booking, Consignment, InspectionReport } from "@/lib/mock/types";
import { FURNISHING_LABEL, LAYOUT_LABEL, hostById, hostForUnit, landlordById, unitAddress, unitById, zoneById, type UnitStatus } from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "./Admin.module.css";

const UNIT_STATUS_META: Record<UnitStatus, { label: string; tone: StatusTone }> = {
  available: { label: "Còn trống", tone: "ok" },
  holding: { label: "Giữ chỗ 24h", tone: "warn" },
  rented: { label: "Đã cho thuê", tone: "neutral" },
};

/** Hồ sơ duyệt một căn ký gửi — id có thể là consignment id (chưa có Unit) hoặc unit id (đã lên rổ hàng). */
export function AdminInventoryDetail({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(60_000);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("Ảnh hiện trạng chưa rõ hoặc chất lượng chưa đạt yêu cầu");
  const [rejectError, setRejectError] = useState("");

  if (!state.ready || !now) return <div className="skeleton" style={{ height: 420 }} />;

  const unit = unitById(id);
  const consignment = unit ? undefined : consignmentById(state, id);
  if (!unit && !consignment) notFound();

  if (unit) {
    const s = unitStatus(state, unit);
    const m = state.mandates[unit.id];
    const bookings = unitBookings(state, unit.id).slice(0, 8);
    return (
      <div className={styles.page}>
        <PageHeader title={unitAddress(unit)} back={{ href: "/admin/inventory", label: "Căn hộ & ký gửi" }} />

        <Section title="Thông tin căn hộ">
          <KeyValue
            items={[
              { label: "Chủ nhà", value: landlordById(unit.landlordId)?.name ?? "—" },
              { label: "Phân khu", value: zoneById(unit.zoneId).name },
              { label: "Loại căn", value: `${unit.layoutLabel} · ${unit.areaM2} m²` },
              { label: "Giá thuê", value: `${vnd(unit.rent)}đ/tháng` },
              { label: "All-in cost", value: `${vnd(allInCost(unit, DEFAULT_HOUSEHOLD).total)}đ/tháng` },
              { label: "Nội thất", value: FURNISHING_LABEL[unit.furnishing] },
              { label: "Loại khoá", value: unit.lock === "smart" ? "Khoá điện tử" : "Chìa cơ tại quầy phân khu" },
              { label: "Field Host phụ trách", value: hostForUnit(unit).name },
              { label: "Trạng thái", value: <StatusBadge tone={UNIT_STATUS_META[s].tone}>{UNIT_STATUS_META[s].label}</StatusBadge> },
              { label: "Ủy quyền ký gửi", value: m ? `${m.status === "exiting" ? "Đang thoát, hiệu lực đến " + fmtDate(m.exitEffectiveAt!) : "Đang hiệu lực"} từ ${fmtDate(m.signedAt)}` : "Chưa ký ủy quyền" },
            ]}
          />
        </Section>

        <Section title="Lịch xem gần nhất" flush>
          <DataTable<Booking>
            columns={
              [
                { key: "slot", header: "Giờ hẹn", render: (b) => fmtDateTime(b.slot) },
                { key: "tenant", header: "Khách", render: (b) => b.tenant.name },
                { key: "status", header: "Trạng thái", render: (b) => <span className={`badge ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span> },
              ] satisfies DataTableColumn<Booking>[]
            }
            rows={bookings}
            empty={<span className="muted">Chưa có lịch xem nào cho căn này.</span>}
          />
        </Section>
      </div>
    );
  }

  const c = consignment!;
  const host = c.hostId ? hostById(c.hostId) : null;
  const overdue = isInspectOverdue(c, now);

  const kvItems = [
    { label: "Chủ nhà", value: landlordById(c.landlordId)?.name ?? "—" },
    { label: "Toà · Tầng · Căn", value: `${c.building} · Tầng ${c.floor} · Căn ${c.door}` },
    { label: "Loại căn", value: `${LAYOUT_LABEL[c.layout]} · ${c.areaM2} m²` },
    { label: "Giá chào thuê", value: `${vnd(c.askRent)}đ/tháng` },
    { label: "Nội thất", value: FURNISHING_LABEL[c.furnishing] },
    { label: "Loại khoá", value: c.lock === "smart" ? "Khoá điện tử (mã hoá AES-256)" : "Chìa cơ gửi quầy phân khu" },
    { label: "Field Host phụ trách", value: host ? host.name : "Chưa gán" },
    { label: "Ký ủy quyền", value: c.signedAt ? fmtDateTime(c.signedAt) : "Chưa ký" },
    {
      label: "Hạn thẩm định",
      value: c.inspectDueAt ? (
        <span>
          {fmtDateTime(c.inspectDueAt)}
          {overdue && (
            <span className="badge badge-coral-soft" style={{ marginLeft: 6 }}>
              Quá hạn 48h
            </span>
          )}
        </span>
      ) : (
        "—"
      ),
    },
    { label: "Gửi lúc", value: fmtDate(c.createdAt) },
    {
      label: "Trạng thái",
      value: <StatusBadge tone={CONSIGN_STATUS_META[c.status].tone}>{CONSIGN_STATUS_META[c.status].label}</StatusBadge>,
    },
  ];

  if (c.decidedBy) {
    kvItems.push({
      label: "Người chốt",
      value: `${c.decidedBy} (${fmtDateTime(c.decidedAt!)})`,
    });
  }

  return (
    <div className={styles.page}>
      <PageHeader title={`${c.building} · Tầng ${c.floor} · Căn ${c.door}`} back={{ href: "/admin/inventory", label: "Căn hộ & ký gửi" }} />

      <ConsignTimeline c={c} now={now} />

      <Section title="Yêu cầu ký gửi">
        <KeyValue items={kvItems} />
        {c.note && <p className="small muted" style={{ marginTop: 12 }}>Ghi chú: {c.note}</p>}
      </Section>

      <Section title="Kết quả thẩm định thực tế" description="Biên bản kiểm tra hiện trạng và ảnh thẩm định do Field Host thực hiện.">
        {c.report ? (
          <InspectionReportView c={c as Consignment & { report: InspectionReport }} />
        ) : (
          <EmptyState
            title="Chờ Field Host nộp báo cáo thẩm định"
            description="Field Host phân khu đang tiếp nhận hoặc kiểm tra thực tế tại căn hộ trong vòng 48 giờ."
          />
        )}
      </Section>

      {c.status === "reviewing" && (
        <div className={styles.reqActions}>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setRejecting(true);
              setNote("Ảnh hiện trạng hoặc chất lượng chưa đạt yêu cầu");
              setRejectError("");
            }}
          >
            <X size={16} /> Từ chối
          </button>
          <button
            type="button"
            className="btn btn-success"
            style={{ flex: 1 }}
            onClick={() => {
              const res = approveConsignment(c.id, DEMO_USERS.admin.name);
              if (res.ok) {
                toast("Đã nhận ký gửi. Zalo báo chủ nhà, push báo Host.", "success");
              } else {
                toast(`Không thể duyệt: ${res.reason}`);
              }
            }}
          >
            <Check size={16} /> Duyệt ký gửi
          </button>
        </div>
      )}

      {(c.status === "awaiting_host" || c.status === "inspecting") && (
        <div className={styles.reqActions} style={{ alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setRejecting(true);
              setNote("Thông tin căn hộ không hợp lệ hoặc chủ nhà yêu cầu huỷ");
              setRejectError("");
            }}
          >
            <X size={16} /> Từ chối
          </button>
          <span className="muted small" style={{ marginLeft: "auto" }}>
            Chỉ duyệt được sau khi Field Host nộp báo cáo.
          </span>
        </div>
      )}

      {c.status === "rejected" && (
        <div className="card" style={{ marginTop: "var(--space-4)", background: "var(--danger-050)", borderColor: "var(--danger-200)" }}>
          <p className="small">
            <b>Đã từ chối ký gửi:</b> {c.note ?? "Không đạt yêu cầu"}
            {c.decidedBy && <span className="muted"> (Bởi {c.decidedBy} lúc {fmtDateTime(c.decidedAt!)})</span>}
          </p>
        </div>
      )}

      {c.status === "approved" && (
        <div className="card" style={{ marginTop: "var(--space-4)", background: "var(--ok-050)", borderColor: "var(--ok-200)" }}>
          <p className="small">
            <b>Đã duyệt nhận ký gửi</b>
            {c.decidedBy && <span className="muted"> (Bởi {c.decidedBy} lúc {fmtDateTime(c.decidedAt!)})</span>}
          </p>
        </div>
      )}

      <Modal
        open={rejecting}
        onClose={() => {
          setRejecting(false);
          setRejectError("");
        }}
        variant="sheet"
        title="Từ chối yêu cầu ký gửi"
        footer={
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              const res = rejectConsignment(c.id, note, DEMO_USERS.admin.name);
              if (!res.ok) {
                if (res.reason === "invalid_note") {
                  setRejectError("Lý do từ chối phải có ít nhất 5 ký tự.");
                } else {
                  setRejectError(res.reason);
                }
                return;
              }
              setRejecting(false);
              setRejectError("");
              toast("Đã từ chối và báo chủ nhà qua Zalo", "success");
            }}
          >
            Xác nhận không duyệt
          </button>
        }
      >
        <label className="field">
          <span className="label">Lý do (gửi cho chủ nhà)</span>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (rejectError) setRejectError("");
            }}
            placeholder="Nêu rõ lý do từ chối (tối thiểu 5 ký tự)..."
          />
          {rejectError && <span className="field-error">{rejectError}</span>}
        </label>
      </Modal>
    </div>
  );
}
