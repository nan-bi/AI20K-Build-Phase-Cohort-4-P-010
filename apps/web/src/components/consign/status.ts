import type { ConsignmentStatus } from "@/lib/mock/types";
import type { StatusTone } from "@/components/ui/StatusBadge";

/**
 * Khoá `reviewing` GIỮ LẠI chỉ để màn Admin mock (có dữ liệu mock mang `reviewing`) còn chạy — dữ liệu từ API
 * không bao giờ mang trạng thái này (hồ sơ 16 bỏ bước Admin duyệt).
 */
export const CONSIGN_STATUS_META: Record<
  ConsignmentStatus,
  { label: string; tone: StatusTone; landlordHint: string }
> = {
  draft: {
    label: "Chưa ký ủy quyền",
    tone: "neutral",
    landlordHint: "Bạn chưa hoàn tất ký ủy quyền độc quyền qua OTP.",
  },
  awaiting_host: {
    label: "Chờ Field Host nhận",
    tone: "warn",
    landlordHint: "Field Host thẩm định phân khu sẽ nhận và hẹn kiểm tra trong 48 giờ.",
  },
  inspecting: {
    label: "Đang thẩm định thực tế",
    tone: "info",
    landlordHint: "Field Host đang kiểm tra thực tế. Thẩm định đạt ⇒ căn lên danh sách ngay.",
  },
  reviewing: {
    label: "Chờ Admin duyệt",
    tone: "warn",
    landlordHint: "Báo cáo thẩm định đã gửi lên Admin để phê duyệt ký gửi chính thức.",
  },
  approved: {
    label: "Đã niêm yết",
    tone: "ok",
    landlordHint: "Thẩm định đạt — căn hộ đã được niêm yết cho khách thuê.",
  },
  rejected: {
    label: "Không đạt",
    tone: "danger",
    landlordHint: "Thẩm định thực tế không đạt. Vui lòng xem lý do bên dưới.",
  },
};
