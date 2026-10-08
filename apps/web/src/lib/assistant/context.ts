import { vndShort } from "@/lib/format";

/** Tiêu chí tìm bot đang nhớ (khớp ai-engine SearchContext / 01-CONTRACTS §5). */
export interface SearchContext {
  max_all_in_budget?: number;
  occupants?: number;
  motorbikes?: number;
  cars?: number;
  layout?: "studio" | "1pn" | "2pn" | "3pn";
  furnishing?: "full" | "basic" | "empty";
  pet?: boolean;
  min_floor?: number;
  max_floor?: number;
  must_have?: string[];
}

const LAYOUTS = ["studio", "1pn", "2pn", "3pn"] as const;
const FURNISHINGS = ["full", "basic", "empty"] as const;
const INT_KEYS = ["max_all_in_budget", "occupants", "motorbikes", "cars", "min_floor", "max_floor"] as const;

/** Chỉ giữ khoá/kiểu hợp lệ từ dữ liệu ngoài (event SSE). Rỗng ⇒ null. */
export function sanitizeContext(raw: unknown): SearchContext | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: SearchContext = {};
  for (const k of INT_KEYS) {
    const v = r[k];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) out[k] = v;
  }
  if (typeof r.layout === "string" && (LAYOUTS as readonly string[]).includes(r.layout)) out.layout = r.layout as SearchContext["layout"];
  if (typeof r.furnishing === "string" && (FURNISHINGS as readonly string[]).includes(r.furnishing)) out.furnishing = r.furnishing as SearchContext["furnishing"];
  if (typeof r.pet === "boolean") out.pet = r.pet;
  if (Array.isArray(r.must_have)) {
    const items = r.must_have.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 40)).slice(0, 5);
    if (items.length) out.must_have = items;
  }
  return Object.keys(out).length ? out : null;
}

const LAYOUT_LABEL = { studio: "Studio", "1pn": "1PN", "2pn": "2PN", "3pn": "3PN" } as const;
const FURNISHING_LABEL = { full: "Nội thất đầy đủ", basic: "Nội thất cơ bản", empty: "Không nội thất" } as const;

/** Chip đọc-only mô tả tiêu chí bot đang nhớ. */
export function contextChips(ctx: SearchContext | null | undefined): { key: string; label: string }[] {
  if (!ctx) return [];
  const chips: { key: string; label: string }[] = [];
  if (ctx.max_all_in_budget !== undefined) chips.push({ key: "budget", label: `All-in ≤ ${vndShort(ctx.max_all_in_budget)}` });
  if (ctx.occupants !== undefined) chips.push({ key: "occupants", label: `${ctx.occupants} người ở` });
  if (ctx.motorbikes !== undefined || ctx.cars !== undefined) {
    const bikes = ctx.motorbikes ?? 0;
    const cars = ctx.cars ?? 0;
    chips.push({ key: "vehicles", label: bikes + cars === 0 ? "Không xe" : [bikes ? `${bikes} xe máy` : "", cars ? `${cars} ô tô` : ""].filter(Boolean).join(", ") });
  }
  if (ctx.layout) chips.push({ key: "layout", label: LAYOUT_LABEL[ctx.layout] });
  if (ctx.furnishing) chips.push({ key: "furnishing", label: FURNISHING_LABEL[ctx.furnishing] });
  if (ctx.pet) chips.push({ key: "pet", label: "Nuôi thú cưng" });
  if (ctx.min_floor !== undefined) chips.push({ key: "min_floor", label: `Từ tầng ${ctx.min_floor}` });
  if (ctx.max_floor !== undefined) chips.push({ key: "max_floor", label: `Đến tầng ${ctx.max_floor}` });
  for (const item of ctx.must_have ?? []) chips.push({ key: `must:${item}`, label: `Có ${item}` });
  return chips;
}

/** Giả định mặc định ai-engine đã dùng khi khách chưa nói (event `units.assumed`; chỉ gồm khoá khách chưa nói). */
export interface AssumedDefaults {
  occupants?: number;
  motorbikes?: number;
  cars?: number;
}

export function sanitizeAssumed(raw: unknown): AssumedDefaults | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: AssumedDefaults = {};
  for (const k of ["occupants", "motorbikes", "cars"] as const) {
    const v = r[k];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 20) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** "Tạm tính 2 người · 1 xe máy"; chỉ nêu phần có ý nghĩa (không nêu "0 ô tô"). Không có gì để nói ⇒ null. */
export function assumedLabel(a: AssumedDefaults | null | undefined): string | null {
  if (!a) return null;
  const parts = [
    a.occupants !== undefined ? `${a.occupants} người` : "",
    a.motorbikes ? `${a.motorbikes} xe máy` : "",
    a.cars ? `${a.cars} ô tô` : "",
  ].filter(Boolean);
  return parts.length ? `Tạm tính ${parts.join(" · ")}` : null;
}
