import type { CriteriaState } from "@/lib/mock/types";

/** 4 trạng thái của màn Preview bên phải khung chat. */
export type PreviewPhase = "idle" | "loading" | "results" | "empty";

/** Criteria có ít nhất một điều kiện (ngân sách, loại căn, phân khu, toà, tầng, nội thất, đồ, thú cưng). */
export function criteriaHasFilters(c: CriteriaState): boolean {
  return c.budget !== undefined || c.layouts.length > 0 || c.zones.length > 0 || c.buildings.length > 0 || c.floor !== undefined || c.furnishing !== undefined || c.items.length > 0 || c.pets !== undefined;
}

/**
 * started = khách đã gửi ≥1 tin; pending = đã gửi nhưng chưa có event `units`/`done`/`error`;
 * resultCount = số căn đang hiện (ghim bởi bot hoặc từ bộ lọc).
 */
export function previewPhase(input: { started: boolean; pending: boolean; resultCount: number }): PreviewPhase {
  if (!input.started) return "idle";
  if (input.pending) return "loading";
  return input.resultCount > 0 ? "results" : "empty";
}

/** Chi tiết căn đang mở trong preview (null = đang xem danh sách). `book` = mở sẵn khung đặt lịch. */
export interface PreviewSelection<T> {
  unit: T;
  book: boolean;
}

export function selectUnit<T>(unit: T, book = false): PreviewSelection<T> {
  return { unit, book };
}

/** Đóng chi tiết (nút quay lại, Esc, làm mới hội thoại). Luôn trả null; tách ra để test hợp đồng. */
export function closeSelection(): null {
  return null;
}

/** Có nên đóng chi tiết bằng Esc không: không khi đang có hộp thoại (đặt lịch) mở. */
export function escShouldClose(key: string, dialogOpen: boolean): boolean {
  return key === "Escape" && !dialogOpen;
}
