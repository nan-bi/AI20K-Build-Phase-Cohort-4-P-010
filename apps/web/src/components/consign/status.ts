import type { ConsignmentStatus } from "@/lib/mock/types";
import type { StatusTone } from "@/components/ui/StatusBadge";

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
    landlordHint: "Field Host phân khu sẽ nhận và hẹn kiểm tra trong 48 giờ.",
  },
  inspecting: {
    label: "Đang thẩm định thực tế",
    tone: "info",
    landlordHint: "Field Host đang tiến hành kiểm tra và chụp ảnh hiện trạng tại căn.",
  },
  reviewing: {
    label: "Chờ Admin duyệt",
    tone: "warn",
    landlordHint: "Báo cáo thẩm định đã gửi lên Admin để phê duyệt ký gửi chính thức.",
  },
  approved: {
    label: "Đã ký gửi",
    tone: "ok",
    landlordHint: "Căn hộ đã hoàn tất thủ tục và được tiếp nhận ký gửi chính thức.",
  },
  rejected: {
    label: "Không duyệt",
    tone: "danger",
    landlordHint: "Hồ sơ ký gửi không được phê duyệt. Vui lòng xem lý do bên dưới.",
  },
};
