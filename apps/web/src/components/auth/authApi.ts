const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  wrong_portal:
    "Tài khoản này thuộc một vai trò khác trên VinStay. Vui lòng chọn đúng vai trò của bạn ở phía trên để đăng nhập.",
  account_suspended: "Tài khoản đã bị tạm khoá.",
  account_conflict: "Email này đã là tài khoản vai khác (khách thuê/chủ nhà/admin). Dùng email khác.",
  invalid_request: "Thông tin chưa hợp lệ. Kiểm tra lại (mật khẩu tối thiểu 8 ký tự).",
  weak_password: "Mật khẩu chưa đủ mạnh. Dùng tối thiểu 8 ký tự.",
  email_not_verified: "Email Google này chưa được xác minh. Dùng tài khoản Google khác.",
  password_not_set: "Tài khoản này đăng nhập bằng Google. Hãy bấm nút Google ở trên.",
  email_already_registered: "Email này đã được đăng ký. Hãy đăng nhập (hoặc dùng Google nếu bạn đã đăng ký bằng Google).",
  not_authorized: "Email này chưa được cấp quyền. Liên hệ Admin để được thêm vào danh sách.",
  signup_not_allowed: "Cổng này không cho phép tự đăng ký.",
  host_not_provisioned: "Tài khoản chưa có hồ sơ Field Host. Liên hệ Admin để được thêm vào hệ thống.",
  host_role_missing: "Tài khoản chưa được gán vai cần cho chức năng này. Liên hệ Admin để được phân quyền.",
  host_not_found: "Không tìm thấy Field Host.",
  host_already_exists: "Email này đã là Field Host.",
  host_has_active_tickets: "Field Host đang có ca được giao/đang dẫn. Điều phối lại ca trước khi khoá.",
  invalid_zone: "Phân khu không hợp lệ.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  rate_limited: "Bạn thao tác quá nhanh. Thử lại sau ít phút.",
  auth_not_configured: "Đăng nhập Google chưa được cấu hình (backend thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  oauth_failed: "Đăng nhập không thành công. Thử lại.",
};

export function errorMessage(code?: string): string {
  return ERROR_MESSAGES[code ?? ""] ?? "Có lỗi xảy ra. Thử lại.";
}

/** Câu tiếng Việt cho mã lỗi đã biết; mã lạ ⇒ `fallback` (thường là message của backend). */
export function knownErrorMessage(code: string | undefined, fallback: string): string {
  return (code && ERROR_MESSAGES[code]) || fallback;
}

export const API_BASE = "/api/v1";

export interface ApiResult<T = Record<string, unknown>> {
  /** Chi tiết lỗi của backend (`errors`), vd. `{ required: ['sale'] }`. */
  errors?: Record<string, unknown>;
  ok: boolean;
  status: number;
  /** Phần `data` của envelope thành công (`{ success, data }`); {} khi lỗi. */
  data: T;
  /** Mã lỗi máy đọc được của backend (`code`), vd. `invalid_credentials`. */
  code?: string;
}

/** Gói envelope của backend: thành công `{success, data}`, lỗi `{success:false, code, message}`. */
export function unwrap<T>(res: { ok: boolean; status: number }, body: unknown): ApiResult<T> {
  const b = (body ?? {}) as { data?: T; code?: string; errors?: Record<string, unknown> };
  return res.ok
    ? { ok: true, status: res.status, data: (b.data ?? {}) as T }
    : { ok: false, status: res.status, data: {} as T, code: b.code, errors: b.errors };
}

/** POST JSON tới backend (cùng origin, cookie phiên tự đi kèm). */
export async function postJson<T = Record<string, unknown>>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    return unwrap<T>(res, await res.json().catch(() => ({})));
  } finally {
    window.clearTimeout(timeout);
  }
}
