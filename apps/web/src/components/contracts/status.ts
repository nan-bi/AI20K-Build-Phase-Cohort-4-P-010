import type { StatusTone } from "@/components/ui/StatusBadge";
import type { ContractKind, ContractStatus } from "@/lib/mock/contracts";

export const CONTRACT_KIND_META: Record<ContractKind, { label: string; short: string }> = {
  mandate: {
    label: "Uỷ quyền quản lý độc quyền",
    short: "Uỷ quyền",
  },
  holding: {
    label: "Thoả thuận cọc giữ chỗ 24h",
    short: "Cọc giữ chỗ",
  },
  lease: {
    label: "Hợp đồng thuê căn hộ",
    short: "HĐ thuê",
  },
  partnership: {
    label: "Hợp đồng hợp tác Field Host",
    short: "Đối tác Host",
  },
};

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; tone: StatusTone }> = {
  pending_inspection: { label: "Chờ thẩm định", tone: "info" },
  active: { label: "Hiệu lực", tone: "ok" },
  exiting: { label: "Đang thoát 15 ngày", tone: "warn" },
  exit_due: { label: "Quá hạn offboard", tone: "danger" },
  ended: { label: "Đã kết thúc", tone: "neutral" },
  void: { label: "Không hiệu lực", tone: "neutral" },
  awaiting_sign: { label: "Chờ ký thoả thuận", tone: "warn" },
  holding: { label: "Đang giữ chỗ", tone: "info" },
  converted: { label: "Đã chuyển cọc bảo đảm", tone: "ok" },
  expired: { label: "Hết hạn giữ chỗ", tone: "neutral" },
  expiring: { label: "Sắp hết hạn", tone: "warn" },
};
