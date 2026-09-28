"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { KeyValue } from "@/components/ui/KeyValue";
import { toast } from "@/components/ui/Toast";
import { ConsignTimeline } from "@/components/consign/ConsignTimeline";
import { InspectionReportView } from "@/components/consign/InspectionReportView";
import { hostAcceptInspection, submitInspection } from "@/lib/mock/actions";
import { DEMO_USERS } from "@/lib/mock/auth";
import { fmtTime, vnd } from "@/lib/mock/format";
import {
  DECLARED_LABEL,
  declaredValue,
} from "@/lib/mock/selectors-inspection";
import { consignmentById } from "@/lib/mock/selectors-admin";
import { useMock } from "@/lib/mock/store";
import type {
  Consignment,
  DeclaredField,
  InspectionDraft,
  InspectionReport,
} from "@/lib/mock/types";
import {
  ITEM_LABEL,
  landlordById,
  PASSPORT_ITEMS,
} from "@/lib/mock/units";
import { useNow } from "@/lib/useNow";
import styles from "@/components/consign/Consign.module.css";

const HOST_ID = DEMO_USERS.host.refId!;
const DECLARED_FIELDS: DeclaredField[] = [
  "identity",
  "layout",
  "areaM2",
  "furnishing",
  "lock",
];

export function InspectionForm({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(10_000);
  const c = consignmentById(state, id);

  // ─── State phiếu thẩm định (khai báo trước early returns) ───────────────
  const [declared, setDeclared] = useState<
    Record<DeclaredField, { ok: boolean; actual: string }>
  >({
    identity: { ok: true, actual: "" },
    layout: { ok: true, actual: "" },
    areaM2: { ok: true, actual: "" },
    furnishing: { ok: true, actual: "" },
    lock: { ok: true, actual: "" },
  });

  const [presentItems, setPresentItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (c?.items) {
      for (const k of c.items) init[k] = true;
    }
    return init;
  });

  const [equipment, setEquipment] = useState<
    { condition: number | null; photoAt: string; note: string }[]
  >(() => PASSPORT_ITEMS.map(() => ({ condition: null, photoAt: "", note: "" })));

  const [recommendation, setRecommendation] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!state.ready || !now) {
    return <div className="skeleton" style={{ height: 420 }} />;
  }

  if (!c || c.hostId !== HOST_ID) {
    notFound();
  }

  // ─── Tổng hợp trực tiếp ────────────────────────────────────────────────
  const scoredCount = equipment.filter((eq) => eq.condition !== null).length;
  const photoCount = equipment.filter((eq) => Boolean(eq.photoAt)).length;
  const scoredConditions = equipment
    .filter((eq) => eq.condition !== null)
    .map((eq) => eq.condition as number);
  const liveAvg =
    scoredConditions.length > 0
      ? Math.round(scoredConditions.reduce((a, b) => a + b, 0) / scoredConditions.length)
      : 0;
  const mismatchCount = Object.values(declared).filter((d) => !d.ok).length;
  const missingCount = Object.values(presentItems).filter((p) => !p).length;

  const landlord = landlordById(c.landlordId);
  const can = `${c.building} · Tầng ${c.floor} · Căn ${c.door}`;

  // ─── Xử lý nộp báo cáo ─────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const draft: InspectionDraft = {
      declared: DECLARED_FIELDS.map((f) => ({
        field: f,
        ok: declared[f].ok,
        actual: declared[f].ok ? undefined : declared[f].actual.trim(),
      })),
      items: c.items.map((key) => ({
        key,
        present: Boolean(presentItems[key]),
      })),
      equipment: equipment.map((eq, i) => ({
        item: PASSPORT_ITEMS[i],
        condition: eq.condition ?? 0,
        photoAt: eq.photoAt,
        note: eq.note ? eq.note.trim() : undefined,
      })),
      recommendation,
      note: note.trim() || undefined,
    };

    const res = submitInspection(c.id, HOST_ID, draft);
    if (!res.ok) {
      setError(res.reason);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast("Đã nộp báo cáo. Admin sẽ chốt ký gửi.", "success");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        title={`Phiếu thẩm định · ${can}`}
        description={`Chủ nhà: ${landlord?.name ?? c.landlordId} · Phân khu ${c.building}`}
        back={{ href: "/host/inspections", label: "Danh sách thẩm định" }}
      />

      <ConsignTimeline c={c} now={now} />

      {/* Case 1: awaiting_host */}
      {c.status === "awaiting_host" && (
        <div
          className={styles.formCard}
          style={{ textAlign: "center", padding: "var(--s-7) var(--s-5)" }}
        >
          <h3 style={{ margin: 0, color: "var(--ink)" }}>Bạn chưa nhận thẩm định này</h3>
          <p
            style={{
              margin: "var(--s-2) 0 var(--s-5)",
              color: "var(--ink-2)",
              fontSize: "var(--fs-13)",
            }}
          >
            Vui lòng nhận ticket trước khi tới kiểm tra thực tế căn hộ.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const res = hostAcceptInspection(c.id, HOST_ID);
                if (res.ok) {
                  toast("Đã nhận. Bạn có thể mở phiếu thẩm định ngay.", "success");
                } else {
                  toast(res.reason, "info");
                }
              }}
            >
              Nhận thẩm định
            </button>
          </div>
        </div>
      )}

      {/* Case 2: reviewing | approved | rejected -> Xem báo cáo chỉ đọc */}
      {(c.status === "reviewing" ||
        c.status === "approved" ||
        c.status === "rejected") &&
        c.report && <InspectionReportView c={c as Consignment & { report: InspectionReport }} />}

      {/* Case 3: inspecting -> Form điền thông tin */}
      {c.status === "inspecting" && (
        <form onSubmit={handleSubmit} className={styles.inspectionGrid}>
          {/* Cột chính: Form 4 khối */}
          <div className={styles.mainFormCol}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* Khối 1: Đối chiếu thông tin chủ kê khai */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>1. Đối chiếu thông tin chủ kê khai</h3>
              <p
                style={{
                  margin: "0 0 var(--s-2)",
                  fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}
              >
                Kiểm tra tính chính xác của 5 trường thông tin do chủ nhà khai báo.
              </p>

              <div>
                {DECLARED_FIELDS.map((f) => {
                  const check = declared[f];
                  return (
                    <div key={f} className={styles.declaredRow}>
                      <div className={styles.declaredHead}>
                        <div>
                          <span className={styles.declaredLabel}>{DECLARED_LABEL[f]}: </span>
                          <span className={styles.declaredVal}>{declaredValue(c, f)}</span>
                        </div>
                        <div className={styles.segmentedWrap}>
                          <button
                            type="button"
                            className={`${styles.segmentedBtn} ${
                              check.ok ? styles.segmentedActive : ""
                            }`}
                            onClick={() =>
                              setDeclared((prev) => ({
                                ...prev,
                                [f]: { ...prev[f], ok: true },
                              }))
                            }
                          >
                            ✓ Khớp
                          </button>
                          <button
                            type="button"
                            className={`${styles.segmentedBtn} ${
                              !check.ok ? styles.segmentedDanger : ""
                            }`}
                            onClick={() =>
                              setDeclared((prev) => ({
                                ...prev,
                                [f]: { ...prev[f], ok: false },
                              }))
                            }
                          >
                            Sai lệch
                          </button>
                        </div>
                      </div>

                      {!check.ok && (
                        <input
                          type="text"
                          className="input"
                          maxLength={80}
                          placeholder={`Nhập giá trị thực tế của ${DECLARED_LABEL[f].toLowerCase()}...`}
                          value={check.actual}
                          onChange={(e) =>
                            setDeclared((prev) => ({
                              ...prev,
                              [f]: { ...prev[f], actual: e.target.value },
                            }))
                          }
                          required
                          style={{ marginTop: "var(--s-1)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Khối 2: Đồ dùng chủ khai */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>2. Kiểm kê đồ dùng chủ khai</h3>
              <p
                style={{
                  margin: "0 0 var(--s-2)",
                  fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}
              >
                Tích chọn các món đồ thực tế đang có mặt tại căn hộ:
              </p>

              {c.items.length === 0 ? (
                <p style={{ color: "var(--ink-3)", fontSize: "var(--fs-13)", margin: 0 }}>
                  Chủ nhà không kê khai đồ dùng rời.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
                  {c.items.map((key) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--s-2)",
                        fontSize: "var(--fs-13)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(presentItems[key])}
                        onChange={(e) =>
                          setPresentItems((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      <span>{ITEM_LABEL[key] ?? key}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Khối 3: % độ mới 10 hạng mục Hộ chiếu số */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>
                3. Đánh giá % độ mới & Chụp ảnh 10 hạng mục
              </h3>
              <p
                style={{
                  margin: "0 0 var(--s-2)",
                  fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}
              >
                Mỗi hạng mục cần chọn mức độ mới (bội số 10%) và chụp ảnh xác thực tại căn.
              </p>

              <div>
                {PASSPORT_ITEMS.map((item, idx) => {
                  const eq = equipment[idx];
                  return (
                    <div key={item} className={styles.equipmentRow}>
                      <span style={{ fontWeight: 600, fontSize: "var(--fs-13)" }}>
                        {item}
                      </span>

                      <select
                        className="select"
                        value={eq.condition !== null ? eq.condition : ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          setEquipment((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, condition: val } : it)),
                          );
                        }}
                        required
                        style={{ fontSize: "var(--fs-13)" }}
                      >
                        <option value="">Chọn %</option>
                        {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((num) => (
                          <option key={num} value={num}>
                            {num}%
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className={`${styles.photoBtn} ${
                          eq.photoAt ? styles.photoBtnDone : ""
                        }`}
                        onClick={() => {
                          const timestamp = new Date().toISOString();
                          setEquipment((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, photoAt: timestamp } : it,
                            ),
                          );
                        }}
                      >
                        {eq.photoAt ? (
                          <>
                            <Check size={13} /> Đã chụp {fmtTime(eq.photoAt)}
                          </>
                        ) : (
                          <>
                            <Camera size={13} /> Chụp ảnh
                          </>
                        )}
                      </button>

                      <input
                        type="text"
                        className="input"
                        maxLength={120}
                        placeholder="Ghi chú hiện trạng (nếu có)..."
                        value={eq.note}
                        onChange={(e) => {
                          const text = e.target.value;
                          setEquipment((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, note: text } : it)),
                          );
                        }}
                        style={{ fontSize: "var(--fs-12)" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Khối 4: Đề xuất & Ghi chú */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>4. Đề xuất của Field Host</h3>

              <div
                style={{
                  display: "flex",
                  gap: "var(--s-5)",
                  margin: "var(--s-1) 0 var(--s-3)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-2)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value="approve"
                    checked={recommendation === "approve"}
                    onChange={() => setRecommendation("approve")}
                  />
                  <span>Đề xuất duyệt</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-2)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value="reject"
                    checked={recommendation === "reject"}
                    onChange={() => setRecommendation("reject")}
                  />
                  <span>Đề xuất không duyệt</span>
                </label>
              </div>

              <textarea
                className="input"
                rows={3}
                maxLength={300}
                placeholder={
                  recommendation === "reject"
                    ? "Nhập lý do đề xuất không duyệt (Bắt buộc)..."
                    : "Ghi chú thêm cho Admin về tình trạng căn hộ (Tùy chọn)..."
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required={recommendation === "reject"}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }}>
                Nộp báo cáo cho Admin
              </button>
            </div>
          </div>

          {/* Cột phụ: Tóm tắt thông tin & Tiến độ */}
          <div className={styles.sideSummaryCol}>
            <Section title="Thông tin chủ kê khai">
              <KeyValue
                items={[
                  { label: "Căn hộ", value: can },
                  { label: "Chủ nhà", value: landlord?.name ?? c.landlordId },
                  { label: "Loại căn", value: c.layout },
                  { label: "Diện tích", value: `${c.areaM2} m²` },
                  { label: "Giá chào", value: `${vnd(c.askRent)}đ/tháng` },
                  {
                    label: "Loại khoá",
                    value: c.lock === "smart" ? "Khoá thông minh" : "Khoá cơ",
                  },
                ]}
              />
            </Section>

            <Section title="Tổng hợp tự động">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-3)",
                  fontSize: "var(--fs-13)",
                }}
              >
                <div
                  style={{
                    padding: "var(--s-3)",
                    background: "var(--surface-2)",
                    borderRadius: "var(--r-control)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ color: "var(--ink-2)", marginBottom: "4px" }}>
                    Tiến độ hoàn thành:
                  </div>
                  <strong style={{ fontSize: "var(--fs-15)", color: "var(--ink)" }}>
                    Đã chấm {scoredCount}/10 · Đã chụp {photoCount}/10
                  </strong>
                </div>

                <KeyValue
                  items={[
                    {
                      label: "Độ mới TB (tạm tính)",
                      value: `${liveAvg}%`,
                    },
                    {
                      label: "Sai lệch kê khai",
                      value: `${mismatchCount} mục`,
                    },
                    {
                      label: "Đồ dùng thiếu",
                      value: `${missingCount} món`,
                    },
                  ]}
                />
              </div>
            </Section>
          </div>
        </form>
      )}
    </div>
  );
}
