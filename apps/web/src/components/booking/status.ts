import type { Booking, BookingStatus } from "@/lib/mock/types";

export type Tone = "info" | "success" | "warning" | "alert" | "muted";

export const STATUS_META: Record<BookingStatus, { label: string; tone: Tone; badge: string; headline: string; body: string }> = {
  pending: {
    label: "Chờ Host xác nhận",
    tone: "warning",
    badge: "badge-amber-soft",
    headline: "Đang chờ Field Host xác nhận",
    body: "Host phụ trách khu vực đang xem yêu cầu của bạn, thường mất dưới 3 phút. Mình sẽ nhắn Zalo ngay khi có kết quả.",
  },
  confirmed: {
    label: "Đã xác nhận",
    tone: "success",
    badge: "badge-kelp",
    headline: "Lịch xem đã được xác nhận",
    body: "Trước giờ hẹn 10 phút mình nhắn Zalo kèm nút “Tôi đã có mặt tại sảnh”. Bạn chỉ cần bấm nút đó khi tới nơi.",
  },
  lobby: {
    label: "Đã có mặt tại sảnh",
    tone: "info",
    badge: "badge-kelp",
    headline: "Host đang xuống sảnh đón bạn",
    body: "Host mặc đồng phục VinStay và đeo thẻ cư dân thang máy. Bạn sẽ được đưa lên phòng trong khoảng 60 giây.",
  },
  receiving: {
    label: "Host đang đón bạn",
    tone: "info",
    badge: "badge-kelp",
    headline: "Host đang đưa bạn lên căn hộ",
    body: "Host quẹt thẻ cư dân để lên đúng tầng. Mã cửa chỉ hiện trên ứng dụng của Host khi tới trước phòng.",
  },
  viewing: {
    label: "Đang xem phòng",
    tone: "info",
    badge: "badge-kelp",
    headline: "Chúc bạn xem phòng vui vẻ",
    body: "Bạn cứ xem thoải mái, không bị ép cọc. Nếu ưng ý, bấm cọc để giữ căn bằng VietQR.",
  },
  closing: {
    label: "Chờ thanh toán cọc",
    tone: "warning",
    badge: "badge-amber-soft",
    headline: "Quét VietQR để giữ chỗ",
    body: "Cọc 2.000.000đ vào tài khoản định danh của nền tảng. Căn được khoá ngay khi tiền về.",
  },
  holding: {
    label: "Đã cọc giữ chỗ",
    tone: "success",
    badge: "badge-kelp",
    headline: "Căn đã được giữ chỗ cho bạn",
    body: "Căn hộ được khoá giữ chỗ để bạn hoàn tất eKYC và ký hợp đồng thuê chính thức. Khoản cọc 2.000.000đ sẽ chuyển 100% thành Tiền cọc bảo đảm tài sản.",
  },
  leased: {
    label: "Đã ký hợp đồng thuê",
    tone: "success",
    badge: "badge-kelp",
    headline: "Chúc mừng bạn đã thuê được căn hộ",
    body: "Field Host sẽ hẹn bạn lập Hộ chiếu bàn giao số 10 hạng mục khi nhận nhà.",
  },
  completed: {
    label: "Đã xem xong",
    tone: "muted",
    badge: "badge-plain",
    headline: "Cảm ơn bạn đã xem phòng",
    body: "Bạn có thể đặt lịch căn khác bất cứ lúc nào, không cần xác thực lại.",
  },
  no_show: {
    label: "Đã tự huỷ",
    tone: "warning",
    badge: "badge-coral-soft",
    headline: "Lịch xem đã tự huỷ vì không có mặt",
    body: "Quá 15 phút không phản hồi nên ca trực được giải phóng. Bạn có thể đặt lại khung giờ khác.",
  },
  cancelled: {
    label: "Đã huỷ",
    tone: "muted",
    badge: "badge-plain",
    headline: "Lịch xem đã được huỷ",
    body: "Bạn có thể đặt lại khung giờ khác hoặc xem căn tương đương.",
  },
  rejected: {
    label: "Cần đổi giờ",
    tone: "warning",
    badge: "badge-coral-soft",
    headline: "Khung giờ này Host chưa sắp xếp được",
    body: "Bạn vui lòng chọn khung giờ khác để Host đón bạn đúng giờ.",
  },
};

export const TERMINAL: BookingStatus[] = ["completed", "no_show", "cancelled", "rejected"];

export interface TimelineStep {
  key: string;
  label: string;
  hint: string;
  at?: string;
  done: boolean;
}

const RANK: Record<BookingStatus, number> = {
  pending: 0,
  confirmed: 1,
  lobby: 2,
  receiving: 3,
  viewing: 4,
  closing: 5,
  holding: 6,
  leased: 7,
  completed: 4,
  no_show: 1,
  cancelled: 0,
  rejected: 0,
};

export function buildTimeline(b: Booking): TimelineStep[] {
  const r = RANK[b.status];
  const lobbyDone = !!b.lobbyAt || r >= 3;
  return [
    { key: "sent", label: "Đã gửi yêu cầu", hint: "Xác thực OTP qua Zalo", at: b.createdAt, done: true },
    { key: "host", label: "Host xác nhận lịch", hint: "Trong vòng 3 phút", at: b.confirmedAt, done: !!b.confirmedAt },
    { key: "lobby", label: "Có mặt tại sảnh", hint: "Bấm “Tôi đã tới sảnh”", at: b.lobbyAt ?? b.receivingAt, done: lobbyDone },
    { key: "view", label: "Xem phòng", hint: "Host mở cửa bằng mã trong app", at: b.viewingAt, done: !!b.viewingAt },
    { key: "deposit", label: "Cọc giữ căn", hint: "VietQR 2.000.000đ", at: b.deposit?.paidAt, done: !!b.deposit?.paidAt },
    { key: "kyc", label: "Xác minh CCCD (eKYC)", hint: "Khi làm hợp đồng thuê", at: b.kyc?.verifiedAt, done: !!b.kyc },
    { key: "lease", label: "Ký hợp đồng thuê", hint: "Hợp đồng ký số", at: b.lease?.signedAt, done: !!b.lease },
  ];
}
