import { api, type ApiResponse } from "@/lib/apiClient";
import type {
  CreateBookingDto,
  DepositTermsDoc,
  EkycScanResult,
  SubmitEkycDto,
  TenantBooking,
  TenantContract,
  TenantUnit,
} from "./types";

export const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "Thông tin gửi lên không hợp lệ.",
  unauthorized: "Vui lòng đăng nhập để tiếp tục.",
  forbidden: "Tài khoản không phải Khách thuê.",
  otp_required: "Vui lòng xác thực số điện thoại qua OTP.",
  action_token_invalid: "Phiên xác thực OTP đã hết hạn hoặc không hợp lệ. Vui lòng xin mã OTP mới.",
  otp_invalid: "Mã OTP không chính xác.",
  otp_not_found_or_expired: "Mã OTP đã hết hạn hoặc không tồn tại.",
  otp_locked: "Đã vượt quá số lần thử OTP. Vui lòng chờ 15 phút.",
  otp_cooldown: "Vui lòng đợi ít nhất 30 giây trước khi yêu cầu mã OTP mới.",
  phone_already_registered: "Số điện thoại này đã được gắn với một tài khoản khác.",
  unit_not_found: "Không tìm thấy căn hộ hoặc căn hộ không còn khả dụng.",
  unit_not_available: "Căn hộ hiện không khả dụng để đặt lịch hoặc giữ chỗ.",
  slot_invalid: "Khung giờ xem phòng không hợp lệ (phải trước ít nhất 30 phút và trong 14 ngày).",
  slot_taken: "Khung giờ này vừa có người đặt xem phòng. Vui lòng chọn khung giờ khác.",
  booking_not_found: "Không tìm thấy lịch hẹn trong tài khoản của bạn.",
  bad_status: "Trạng thái lịch hẹn không phù hợp để thực hiện thao tác này.",
  too_late_to_modify: "Chỉ có thể đổi hoặc hủy lịch trước giờ xem tối thiểu 2 giờ.",
  already_rated: "Lịch hẹn này đã được đánh giá.",
  terms_version_stale: "Phiên bản điều khoản cọc đã được cập nhật. Vui lòng kiểm tra lại.",
  unit_already_held: "Căn hộ vừa được khách khác đặt cọc thành công (First-to-Pay Wins).",
  vietqr_not_configured: "Thanh toán VietQR chưa được cấu hình nhận và đối soát giao dịch. Vui lòng liên hệ hỗ trợ.",
  ekyc_provider_unavailable: "Nhà cung cấp eKYC thật chưa được cấu hình; chưa thể xác minh CCCD hoặc lập hợp đồng.",
  hold_expired: "Thời hạn giữ chỗ của căn hộ đã hết hiệu lực.",
  ekyc_already_done: "Thông tin eKYC của lịch hẹn này đã được xác thực trước đó.",
  scan_expired: "Phiên quét CCCD đã hết hạn (tối đa 15 phút). Vui lòng quét lại.",
  kyc_fields_invalid: "Thông tin CCCD không hợp lệ (tuổi từ 18, số định danh 12 chữ số).",
  kyc_confirmation_required: "Vui lòng xác nhận tính chính xác của các trường thông tin.",
  lease_terms_invalid: "Điều khoản thuê không hợp lệ theo quy định căn hộ.",
  pdf_pending: "Hợp đồng PDF đang được tạo. Vui lòng bấm Thử lại sau giây lát.",
  not_found: "Không tìm thấy trang hoặc tính năng không khả dụng.",
};

export function errorText(
  codeOrRes?: string | ApiResponse<unknown> | null,
  fallback = "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
): string {
  if (!codeOrRes) return fallback;
  if (typeof codeOrRes === "string") {
    return ERROR_MESSAGES[codeOrRes] || fallback;
  }
  const code = codeOrRes.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return codeOrRes.message || fallback;
}

export interface UnitFilter {
  zone?: string;
  layout?: string;
  maxRent?: number;
  q?: string;
}

