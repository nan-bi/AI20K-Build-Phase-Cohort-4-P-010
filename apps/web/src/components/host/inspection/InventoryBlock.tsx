"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { CONDITION_OPTIONS, GROUPS, GROUP_LABEL, MAX_EXTRA_LINES, blankLine, liabilityLabel } from "@/lib/inspection/logic";
import type { CatalogItem, DraftLine, InspectionDraft, InventoryGroup } from "@/lib/inspection/types";
import consign from "@/components/consign/Consign.module.css";
import { PhotoStrip } from "./PhotoStrip";
import type { PhotoController } from "./photoController";
import styles from "./Inspection.module.css";

interface Props {
  draft: InspectionDraft;
  catalog: CatalogItem[];
  photos: PhotoController;
  invalidField: string | null;
  onChange: (patch: (d: InspectionDraft) => InspectionDraft) => void;
}

const invalidIndex = (field: string | null): number => {
  const m = field ? /^inventory\.(\d+)/.exec(field) : null;
  return m ? Number(m[1]) : -1;
};

/** Khối 5 — bảng kê 32 hạng mục Điều 5 (accordion 8 nhóm) + tối đa 10 dòng phát sinh X. */
export function InventoryBlock({ draft, catalog, photos, invalidField, onChange }: Props) {
  const [open, setOpen] = useState<Record<InventoryGroup, boolean>>({ I: true, II: true, III: false, IV: false, V: false, VI: false, VII: false, VIII: false });
  const bad = invalidIndex(invalidField);
  const n = catalog.length;
  const extras = draft.inventory.slice(n);
  const allOpen = GROUPS.every((g) => open[g]);
  const catalogLines = draft.inventory.slice(0, n);
  const allPresent = catalogLines.every((l) => l.present);
  const nonePresent = catalogLines.every((l) => !l.present);

  // Tick / bỏ tick cả 32 hạng mục chuẩn (không đụng dòng phát sinh X). Ảnh đã tải vẫn nằm trên máy chủ như khi bỏ tick từng dòng.
  const setAllPresent = (value: boolean) => onChange((d) => ({ ...d, inventory: d.inventory.map((l, i) => (i < n ? { ...l, present: value } : l)) }));

  const patchLine = (index: number, p: Partial<DraftLine>) => onChange((d) => ({ ...d, inventory: d.inventory.map((l, i) => (i === index ? { ...l, ...p } : l)) }));

  const addExtra = () => {
    if (extras.length >= MAX_EXTRA_LINES) {
      toast(`Tối đa ${MAX_EXTRA_LINES} hạng mục phát sinh ngoài catalog.`, "info");
      return;
    }
    onChange((d) => ({ ...d, inventory: [...d.inventory, { ...blankLine({ code: `X${d.inventory.length - n + 1}`, group: "I", name: "", liability: "misuse" }, true), condition: 80 }] }));
  };
  const removeExtra = (index: number) => {
    // Chỉ cho xoá dòng X CUỐI (mã X1..Xk phải liên tục, ảnh gắn theo mã) — ảnh của dòng đó xoá khỏi server luôn.
    const line = draft.inventory[index];
    for (const p of photos.photosOf(line.code)) photos.remove(p.id);
    onChange((d) => ({ ...d, inventory: d.inventory.filter((_, i) => i !== index) }));
  };

  return (
    <div className={consign.formCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-3)" }}>
        <div>
          <h3 className={consign.formCardTitle}>5. Bảng kê trang thiết bị</h3>
          <p className="muted small" style={{ margin: "var(--s-1) 0 0" }}>
            {n} hạng mục chuẩn chia theo 8 khu vực. Mỗi hạng mục có mặt cần 1–{photos.perLineMax} ảnh chụp tại căn (bằng chứng cho Hộ chiếu bàn giao, không công khai).
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-quiet btn-sm" disabled={allPresent} onClick={() => setAllPresent(true)}>
            Tick tất cả
          </button>
          <button type="button" className="btn btn-quiet btn-sm" disabled={nonePresent} onClick={() => setAllPresent(false)}>
            Bỏ tick tất cả
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(Object.fromEntries(GROUPS.map((g) => [g, !allOpen])) as Record<InventoryGroup, boolean>)}>
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </button>
        </div>
      </div>

      {GROUPS.map((grp) => {
        const idxs = draft.inventory.slice(0, n).map((l, i) => (l.group === grp ? i : -1)).filter((i) => i >= 0);
        const present = idxs.filter((i) => draft.inventory[i].present);
        const done = present.filter((i) => draft.inventory[i].condition !== null && draft.inventory[i].photoIds.length >= 1);
        const isOpen = open[grp] || idxs.includes(bad);
        const complete = present.length > 0 && done.length === present.length;
        return (
          <div key={grp} className={consign.groupCard}>
            <div className={`${consign.groupHeader} ${isOpen ? consign.groupHeaderOpen : ""}`} onClick={() => setOpen((p) => ({ ...p, [grp]: !p[grp] }))}>
              <div className={consign.groupTitle}>
                <span>
                  {grp}. {GROUP_LABEL[grp]}
                </span>
                <span className={`${consign.groupBadge} ${complete ? consign.groupBadgeComplete : ""}`}>
                  {done.length}/{present.length} món
                </span>
              </div>
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {isOpen && (
              <div className={consign.groupBody}>
                {idxs.map((i) => (
                  <LineRow key={draft.inventory[i].code} id={`insp-inventory-${i}`} line={draft.inventory[i]} hint={catalog[i]} bad={bad === i} photos={photos} onPatch={(p) => patchLine(i, p)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-3)", marginTop: "var(--s-2)" }}>
        <div>
          <h4 className={consign.formCardTitle}>Hạng mục phát sinh ngoài</h4>
          <p className="muted small" style={{ margin: "var(--s-1) 0 0" }}>
            Tối đa {MAX_EXTRA_LINES} món đặc thù (két sắt, cây cảnh, máy chiếu…).
          </p>
        </div>
        {extras.length < MAX_EXTRA_LINES && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={addExtra}>
            <Plus size={14} /> Thêm hạng mục
          </button>
        )}
      </div>
      {extras.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>
          Không có trang thiết bị phát sinh ngoài {n} món chuẩn.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          {extras.map((l, k) => {
            const i = n + k;
            return <LineRow key={l.code} id={`insp-inventory-${i}`} line={l} bad={bad === i} photos={photos} extra onRemove={k === extras.length - 1 ? () => removeExtra(i) : undefined} onPatch={(p) => patchLine(i, p)} />;
          })}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  id: string;
  line: DraftLine;
  hint?: CatalogItem;
  bad: boolean;
  extra?: boolean;
  photos: PhotoController;
  onPatch: (p: Partial<DraftLine>) => void;
  onRemove?: () => void;
}

function LineRow({ id, line, hint, bad, extra, photos, onPatch, onRemove }: RowProps) {
  const own = photos.photosOf(line.code);
  const ups = photos.uploadsOf(line.code);
  return (
    <div id={id} className={`${line.present ? consign.invRow : consign.invRowUnchecked} ${bad ? styles.rowBad : ""}`}>
      <div className={consign.invHead}>
        {extra ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flex: 1 }}>
            <strong style={{ minWidth: 28 }}>{line.code}</strong>
            <input type="text" className="input" maxLength={60} placeholder="Tên trang thiết bị phát sinh…" value={line.name} onChange={(e) => onPatch({ name: e.target.value })} style={{ flex: 1, fontWeight: 600 }} />
            {onRemove && (
              <button type="button" className="btn btn-quiet btn-sm" style={{ color: "var(--danger)" }} aria-label="Xoá hạng mục" onClick={onRemove}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ) : (
          <label className={consign.invCheckLabel}>
            <input type="checkbox" checked={line.present} onChange={(e) => onPatch({ present: e.target.checked })} />
            <span>
              {line.code}. {line.name}
            </span>
          </label>
        )}
        {!extra && <span className={`${consign.liabilityBadge} ${line.liability === "misuse" ? consign.liabilityMisuse : consign.liabilityWear}`}>{liabilityLabel(line.liability)}</span>}
      </div>

      {extra && (
        <label className="field">
          <span className="label" style={{ fontSize: "var(--fs-12)" }}>Khu vực</span>
          <select className="select" value={line.group} onChange={(e) => onPatch({ group: e.target.value as InventoryGroup })} style={{ fontSize: "var(--fs-13)" }}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}. {GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
      )}

      {line.present && (
        <>
          <div className={consign.invFields}>
            <input type="text" className="input" maxLength={80} placeholder={hint?.specHint || "Nhãn hiệu / model / quy cách…"} value={line.spec} onChange={(e) => onPatch({ spec: e.target.value })} style={{ fontSize: "var(--fs-13)" }} />
            <input type="number" min={1} className="input" title="Số lượng" value={line.qty} onChange={(e) => onPatch({ qty: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} style={{ fontSize: "var(--fs-13)" }} />
            <select className="select" aria-label="Độ mới" value={line.condition ?? ""} onChange={(e) => onPatch({ condition: e.target.value === "" ? null : Number(e.target.value) })} style={{ fontSize: "var(--fs-13)" }}>
              <option value="">Độ mới *</option>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}%
                </option>
              ))}
            </select>
          </div>

          <div className={consign.invFieldsExtra}>
            <input type="text" className="input" maxLength={120} placeholder="Ghi chú chi tiết hiện trạng…" value={line.note} onChange={(e) => onPatch({ note: e.target.value })} style={{ fontSize: "var(--fs-12)" }} />
            <input type="number" min={0} step="50000" className="input" placeholder="Bồi thường (VNĐ)" value={line.compensation} onChange={(e) => onPatch({ compensation: e.target.value })} style={{ fontSize: "var(--fs-12)" }} />
          </div>

          <PhotoStrip
            slot={line.code}
            photos={own}
            uploads={ups}
            previews={photos.previews}
            max={photos.perLineMax}
            totalLeft={photos.totalLeft}
            removing={photos.removing}
            label="Chụp ảnh *"
            onAdd={(files) => photos.add(line.code, undefined, files)}
            onRemove={photos.remove}
            onRetry={photos.retry}
            onForce={photos.force}
            onDismiss={photos.dismiss}
          />

          {hint?.checkHint && <div className={consign.checkHint}>↳ Kiểm tra: {hint.checkHint}</div>}
        </>
      )}
    </div>
  );
}
