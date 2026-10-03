import type { StatusTone } from "@/components/ui/StatusBadge";
import type { LayoutKind, LeaseTermPref, MandateStatus, UnitStatus, ViewingOutcome } from "./types";

export const LAYOUT_LABEL: Record<LayoutKind, string> = {
  Studio: "Studio",
  "1PN": "1 phòng ngủ",
  "2PN": "2 phòng ngủ",
  "3PN": "3 phòng ngủ",
};

export const LEASE_TERM_LABEL: Record<LeaseTermPref, string> = {
  mid: "Trung hạn: 1–6 tháng",
  long: "Dài hạn: 12 tháng",
  fixed: "Cố định: 12 tháng",
};

/** 10 hạng mục của Hộ chiếu bàn giao số (AGENTS.md — Chủ nhà #3). */
export const PASSPORT_ITEMS = [
  "Tường & sơn",
  "Sàn nhà",
  "Sofa & bàn ghế",
  "Giường & nệm",
  "Điều hòa",
  "Tủ lạnh",
  "Bếp & hút mùi",
  "Bình nóng lạnh",
  "Thiết bị vệ sinh",
  "Cửa, khoá & công tơ",
] as const;

export const UNIT_STATUS_META: Record<UnitStatus, { label: string; tone: StatusTone }> = {
  available: { label: "Đang trống", tone: "neutral" },
  viewing: { label: "Có khách xem", tone: "warn" },
  holding: { label: "Đang giữ căn", tone: "warn" },
  rented: { label: "Đang cho thuê", tone: "ok" },
  unlisted: { label: "Chưa niêm yết", tone: "neutral" },
  maintenance: { label: "Đang bảo trì", tone: "neutral" },
};

/** `none` = căn chưa có bản ghi ủy quyền (vd. nhập thẳng vào DB, chưa qua luồng ký gửi). */
export const MANDATE_META: Record<MandateStatus | "none", { label: string; tone: StatusTone }> = {
  active: { label: "Hiệu lực", tone: "ok" },
  exiting: { label: "Đang đếm ngược", tone: "warn" },
  ended: { label: "Đã kết thúc", tone: "neutral" },
  pending_inspection: { label: "Chờ thẩm định", tone: "info" },
  none: { label: "Chưa ghi nhận", tone: "neutral" },
};

export const VIEWING_OUTCOME_META: Record<ViewingOutcome, { label: string; badge: string }> = {
  scheduled: { label: "Đã hẹn", badge: "badge-plain" },
  in_progress: { label: "Đang xem", badge: "badge-amber-soft" },
  deposit: { label: "Khách cọc", badge: "badge-kelp" },
  not_decided: { label: "Chưa quyết định", badge: "badge-plain" },
  no_show: { label: "Bỏ hẹn", badge: "badge-coral-soft" },
  cancelled: { label: "Đã huỷ", badge: "badge-plain" },
};

/**
 * Số căn suy từ mã căn `VHOP-<toà>-<tầng><số căn>`: tầng có thể viết thường (`1208`) hoặc đệm 0 (`0701`).
 * Không khớp mẫu nào thì trả nguyên phần đuôi của mã.
 */
export function unitDoor(u: { unitCode: string; floor: number }): string {
  const tail = u.unitCode.split("-").pop() ?? u.unitCode;
  for (const prefix of [String(u.floor), String(u.floor).padStart(2, "0")]) {
    if (tail.startsWith(prefix) && tail.length > prefix.length) return tail.slice(prefix.length);
  }
  return tail;
}

export const unitLabel = (u: { building: string; floor: number; unitCode: string }) =>
  `${u.building} · Tầng ${u.floor} · Căn ${unitDoor(u)}`;

/** Số giờ còn lại tới `iso` (làm tròn lên, tối thiểu 0); null nếu không có mốc. */
export function hoursLeft(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 3_600_000));
}

/** Số ngày còn lại tới `iso` (làm tròn lên, tối thiểu 0). */
export const daysLeft = (iso: string, now: number) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));

/** Nhãn trục tiền: 0, 0.5tr, 2tr … — làm tròn 1 chữ số thập phân để không bao giờ ra dạng 5e-7tr. */
export const axisMillions = (v: number) => (v === 0 ? "0" : `${+(v / 1_000_000).toFixed(1)}tr`);

const STATUS_BLOCK: Partial<Record<UnitStatus, string>> = {
  holding: "đang giữ căn",
  rented: "đang cho thuê",
  unlisted: "chưa niêm yết",
  maintenance: "đang bảo trì",
};

/**
 * Lý do căn CHƯA thể thoát ủy quyền, hoặc null nếu thoát được. Khớp luật backend (landlord-mandate.service.ts):
 * ủy quyền phải `active` và căn đang trống (không cọc giữ chỗ, không hợp đồng thuê).
 */
export function exitBlockReason(row: { status: UnitStatus; mandate: { status: MandateStatus } | null }): string | null {
  if (!row.mandate) return "chưa có ủy quyền được ghi nhận";
  if (row.mandate.status === "exiting") return "đang trong thời gian báo trước thoát";
  if (row.mandate.status === "pending_inspection") return "đang chờ thẩm định";
  if (row.mandate.status === "ended") return "ủy quyền đã kết thúc";
  return STATUS_BLOCK[row.status] ?? null;
}