export const tenantApi = {
  // A1: Catalog công khai
  units: (filter?: UnitFilter): Promise<ApiResponse<TenantUnit[]>> => {
    const params = new URLSearchParams();
    if (filter?.zone) params.set("zone", filter.zone);
    if (filter?.layout) params.set("layout", filter.layout);
    if (filter?.maxRent) params.set("maxRent", String(filter.maxRent));
    if (filter?.q) params.set("q", filter.q);
    const qs = params.toString();
    return api.get<TenantUnit[]>(`/properties/units${qs ? `?${qs}` : ""}`);
  },

  // A2: Chi tiết căn hộ theo mã code
  unit: (code: string): Promise<ApiResponse<TenantUnit>> => {
    return api.get<TenantUnit>(`/properties/units/${encodeURIComponent(code)}`);
  },

  // A3: Khung giờ bận
  busySlots: (code: string, from?: string, to?: string): Promise<ApiResponse<{ slots: string[] }>> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return api.get<{ slots: string[] }>(`/properties/units/${encodeURIComponent(code)}/busy-slots${qs ? `?${qs}` : ""}`);
  },

  // A4: Gửi mã OTP xác thực SĐT
  sendOtp: (phone: string, purpose = "TENANT_VIEWING"): Promise<ApiResponse<{ expiresInSeconds: number; devCode?: string }>> => {
    return api.post<{ expiresInSeconds: number; devCode?: string }>("/auth/otp/send", { phone, purpose });
  },

  // A5: Xác thực OTP lấy actionToken
  verifyOtp: (
    phone: string,
    code: string,
    purpose = "TENANT_VIEWING",
  ): Promise<ApiResponse<{ actionToken: string; expiresInSeconds: number }>> => {
    return api.post<{ actionToken: string; expiresInSeconds: number }>("/auth/otp/verify", { phone, code, purpose });
  },

  // A6: Đặt lịch xem phòng
  createBooking: (dto: CreateBookingDto): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>("/bookings", dto);
  },

  // A7: Danh sách lịch xem của tôi
  myBookings: (): Promise<ApiResponse<TenantBooking[]>> => {
    return api.get<TenantBooking[]>("/me/bookings");
  },

  // A8: Chi tiết lịch xem theo mã ref
  bookingByRef: (ref: string): Promise<ApiResponse<TenantBooking>> => {
    return api.get<TenantBooking>(`/bookings/${encodeURIComponent(ref)}`);
  },

  // A9: Hủy lịch hẹn
  cancelBooking: (ref: string, reason: string): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/cancel`, { reason });
  },

  // A10: Đổi khung giờ
  rescheduleBooking: (ref: string, slot: string): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/reschedule`, { slot });
  },

  // A11: Báo trễ 10 phút
  requestLate: (ref: string): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/late`);
  },

  // A12: Check-in sảnh 1-chạm
  lobbyCheckIn: (ref: string): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/lobby-checkin`);
  },

  // A13: Đánh giá chất lượng Host
  rateBooking: (ref: string, stars: number): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/rating`, { stars });
  },

  // A14: Điều khoản cọc
  depositTerms: (unitCode?: string): Promise<ApiResponse<DepositTermsDoc>> => {
    return api.get<DepositTermsDoc>(`/legal/deposit-terms${unitCode ? `?unitCode=${encodeURIComponent(unitCode)}` : ""}`);
  },

  // A15: Chấp thuận điều khoản cọc & lấy thông tin VietQR
  acceptDeposit: (ref: string, termsVersion: string): Promise<ApiResponse<TenantBooking>> => {
    return api.post<TenantBooking>(`/bookings/${encodeURIComponent(ref)}/deposit`, { acceptTerms: true, termsVersion });
  },

  // DEMO (xoá khi có webhook thật): giả lập ngân hàng báo có cọc
  demoPayDeposit: (ref: string): Promise<ApiResponse<{ outcome: string }>> => {
    return api.post<{ outcome: string }>(`/bookings/${encodeURIComponent(ref)}/deposit/demo-pay`);
  },

  // A17: Quét CCCD; backend trả ekyc_provider_unavailable đến khi tích hợp nhà cung cấp thật.
  scanEkyc: (ref: string, consentVersion: string): Promise<ApiResponse<EkycScanResult>> => {
    return api.post<EkycScanResult>(`/bookings/${encodeURIComponent(ref)}/ekyc/scan`, { consent: true, consentVersion });
  },

  // A18: Nộp hồ sơ eKYC & hợp đồng
  submitEkyc: (
    ref: string,
    dto: SubmitEkycDto,
  ): Promise<ApiResponse<{ booking: TenantBooking; contract: TenantContract }>> => {
    return api.post<{ booking: TenantBooking; contract: TenantContract }>(`/bookings/${encodeURIComponent(ref)}/ekyc`, dto);
  },

  // A19: Hợp đồng của tôi
  myContracts: (): Promise<ApiResponse<TenantContract[]>> => {
    return api.get<TenantContract[]>("/me/contracts");
  },

  // A20: Tải file PDF hợp đồng
  contractPdfUrl: (contractId: string): string => {
    return `/api/v1/me/contracts/${encodeURIComponent(contractId)}/pdf`;
  },

  // Yêu thích: lưu theo tài khoản trong DB (căn đã lưu trả về đúng DTO TenantUnit như catalog)
  favorites: (): Promise<ApiResponse<TenantUnit[]>> => {
    return api.get<TenantUnit[]>("/me/favorites");
  },
  addFavorite: (code: string): Promise<ApiResponse<{ unitId: string; saved: boolean }>> => {
    return api.put<{ unitId: string; saved: boolean }>(`/me/favorites/${encodeURIComponent(code)}`);
  },
  removeFavorite: (code: string): Promise<ApiResponse<{ unitId: string; saved: boolean }>> => {
    return api.delete<{ unitId: string; saved: boolean }>(`/me/favorites/${encodeURIComponent(code)}`);
  },

};
