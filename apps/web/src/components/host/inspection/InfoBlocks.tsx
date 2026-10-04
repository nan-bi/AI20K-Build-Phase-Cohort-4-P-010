"use client";

import { useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { KeyValue } from "@/components/ui/KeyValue";
import { vnd } from "@/lib/mock/format";
import { inspectionApi } from "@/lib/inspection/api";
import { DECLARED_FIELDS, DECLARED_LABEL, FURNISHING_LABEL, declaredValue } from "@/lib/inspection/logic";
import { useInspectionAction } from "@/lib/inspection/useInspectionAction";
import type { DeclaredField, DoorAccessView, Furnishing, InspectionDetail, InspectionDraft } from "@/lib/inspection/types";
import { LEASE_TERM_LABEL } from "@/lib/landlord/labels";
import { useNow } from "@/lib/useNow";
import consign from "@/components/consign/Consign.module.css";
import styles from "./Inspection.module.css";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const lockText = (locks: InspectionDetail["locks"]) =>
  locks.includes("smart") && locks.includes("physical") ? "Khoá điện tử + chìa cơ" : locks.includes("physical") ? "Khoá cơ (chìa khoá)" : "Khoá điện tử (có mã số)";

/** Khối 1 — thông tin chủ nhà kê khai + ảnh tham khảo của chủ nhà. */
export function LandlordInfoBlock({ detail }: { detail: InspectionDetail }) {
  return (
    <div className={consign.formCard}>
      <h3 className={consign.formCardTitle}>1. Thông tin chủ nhà kê khai</h3>
      <KeyValue
        items={[
          { label: "Căn hộ", value: `${detail.building} · Tầng ${detail.floor} · Căn ${detail.door ?? "—"}` },
          { label: "Chủ nhà", value: detail.landlordName },
          { label: "Loại căn", value: detail.layoutKind },
          { label: "Diện tích tim tường", value: `${detail.areaM2} m²` },
          { label: "Giá thuê", value: `${vnd(detail.askRent)}đ/tháng` },
          { label: "Tiền cọc đề xuất", value: `${vnd(detail.suggestedDeposit)}đ` },
          ...(detail.leaseTerm ? [{ label: "Thời gian thuê", value: LEASE_TERM_LABEL[detail.leaseTerm] }] : []),
          { label: "Nội thất", value: detail.furnished === false ? "Không nội thất" : "Có nội thất" },
          { label: "Loại khoá", value: lockText(detail.locks) },
          ...(detail.note ? [{ label: "Ghi chú của chủ nhà", value: detail.note }] : []),
        ]}
      />
      {detail.landlordPhotos.length > 0 && (
        <div>
          <p className="muted small" style={{ margin: "0 0 var(--s-2)" }}>
            Ảnh tham khảo do chủ nhà gửi ({detail.landlordPhotos.length}) — không phải ảnh niêm yết.
          </p>
          <div className={styles.refGrid}>
            {detail.landlordPhotos.map((p) => (
              <a key={p.id} className={styles.refItem} href={p.url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`Mở ảnh ${p.name}`}>
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời của Supabase Storage
                  <img src={p.url} alt={p.name} loading="lazy" />
                ) : (
                  <span className="muted xs">Không tải được</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Khối 2 — vào căn: lấy mã cửa (PIN tự ẩn sau 10′, chỉ giữ trong state, KHÔNG lưu trình duyệt). */
export function DoorBlock({ detail }: { detail: InspectionDetail }) {
  const { busy, run } = useInspectionAction(detail.id);
  const now = useNow(1000);
  const [door, setDoor] = useState<DoorAccessView | null>(null);
  const [missing, setMissing] = useState(false);
  const smart = detail.doorKind === "smart";
  const left = door ? Date.parse(door.expiresAt) - now : 0;
  const pinVisible = Boolean(door?.pin) && left > 0;

  async function reveal() {
    const res = await run(() => inspectionApi.doorCode(detail.id));
    if (res.ok) {
      setMissing(false);
      setDoor(res.data);
    } else if (res.code === "door_code_missing") setMissing(true);
  }

  return (
    <div className={consign.formCard}>
      <h3 className={consign.formCardTitle}>2. Vào căn</h3>
      <p className="muted small" style={{ margin: 0 }}>
        Quẹt thẻ cư dân lên tầng {detail.floor}, tới trước cửa căn rồi lấy mã. Mỗi lần lấy mã đều được ghi nhật ký cho chủ nhà.
      </p>

      {smart && pinVisible && (
        <div className={styles.pinBox} role="status">
          <span className="small">Mã cửa căn {detail.door ?? ""}</span>
          <b className={`num ${styles.pinDigits}`}>{door!.pin!.split("").join(" ")} #</b>
          <span className="small">Tự ẩn sau {mmss(left)}</span>
        </div>
      )}
      {!smart && door && (
        <div className={styles.pinBox} role="status">
          <KeyRound size={24} />
          <b>{door.instructions || "Lấy chìa ở quầy phân khu"}</b>
        </div>
      )}
      {smart && door && !pinVisible && <p className={`small ${styles.pinGone}`}>Mã đã ẩn sau 10 phút — bấm lại để xem.</p>}

      {missing && (
        <div className={styles.guide} role="alert">
          Chưa có mã cửa trong hệ thống. Liên hệ chủ nhà qua hỗ trợ VinStay để lấy mã
          {smart ? "; nếu thẩm định Đạt, bạn sẽ nhập mã PIN thật của cửa ở bước Kết luận." : "."}
        </div>
      )}

      <div>
        <button type="button" className="btn btn-amber" disabled={busy} onClick={() => void reveal()}>
          {smart ? <KeyRound size={16} /> : <Lock size={16} />} {door ? "Lấy mã lại" : smart ? "Lấy mã cửa" : "Xem hướng dẫn lấy chìa"}
        </button>
      </div>
    </div>
  );
}

interface DeclaredProps {
  detail: InspectionDetail;
  draft: InspectionDraft;
  invalidField: string | null;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

/** Khối 3 — đối chiếu 5 trường chủ nhà kê khai. */
export function DeclaredBlock({ detail, draft, invalidField, onChange }: DeclaredProps) {
  const set = (f: DeclaredField, v: Partial<{ ok: boolean; actual: string }>) =>
    onChange((d) => ({ ...d, declared: { ...d.declared, [f]: { ...d.declared[f], ...v } } }));
  return (
    <div className={consign.formCard}>
      <h3 className={consign.formCardTitle}>3. Đối chiếu thông tin chủ kê khai</h3>
      <p className="muted small" style={{ margin: 0 }}>
        Kiểm tra 5 trường chủ nhà khai báo ban đầu. Sai lệch thì nhập giá trị thực tế.
      </p>
      <div>
        {DECLARED_FIELDS.map((f, i) => {
          const check = draft.declared[f];
          const bad = invalidField === `declared.${i}`;
          return (
            <div key={f} id={`insp-declared-${i}`} className={`${consign.declaredRow} ${bad ? styles.rowBad : ""}`}>
              <div className={consign.declaredHead}>
                <div>
                  <span className={consign.declaredLabel}>{DECLARED_LABEL[f]}: </span>
                  <span className={consign.declaredVal}>{declaredValue(detail, f)}</span>
                </div>
                <div className={consign.segmentedWrap}>
                  <button type="button" className={`${consign.segmentedBtn} ${check.ok ? consign.segmentedActive : ""}`} onClick={() => set(f, { ok: true })}>
                    ✓ Khớp
                  </button>
                  <button type="button" className={`${consign.segmentedBtn} ${!check.ok ? consign.segmentedDanger : ""}`} onClick={() => set(f, { ok: false })}>
                    Sai lệch
                  </button>
                </div>
              </div>
              {!check.ok && (
                <input
                  type="text"
                  className="input"
                  maxLength={80}
                  placeholder={`Giá trị thực tế của ${DECLARED_LABEL[f].toLowerCase()}…`}
                  value={check.actual}
                  onChange={(e) => set(f, { actual: e.target.value })}
                  style={{ marginTop: "var(--s-1)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Khối 4 — số đo & phân loại: diện tích thông thuỷ, nội thất thực tế, 4 kiểm tra công năng. */
export function MeasureBlock({ detail, draft, invalidField, onChange }: DeclaredProps) {
  const fns: { key: keyof InspectionDraft["functions"]; text: string }[] = [
    { key: "ac", text: "Điều hòa làm lạnh tốt, không rò nước sau 5 phút khởi động" },
    { key: "kitchen", text: "Bếp từ / hồng ngoại nhận nồi sau 15 giây, phím cảm ứng nhạy" },
    { key: "waterHeater", text: "Bình nước nóng hoạt động, nút ELCB chống giật nhảy bình thường" },
    { key: "drainage", text: "Hệ thống cấp thoát nước, vòi rửa, lavabo kín, không rò rỉ ngấm tường" },
  ];
  return (
    <div className={consign.formCard}>
      <h3 className={consign.formCardTitle}>4. Số đo, phân loại & công năng</h3>
      <label className={`field ${invalidField === "netAreaM2" ? styles.rowBad : ""}`} id="insp-netAreaM2">
        <span className="label">
          Diện tích thông thuỷ đo thực tế (m²) <b style={{ color: "var(--danger)" }}>*</b>
        </span>
        <input
          type="number"
          step="0.1"
          min="1"
          max={detail.areaM2}
          className="input"
          value={draft.netAreaM2}
          placeholder={`Đo theo hiện trạng (≤ ${detail.areaM2} m²)`}
          onChange={(e) => onChange((d) => ({ ...d, netAreaM2: e.target.value }))}
        />
        <span className="muted xs" style={{ marginTop: 4 }}>
          Chủ nhà khai tim tường: <b>{detail.areaM2} m²</b>. Đo kích thước lọt lòng trong nhà.
        </span>
      </label>

      <div className="field" id="insp-furnishing">
        <span className="label">
          Nội thất thực tế chốt sau thẩm định <b style={{ color: "var(--danger)" }}>*</b>
        </span>
        <div className={consign.chipGroup} style={{ marginTop: 6 }}>
          {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((k) => (
            <button key={k} type="button" className={`${consign.chipItem} ${draft.furnishing === k ? consign.chipItemActive : ""}`} onClick={() => onChange((d) => ({ ...d, furnishing: k }))}>
              {FURNISHING_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className={consign.fnList}>
        {fns.map((f) => (
          <label key={f.key} className={consign.fnItem}>
            <input type="checkbox" checked={draft.functions[f.key]} onChange={(e) => onChange((d) => ({ ...d, functions: { ...d.functions, [f.key]: e.target.checked } }))} />
            <span>{f.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
