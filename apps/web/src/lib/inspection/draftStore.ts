import type { InspectionDraft } from "./types";

/** Nháp phiếu ở `localStorage` máy Host (SPEC-P03 §1). Ảnh KHÔNG ở nháp (đã trên server, gắn theo `slot`). */
export const draftKey = (id: string) => `vinstay.inspection.draft.${id}`;
const VERSION = 1;

interface Stored {
  v: number;
  draft: InspectionDraft;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Đọc nháp; khoá hỏng / sai dạng / storage chặn ⇒ `null`, KHÔNG ném. */
export function loadDraft(id: string): InspectionDraft | null {
  try {
    const raw = globalThis.localStorage?.getItem(draftKey(id));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== VERSION || !isRecord(parsed.draft)) return null;
    const d = parsed.draft;
    if (!isRecord(d.declared) || !Array.isArray(d.inventory) || typeof d.netAreaM2 !== "string" || !Array.isArray(d.listingOrder)) return null;
    return d as unknown as InspectionDraft;
  } catch {
    return null;
  }
}

/** Lưu nháp; lỗi (private mode, đầy bộ nhớ) ⇒ bỏ qua. */
export function saveDraft(id: string, draft: InspectionDraft): void {
  try {
    // PIN cửa là bí mật: không ghi vào kho trình duyệt.
    const stored: Stored = { v: VERSION, draft: { ...draft, doorPin: "" } };
    globalThis.localStorage?.setItem(draftKey(id), JSON.stringify(stored));
  } catch {
    /* bỏ qua */
  }
}

export function clearDraft(id: string): void {
  try {
    globalThis.localStorage?.removeItem(draftKey(id));
  } catch {
    /* bỏ qua */
  }
}
