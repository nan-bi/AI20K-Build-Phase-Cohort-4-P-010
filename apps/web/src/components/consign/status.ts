import type { ConsignmentStatus as ApiConsignmentStatus } from "@/lib/landlord/types";
import type { StatusTone } from "@/components/ui/StatusBadge";

/** `reviewing` chỉ để đọc hồ sơ lịch sử; API không còn phát. */
export type ConsignStatusKey = ApiConsignmentStatus | "reviewing";

/**
 * Khoá `reviewing` GIỮ LẠI để đọc các hồ sơ lịch sử — dữ liệu từ API hiện tại
 * không bao giờ mang trạng thái này (hồ sơ 16 bỏ bước Admin duyệt).
 */
export const CONSIGN_STATUS_META: Record<
  ConsignStatusKey,
  { label: string; tone: StatusTone; landlordHint: string }
> = {
  draft: {
    label: "Chưa ký ủy quyền",
    tone: "neutral",
    landlordHint: "Hồ sơ đã lưu nhưng bạn chưa ký ủy quyền độc quyền. Ký xong, Field Host mới nhận ca đi thẩm định.",
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
  awaiting_landlord: {
    label: "Chờ bạn đồng ý giá",
    tone: "warn",
    landlordHint: "Thẩm định viên đề xuất giá hoặc tiền cọc bảo đảm khác bạn khai. Căn chỉ được đăng sau khi bạn đồng ý.",
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
