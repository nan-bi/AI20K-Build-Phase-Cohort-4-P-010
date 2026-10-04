import type { ApiResponse } from "@/lib/apiClient";
import type { HostViewingSummary } from "./types";

/**
 * Hàm thuần của cổng Sale (hồ sơ 15, SPEC-P03 §1, §2) — tách khỏi component để test không cần DOM.
 */

/** Còn bao nhiêu ms tới hạn nhận ca, tính theo GIỜ MÁY CHỦ (đồng hồ máy Sale có thể lệch). */
export function slaLeftMs(slaEndsAt: string, serverTime: string, localNow: number, receivedAtLocal: number): number {
  const skew = Date.parse(serverTime) - receivedAtLocal; // giờ máy chủ − giờ máy tại lúc nhận dữ liệu
  return Date.parse(slaEndsAt) - (localNow + skew);
}

const T10_MS = 10 * 60_000;
const NO_SHOW_WINDOW_MS = 30 * 60_000;

/** Ca `confirmed` đang trong cửa sổ nhắc T-10 (còn ≤ 10′ tới giờ hẹn, chưa quá giờ hẹn 15′). */
export function isReminderWindow(s: Pick<HostViewingSummary, "status" | "slot">, now: number): boolean {
  const left = Date.parse(s.slot) - now;
  return s.status === "confirmed" && left <= T10_MS && left > -900_000;
}

/** Cột "Việc tiếp theo" của tab Lịch của tôi. */
export function nextAction(s: Pick<HostViewingSummary, "status" | "slot" | "receivingAt">, now: number): string {
  if (s.status === "receiving" || s.status === "viewing") return "Đang dẫn khách";
  if (s.status === "confirmed") return isReminderWindow(s, now) ? "Xuống sảnh đón khách" : "Xem chi tiết & chuẩn bị";
  if (s.status === "lobby") return "Đón khách ngay";
  if (s.status === "closing") return "Chờ khách cọc";
  if (s.status === "holding") return "Chờ khách làm HĐ";
  return "";
}

/**
 * Có nên tự gửi nhắc T-10 cho ca này không: đúng 1 lần/ca/phiên trình duyệt (`sent` là Set mã ca đã gọi),
 * trong cửa sổ [giờ hẹn − 10′, giờ hẹn + 30′], ca còn `confirmed` và chưa có mốc nhắc ở backend.
 */
export function shouldAutoRemind(
  s: Pick<HostViewingSummary, "status" | "slot" | "ref">,
  now: number,
  sent: ReadonlySet<string>,
  alreadyReminded = false,
): boolean {
  if (s.status !== "confirmed" || alreadyReminded || sent.has(s.ref)) return false;
  const left = Date.parse(s.slot) - now;
  return left <= T10_MS && left > -NO_SHOW_WINDOW_MS;
}

/** Câu lỗi tiếng Việt theo `code` của backend (01 §6), rồi `message` của backend, rồi câu chung. */
export const HOST_ERRORS: Record<string, string> = {
  ticket_not_found: "Ticket không còn tồn tại.",
  ticket_taken: "Đã có Sale khác nhận ca này.",
  ticket_expired: "Đã quá 3 phút, ca chuyển sang Open Pool — bấm “Nhận ticket” nếu vẫn muốn nhận.",
  ticket_not_open: "Ca vẫn đang dành cho Sale được giao.",
  zone_mismatch: "Ca thuộc phân khu khác.",
  host_schedule_conflict: "Bạn đã có ca khác trong vòng 45 phút.",
  host_off_duty: "Bạn đang tắt trực. Bật trực để nhận ca.",
  host_busy: "Đang dẫn khách — chưa tắt trực được.",
  viewing_not_found: "Không tìm thấy lịch hoặc lịch không thuộc bạn.",
  bad_status: "Trạng thái lịch đã thay đổi. Đang tải lại…",
  too_early_reminder: "Chỉ gửi nhắc trong 10 phút trước giờ hẹn.",
  too_early_no_show: "Chỉ báo khách không đến sau giờ hẹn 15 phút.",
  door_code_missing: "Căn chưa có mã cửa hợp lệ. Gọi hỗ trợ khẩn cấp để lấy mã từ chủ nhà.",
  host_role_missing: "Tài khoản chưa được gán vai Sale.",
  host_not_provisioned: "Tài khoản chưa có hồ sơ Field Host.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
};

export function hostErrorText(res: Pick<ApiResponse<unknown>, "code" | "message">, fallback = "Không thực hiện được. Vui lòng thử lại."): string {
  return (res.code && HOST_ERRORS[res.code]) || res.message || fallback;
}

/** Mã lỗi nghĩa là dữ liệu trên màn đã cũ — phải tải lại. */
export const STALE_CODES = new Set(["ticket_taken", "ticket_expired", "ticket_not_open", "ticket_not_found", "bad_status", "viewing_not_found"]);
