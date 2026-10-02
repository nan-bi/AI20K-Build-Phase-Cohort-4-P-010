const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  wrong_portal:
    "Tài khoản này thuộc một vai trò khác trên VinStay. Vui lòng chọn đúng vai trò của bạn ở phía trên để đăng nhập.",
  account_suspended: "Tài khoản đã bị tạm khoá.",
  account_conflict: "Email này đã gắn với một hồ sơ khác. Liên hệ Admin.",
  invalid_request: "Thông tin chưa hợp lệ. Kiểm tra lại (mật khẩu tối thiểu 8 ký tự).",
  weak_password: "Mật khẩu chưa đủ mạnh. Dùng tối thiểu 8 ký tự.",
  email_not_verified: "Email chưa được xác nhận. Kiểm tra hộp thư của bạn.",
  email_already_registered: "Email này đã được đăng ký. Hãy đăng nhập.",
  not_authorized: "Email này chưa được cấp quyền. Liên hệ Admin để được thêm vào danh sách.",
  signup_not_allowed: "Cổng này không cho phép tự đăng ký.",
  rfid_mismatch: "Mã RFID không đúng. Kiểm tra lại.",
  invalid_host: "Lời mời Field Host không hợp lệ hoặc đã được sử dụng.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  rate_limited: "Bạn thao tác quá nhanh. Thử lại sau ít phút.",
  auth_not_configured: "Hệ thống xác thực chưa được cấu hình (backend thiếu SUPABASE_* hoặc GOOGLE_*).",
  auth_provider_unavailable: "Không kết nối được dịch vụ xác thực. Thử lại sau.",
  demo_disabled: "Chế độ demo đang tắt.",
  oauth_failed: "Đăng nhập không thành công. Thử lại.",
};

export function errorMessage(code?: string): string {
  return ERROR_MESSAGES[code ?? ""] ?? "Có lỗi xảy ra. Thử lại.";
}

export const API_BASE = "/api/v1";

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  /** Phần `data` của envelope thành công (`{ success, data }`); {} khi lỗi. */
  data: T;
  /** Mã lỗi máy đọc được của backend (`code`), vd. `invalid_credentials`. */
  code?: string;
}

/** Gói envelope của backend: thành công `{success, data}`, lỗi `{success:false, code, message}`. */
export function unwrap<T>(res: { ok: boolean; status: number }, body: unknown): ApiResult<T> {
  const b = (body ?? {}) as { data?: T; code?: string };
  return res.ok
    ? { ok: true, status: res.status, data: (b.data ?? {}) as T }
    : { ok: false, status: res.status, data: {} as T, code: b.code };
}

/** POST JSON tới backend (cùng origin, cookie phiên tự đi kèm). */
export async function postJson<T = Record<string, unknown>>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return unwrap<T>(res, await res.json().catch(() => ({})));
}
