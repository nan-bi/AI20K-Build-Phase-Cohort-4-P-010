"use client";

import { useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { Camera, Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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
  LOW_CONDITION,
} from "@/lib/mock/selectors-inspection";
import { consignmentById } from "@/lib/mock/selectors-admin";
import { useMock } from "@/lib/mock/store";
import type {
  Consignment,
  DeclaredField,
  InspectionDraft,
  InspectionReport,
  InventoryGroup,
  InventoryLine,
} from "@/lib/mock/types";
import {
  INVENTORY_CATALOG,
  INVENTORY_GROUP_LABEL,
  MAX_EXTRA_LINES,
  blankInventory,
  passportSummary,
} from "@/lib/mock/inventory";
import {
  landlordById,
  PASSPORT_ITEMS,
  type Furnishing,
  type PassportItem,
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

const GROUPS: InventoryGroup[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function InspectionForm({ id }: { id: string }) {
  const state = useMock();
  const now = useNow(10_000);
  const c = consignmentById(state, id);

  // ─── 1. Đối chiếu khai báo ──────────────────────────────────────────────
  const [declared, setDeclared] = useState<
    Record<DeclaredField, { ok: boolean; actual: string }>
  >({
    identity: { ok: true, actual: "" },
    layout: { ok: true, actual: "" },
    areaM2: { ok: true, actual: "" },
    furnishing: { ok: true, actual: "" },
    lock: { ok: true, actual: "" },
  });

  // ─── 2. Số đo & Phân loại ───────────────────────────────────────────────
  const [netAreaM2, setNetAreaM2] = useState<string>(() => (c ? String(c.areaM2) : ""));
  const [furnishing, setFurnishing] = useState<Furnishing>(() =>
    c ? (c.furnished ? "full" : "empty") : "full",
  );

  // ─── 3. Bảng kê 32 dòng catalog ─────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryLine[]>(() => {
    const blank = blankInventory();
    if (!c) return blank;
    return blank.map((line) => {
      const codeNum = Number(line.code);
      let isPresent = false;
      // Theo SPEC-P03: Dòng 25–29 luôn tick sẵn
      if (codeNum >= 25 && codeNum <= 29) {
        isPresent = true;
      } else if (c.furnished && codeNum >= 1 && codeNum <= 27) {
        // Nếu furnished thì 1–27 tick sẵn
        isPresent = true;
      }
      return {
        ...line,
        present: isPresent,
        qty: 1,
      };
    });
  });

  // ─── 4. Hạng mục thêm (X1..X10) ─────────────────────────────────────────
  const [extraLines, setExtraLines] = useState<InventoryLine[]>([]);

  // ─── 5. Kiểm tra công năng ──────────────────────────────────────────────
  const [functionsChecked, setFunctionsChecked] = useState<Record<string, boolean>>({
    ac: true,
    kitchen: true,
    waterHeater: true,
    drainage: true,
  });

  // ─── 6. Accordion groups mở/thu gọn ─────────────────────────────────────
  const [openGroups, setOpenGroups] = useState<Record<InventoryGroup, boolean>>({
    I: true,
    II: true,
    III: false,
    IV: false,
    V: false,
    VI: false,
    VII: false,
    VIII: false,
  });

  // ─── 7. Đề xuất & Ghi chú ────────────────────────────────────────────────
  const [recommendation, setRecommendation] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ─── Tính toán thống kê trực tiếp ────────────────────────────────────────
  const allLines = useMemo(() => [...inventory, ...extraLines], [inventory, extraLines]);
  const presentLines = useMemo(() => allLines.filter((l) => l.present), [allLines]);
  const completedLines = useMemo(
    () =>
      presentLines.filter(
        (l) => typeof l.condition === "number" && Boolean(l.photoAt) && (l.qty ?? 0) >= 1,
      ),
    [presentLines],
  );
  const photoCount = useMemo(() => presentLines.filter((l) => Boolean(l.photoAt)).length, [presentLines]);
  const lowLines = useMemo(
    () => presentLines.filter((l) => typeof l.condition === "number" && l.condition < LOW_CONDITION),
    [presentLines],
  );
  const passportSum = useMemo(() => passportSummary(allLines), [allLines]);

  const liveAvg = useMemo(() => {
    const scored = presentLines.filter((l) => typeof l.condition === "number");
    if (scored.length === 0) return 0;
    const sum = scored.reduce((acc, curr) => acc + (curr.condition ?? 0), 0);
    return Math.round(sum / scored.length);
  }, [presentLines]);

  if (!state.ready || !now) {
    return <div className="skeleton" style={{ height: 420 }} />;
  }

  if (!c || c.hostId !== HOST_ID) {
    notFound();
  }

  const landlord = landlordById(c.landlordId);
  const can = `${c.building} · Tầng ${c.floor} · Căn ${c.door}`;

  // Helper cập nhật 1 dòng trong inventory
  const updateLine = (code: string, patch: Partial<InventoryLine>) => {
    setInventory((prev) =>
      prev.map((line) => (line.code === code ? { ...line, ...patch } : line)),
    );
  };

  // Helper cập nhật 1 dòng extra
  const updateExtra = (code: string, patch: Partial<InventoryLine>) => {
    setExtraLines((prev) =>
      prev.map((line) => (line.code === code ? { ...line, ...patch } : line)),
    );
  };

  // Thêm dòng extra mới
  const handleAddExtra = () => {
    if (extraLines.length >= MAX_EXTRA_LINES) {
      toast(`Tối đa ${MAX_EXTRA_LINES} hạng mục phát sinh ngoài catalog.`, "info");
      return;
    }
    const nextCode = `X${extraLines.length + 1}`;
    const newLine: InventoryLine = {
      code: nextCode,
      group: "I",
      name: "",
      passport: "Sofa & bàn ghế",
      present: true,
      liability: "misuse",
      qty: 1,
      condition: 80,
      photoAt: "",
      spec: "",
      note: "",
    };
    setExtraLines((prev) => [...prev, newLine]);
  };

  // Xóa dòng extra
  const handleRemoveExtra = (code: string) => {
    setExtraLines((prev) => prev.filter((l) => l.code !== code));
  };

  // Toggle group accordion
  const toggleGroup = (grp: InventoryGroup) => {
    setOpenGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  // ─── Xử lý nộp báo cáo ─────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const netArea = Number(netAreaM2);
    if (!netArea || netArea <= 0) {
      setError("Vui lòng nhập diện tích thông thuỷ đo thực tế (> 0).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (netArea > c.areaM2) {
      setError(`Diện tích thông thuỷ (${netArea} m²) không thể lớn hơn diện tích tim tường (${c.areaM2} m²).`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Kiểm tra các dòng có mặt
    for (const l of presentLines) {
      if (l.condition === undefined || l.condition === null) {
        setError(`Hạng mục "${l.code}. ${l.name}" chưa chọn % độ mới.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (!l.photoAt) {
        setError(`Hạng mục "${l.code}. ${l.name}" chưa chụp ảnh xác thực tại căn.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (l.code.startsWith("X") && !l.name.trim()) {
        setError(`Hạng mục phát sinh ${l.code} chưa nhập tên.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // Nối công năng vào note nếu có
    let finalNote = note.trim();
    const fnTexts: string[] = [];
    if (functionsChecked.ac) fnTexts.push("ĐH mát sau 5p");
    if (functionsChecked.kitchen) fnTexts.push("Bếp nhận nồi sau 15s");
    if (functionsChecked.waterHeater) fnTexts.push("Nóng lạnh & ELCB tốt");
    if (functionsChecked.drainage) fnTexts.push("Cấp thoát nước kín");
    if (fnTexts.length > 0 && !finalNote.includes("Công năng:")) {
      finalNote = finalNote
        ? `${finalNote}. Công năng: ${fnTexts.join(", ")}`
        : `Công năng: ${fnTexts.join(", ")}`;
    }

    const draft: InspectionDraft = {
      declared: DECLARED_FIELDS.map((f) => ({
        field: f,
        ok: declared[f].ok,
        actual: declared[f].ok ? undefined : declared[f].actual.trim(),
      })),
      inventory: allLines,
      netAreaM2: netArea,
      furnishing,
      recommendation,
      note: finalNote || undefined,
    };

    const res = submitInspection(c.id, HOST_ID, draft);
    if (!res.ok) {
      setError(res.reason);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast("Đã nộp báo cáo thẩm định. Admin sẽ chốt ký gửi.", "success");
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
          {/* Cột chính: Form thẩm định */}
          <div className={styles.mainFormCol}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* 1. Đối chiếu thông tin chủ kê khai */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>1. Đối chiếu thông tin chủ kê khai</h3>
              <p
                style={{
                  margin: "0 0 var(--s-2)",
                  fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}
              >
                Kiểm tra tính chính xác của 5 trường thông tin do chủ nhà khai báo ban đầu.
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

            {/* 2. Số đo & Phân loại thực tế */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>2. Số đo & Phân loại thực tế</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--s-4)" }}>
                <label className="field">
                  <span className="label">
                    Diện tích thông thuỷ đo thực tế (m²) <b style={{ color: "var(--danger)" }}>*</b>
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max={c.areaM2}
                    className="input"
                    value={netAreaM2}
                    placeholder={`Đo theo hiện trạng (≤ ${c.areaM2} m²)`}
                    onChange={(e) => setNetAreaM2(e.target.value)}
                    required
                  />
                  <span className="muted xs" style={{ marginTop: 4 }}>
                    Chủ nhà khai tim tường: <b>{c.areaM2} m²</b>. Host đo kích thước lọt lòng trong nhà.
                  </span>
                </label>

                <div className="field">
                  <span className="label">
                    Nội thất thực tế chốt sau thẩm định <b style={{ color: "var(--danger)" }}>*</b>
                  </span>
                  <div className={styles.chipGroup} style={{ marginTop: 6 }}>
                    {(
                      [
                        ["full", "Full nội thất"],
                        ["basic", "Nội thất cơ bản"],
                        ["empty", "Nhà trống"],
                      ] as [Furnishing, string][]
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={`${styles.chipItem} ${
                          furnishing === k ? styles.chipItemActive : ""
                        }`}
                        onClick={() => setFurnishing(k)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bảng kê trang thiết bị nội thất (Điều 5) */}
            <div className={styles.formCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className={styles.formCardTitle}>3. Bảng kê trang thiết bị (Điều 5)</h3>
                  <p
                    style={{
                      margin: "var(--s-1) 0 0",
                      fontSize: "var(--fs-13)",
                      color: "var(--ink-2)",
                    }}
                  >
                    32 hạng mục chuẩn chia theo 8 phân khu sinh hoạt theo HĐ thuê chính thức.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => {
                    const allOpen = Object.values(openGroups).every(Boolean);
                    const nextVal = !allOpen;
                    const nextObj = {} as Record<InventoryGroup, boolean>;
                    for (const g of GROUPS) nextObj[g] = nextVal;
                    setOpenGroups(nextObj);
                  }}
                >
                  {Object.values(openGroups).every(Boolean) ? "Thu gọn tất cả" : "Mở tất cả"}
                </button>
              </div>

              {GROUPS.map((grp) => {
                const groupLines = inventory.filter((l) => l.group === grp);
                const groupPresent = groupLines.filter((l) => l.present);
                const groupDone = groupPresent.filter(
                  (l) => typeof l.condition === "number" && Boolean(l.photoAt),
                );
                const isOpen = openGroups[grp];
                const isComplete = groupPresent.length > 0 && groupDone.length === groupPresent.length;

                return (
                  <div key={grp} className={styles.groupCard}>
                    <div
                      className={`${styles.groupHeader} ${isOpen ? styles.groupHeaderOpen : ""}`}
                      onClick={() => toggleGroup(grp)}
                    >
                      <div className={styles.groupTitle}>
                        <span>
                          {grp}. {INVENTORY_GROUP_LABEL[grp]}
                        </span>
                        <span
                          className={`${styles.groupBadge} ${
                            isComplete ? styles.groupBadgeComplete : ""
                          }`}
                        >
                          {groupDone.length}/{groupPresent.length} món
                        </span>
                      </div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>

                    {isOpen && (
                      <div className={styles.groupBody}>
                        {groupLines.map((line) => {
                          const catalog = INVENTORY_CATALOG.find((cat) => cat.code === line.code);
                          return (
                            <div
                              key={line.code}
                              className={line.present ? styles.invRow : styles.invRowUnchecked}
                            >
                              <div className={styles.invHead}>
                                <label className={styles.invCheckLabel}>
                                  <input
                                    type="checkbox"
                                    checked={line.present}
                                    onChange={(e) =>
                                      updateLine(line.code, { present: e.target.checked })
                                    }
                                  />
                                  <span>
                                    {line.code}. {line.name}
                                  </span>
                                </label>
                                <span
                                  className={`${styles.liabilityBadge} ${
                                    line.liability === "misuse"
                                      ? styles.liabilityMisuse
                                      : styles.liabilityWear
                                  }`}
                                >
                                  {line.liability === "misuse" ? "Lỗi dùng" : "Hao mòn / Lỗi dùng"}
                                </span>
                              </div>

                              {line.present && (
                                <>
                                  <div className={styles.invFields}>
                                    <input
                                      type="text"
                                      className="input"
                                      maxLength={80}
                                      placeholder={catalog?.specHint ?? "Nhãn hiệu / model / quy cách..."}
                                      value={line.spec ?? ""}
                                      onChange={(e) =>
                                        updateLine(line.code, { spec: e.target.value })
                                      }
                                      style={{ fontSize: "var(--fs-13)" }}
                                    />

                                    <input
                                      type="number"
                                      min={1}
                                      className="input"
                                      title="Số lượng"
                                      value={line.qty ?? 1}
                                      onChange={(e) =>
                                        updateLine(line.code, {
                                          qty: Math.max(1, Number(e.target.value) || 1),
                                        })
                                      }
                                      style={{ fontSize: "var(--fs-13)" }}
                                    />

                                    <select
                                      className="select"
                                      value={line.condition !== undefined ? line.condition : ""}
                                      onChange={(e) => {
                                        const v =
                                          e.target.value === "" ? undefined : Number(e.target.value);
                                        updateLine(line.code, { condition: v });
                                      }}
                                      required={line.present}
                                      style={{ fontSize: "var(--fs-13)" }}
                                    >
                                      <option value="">Độ mới</option>
                                      {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((num) => (
                                        <option key={num} value={num}>
                                          {num}%
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      className={`${styles.photoBtn} ${
                                        line.photoAt ? styles.photoBtnDone : ""
                                      }`}
                                      onClick={() => {
                                        const ts = new Date().toISOString();
                                        updateLine(line.code, { photoAt: ts });
                                      }}
                                    >
                                      {line.photoAt ? (
                                        <>
                                          <Check size={13} /> {fmtTime(line.photoAt)}
                                        </>
                                      ) : (
                                        <>
                                          <Camera size={13} /> Chụp ảnh *
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className={styles.invFieldsExtra}>
                                    <input
                                      type="text"
                                      className="input"
                                      maxLength={120}
                                      placeholder="Ghi chú chi tiết hiện trạng..."
                                      value={line.note ?? ""}
                                      onChange={(e) =>
                                        updateLine(line.code, { note: e.target.value })
                                      }
                                      style={{ fontSize: "var(--fs-12)" }}
                                    />
                                    <input
                                      type="number"
                                      step="50000"
                                      className="input"
                                      placeholder="Bồi thường (VNĐ)"
                                      value={line.compensation ?? ""}
                                      onChange={(e) =>
                                        updateLine(line.code, {
                                          compensation: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        })
                                      }
                                      style={{ fontSize: "var(--fs-12)" }}
                                    />
                                  </div>

                                  {catalog?.checkHint && (
                                    <div className={styles.checkHint}>
                                      ↳ Kiểm tra: {catalog.checkHint}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4. Hạng mục phát sinh ngoài catalog (Điều 5 khoản 1) */}
            <div className={styles.formCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className={styles.formCardTitle}>4. Hạng mục phát sinh ngoài catalog</h3>
                  <p
                    style={{
                      margin: "var(--s-1) 0 0",
                      fontSize: "var(--fs-13)",
                      color: "var(--ink-2)",
                    }}
                  >
                    Kê khai thêm tối đa {MAX_EXTRA_LINES} món đồ đặc thù (két sắt, cây cảnh, máy chiếu...)
                  </p>
                </div>
                {extraLines.length < MAX_EXTRA_LINES && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddExtra}
                  >
                    <Plus size={14} /> Thêm hạng mục
                  </button>
                )}
              </div>

              {extraLines.length === 0 ? (
                <p style={{ color: "var(--ink-3)", fontSize: "var(--fs-13)", margin: 0 }}>
                  Không có trang thiết bị phát sinh ngoài catalog 32 món chuẩn.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
                  {extraLines.map((line) => (
                    <div key={line.code} className={styles.invRow}>
                      <div className={styles.invHead}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flex: 1 }}>
                          <strong style={{ color: "var(--ink)", minWidth: 28 }}>{line.code}</strong>
                          <input
                            type="text"
                            className="input"
                            maxLength={60}
                            placeholder="Tên trang thiết bị phát sinh..."
                            value={line.name}
                            onChange={(e) => updateExtra(line.code, { name: e.target.value })}
                            required
                            style={{ flex: 1, fontWeight: 600 }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleRemoveExtra(line.code)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-2)" }}>
                        <label className="field">
                          <span className="label" style={{ fontSize: "var(--fs-11)" }}>Khu vực</span>
                          <select
                            className="select"
                            value={line.group}
                            onChange={(e) =>
                              updateExtra(line.code, { group: e.target.value as InventoryGroup })
                            }
                            style={{ fontSize: "var(--fs-12)" }}
                          >
                            {GROUPS.map((g) => (
                              <option key={g} value={g}>
                                {g}. {INVENTORY_GROUP_LABEL[g]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span className="label" style={{ fontSize: "var(--fs-11)" }}>Nhóm hộ chiếu</span>
                          <select
                            className="select"
                            value={line.passport}
                            onChange={(e) =>
                              updateExtra(line.code, { passport: e.target.value as PassportItem })
                            }
                            style={{ fontSize: "var(--fs-12)" }}
                          >
                            {PASSPORT_ITEMS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className={styles.invFields}>
                        <input
                          type="text"
                          className="input"
                          maxLength={80}
                          placeholder="Nhãn hiệu / model..."
                          value={line.spec ?? ""}
                          onChange={(e) => updateExtra(line.code, { spec: e.target.value })}
                          style={{ fontSize: "var(--fs-13)" }}
                        />
                        <input
                          type="number"
                          min={1}
                          className="input"
                          value={line.qty ?? 1}
                          onChange={(e) =>
                            updateExtra(line.code, {
                              qty: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          style={{ fontSize: "var(--fs-13)" }}
                        />
                        <select
                          className="select"
                          value={line.condition !== undefined ? line.condition : ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : Number(e.target.value);
                            updateExtra(line.code, { condition: v });
                          }}
                          required
                          style={{ fontSize: "var(--fs-13)" }}
                        >
                          <option value="">Độ mới</option>
                          {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((num) => (
                            <option key={num} value={num}>
                              {num}%
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`${styles.photoBtn} ${
                            line.photoAt ? styles.photoBtnDone : ""
                          }`}
                          onClick={() => {
                            const ts = new Date().toISOString();
                            updateExtra(line.code, { photoAt: ts });
                          }}
                        >
                          {line.photoAt ? (
                            <>
                              <Check size={13} /> {fmtTime(line.photoAt)}
                            </>
                          ) : (
                            <>
                              <Camera size={13} /> Chụp ảnh *
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Kiểm tra công năng thiết bị (Điều 5 khoản 3) */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>5. Kiểm tra công năng thiết bị</h3>
              <p
                style={{
                  margin: "0 0 var(--s-2)",
                  fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}
              >
                Quy trình vận hành thử các thiết bị điện máy chính theo quy chuẩn bàn giao.
              </p>

              <div className={styles.fnList}>
                <label className={styles.fnItem}>
                  <input
                    type="checkbox"
                    checked={functionsChecked.ac}
                    onChange={(e) =>
                      setFunctionsChecked((prev) => ({ ...prev, ac: e.target.checked }))
                    }
                  />
                  <span>Điều hòa làm lạnh tốt, không rò nước sau 5 phút khởi động</span>
                </label>
                <label className={styles.fnItem}>
                  <input
                    type="checkbox"
                    checked={functionsChecked.kitchen}
                    onChange={(e) =>
                      setFunctionsChecked((prev) => ({ ...prev, kitchen: e.target.checked }))
                    }
                  />
                  <span>Bếp từ / hồng ngoại nhận nồi sau 15 giây, phím cảm ứng nhạy</span>
                </label>
                <label className={styles.fnItem}>
                  <input
                    type="checkbox"
                    checked={functionsChecked.waterHeater}
                    onChange={(e) =>
                      setFunctionsChecked((prev) => ({ ...prev, waterHeater: e.target.checked }))
                    }
                  />
                  <span>Bình nước nóng hoạt động, nút ELCB chống giật nhảy bình thường</span>
                </label>
                <label className={styles.fnItem}>
                  <input
                    type="checkbox"
                    checked={functionsChecked.drainage}
                    onChange={(e) =>
                      setFunctionsChecked((prev) => ({ ...prev, drainage: e.target.checked }))
                    }
                  />
                  <span>Hệ thống cấp thoát nước, vòi rửa, lavabo kín, không rò rỉ ngấm tường</span>
                </label>
              </div>
            </div>

            {/* 6. Đề xuất & Ghi chú của Host */}
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>6. Đề xuất của Field Host</h3>

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
                  { label: "Diện tích tim tường", value: `${c.areaM2} m²` },
                  { label: "Giá thuê", value: `${vnd(c.askRent)}đ/tháng` },
                  {
                    label: "Nội thất",
                    value: c.furnished ? "Có nội thất" : "Không nội thất",
                  },
                  {
                    label: "Loại khoá",
                    value:
                      c.locks && c.locks.includes("smart") && c.locks.includes("physical")
                        ? "Khoá điện tử + chìa cơ"
                        : c.locks?.includes("physical")
                        ? "Khoá cơ"
                        : "Khoá điện tử",
                  },
                ]}
              />
            </Section>

            <Section title="Tổng hợp trực tiếp">
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
                    Đã kiểm tra: {completedLines.length}/{presentLines.length} món
                  </strong>
                  <div style={{ fontSize: "var(--fs-12)", color: "var(--ink-3)", marginTop: 4 }}>
                    Đã chụp ảnh: {photoCount}/{presentLines.length}
                  </div>
                </div>

                <KeyValue
                  items={[
                    {
                      label: "Độ mới TB",
                      value: `${liveAvg}%`,
                    },
                    {
                      label: "Món độ mới < 60%",
                      value: `${lowLines.length} món`,
                    },
                    {
                      label: "Số món phát sinh",
                      value: `${extraLines.length} món`,
                    },
                  ]}
                />

                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: "var(--s-3)",
                  }}
                >
                  <strong style={{ fontSize: "var(--fs-13)", display: "block", marginBottom: 8 }}>
                    10 Hạng mục Hộ chiếu số
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {passportSum.map((p) => (
                      <div
                        key={p.item}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "var(--fs-12)",
                        }}
                      >
                        <span style={{ color: "var(--ink-2)" }}>{p.item}</span>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              p.avg !== null && p.avg < LOW_CONDITION
                                ? "var(--danger)"
                                : "var(--ink)",
                          }}
                        >
                          {p.avg !== null ? `${p.avg}% (${p.count})` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </form>
      )}
    </div>
  );
}
