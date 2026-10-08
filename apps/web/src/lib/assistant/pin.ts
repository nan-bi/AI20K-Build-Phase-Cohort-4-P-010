/** Mã căn bot gợi ý ∩ catalog, giữ đúng thứ tự bot đưa ra, bỏ trùng; tối đa `limit`. Rỗng ⇒ không ghim, giữ layout cũ. */
export function resolvePinned(codes: string[] | null | undefined, catalogCodes: Iterable<string>, limit = 3): string[] {
  if (!codes?.length) return [];
  const known = new Set(catalogCodes);
  const out: string[] = [];
  for (const code of codes) if (known.has(code) && !out.includes(code)) out.push(code);
  return out.slice(0, limit);
}

/** Tối đa số căn giữ trong preview khi hỏi sâu/so sánh (đủ cho 1 lượt tìm + vài căn nhắc thêm). */
export const MAX_PINNED = 6;
/** Số căn tối đa trong danh sách ghim của preview (= matchedCodes của ai-engine). */
export const MAX_MATCHED = 20;

/**
 * Event `units` ⇒ trạng thái giao diện. `search`: thay danh sách bằng kết quả tìm mới. `focus` (hỏi sâu/so sánh):
 * căn được nhắc lên đầu, các căn đang có giữ nguyên phía sau — preview không thu hẹp mỗi lần khách hỏi về 1–2 căn.
 */
export function applyUnitsEvent(
  codes: string[],
  catalogCodes: Iterable<string>,
  mode: "search" | "focus" = "search",
  previous: string[] | null = null,
  matchedCodes: string[] | null = null,
) {
  const catalog = [...catalogCodes];
  const mentioned = resolvePinned(codes, catalog, MAX_PINNED);
  // Danh sách xếp hạng đầy đủ của matchmaker (tối đa MAX_MATCHED), chỉ ở lượt search.
  const ranked = mode === "search" ? resolvePinned(matchedCodes, catalog, MAX_MATCHED) : [];
  if (!mentioned.length && !ranked.length) return null;
  const known = new Set(catalog);
  let pinned: string[];
  let suggested: string[];
  if (ranked.length) {
    // Căn bot nhắc (≤3) đứng đầu kèm nhãn "Gợi ý #n"; còn lại theo thứ tự xếp hạng.
    suggested = mentioned.slice(0, 3);
    pinned = [...suggested, ...ranked.filter((c) => !suggested.includes(c))];
  } else if (mode === "focus" && previous?.length) {
    pinned = [...mentioned, ...previous.filter((c) => known.has(c) && !mentioned.includes(c))].slice(0, MAX_MATCHED);
    suggested = mentioned;
  } else {
    pinned = mentioned.slice(0, 3);
    suggested = pinned;
  }
  return { searched: true as const, tab: "results" as const, pinned, suggested, focused: mode === "focus" ? mentioned : [] };
}

/** Mã ghi chú preview: "kept" = search 0 căn nên giữ danh sách trước. */
export type PinNote = "kept" | null;

export interface UnitsEventLike {
  unitCodes: string[];
  mode: "search" | "focus";
  matched?: number;
  /** Mã TẤT CẢ căn khớp theo xếp hạng (≤20); thiếu ⇒ tương thích cũ, dùng unitCodes. */
  matchedCodes?: string[];
}

/**
 * Preview THU HẸP DẦN, KHÔNG BAO GIỜ TỰ XOÁ. `event` = event units cuối của lượt (null = lượt không có event).
 * ≥1 mã (có trong catalog) ⇒ thay/hợp nhất như applyUnitsEvent; 0 mã ⇒ giữ `prev` (+ note "kept" nếu là search 0 căn); không event ⇒ giữ `prev`.
 */
export function nextPinned(prev: string[] | null, event: UnitsEventLike | null, catalogCodes?: Iterable<string>) {
  const keep = { pinned: prev, note: null as PinNote, applied: null as ReturnType<typeof applyUnitsEvent> };
  if (!event) return keep;
  if (!event.unitCodes.length && !event.matchedCodes?.length) return { ...keep, note: (event.matched === 0 && prev?.length ? "kept" : null) as PinNote };
  const applied = applyUnitsEvent(event.unitCodes, catalogCodes ?? [...event.unitCodes, ...(event.matchedCodes ?? [])], event.mode, prev, event.matchedCodes);
  return applied ? { pinned: applied.pinned, note: null as PinNote, applied } : keep;
}
