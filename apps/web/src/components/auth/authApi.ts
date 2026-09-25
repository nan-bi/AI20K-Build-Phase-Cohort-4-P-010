const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  wrong_portal: "Tài khoản này không thuộc cổng đăng nhập này.",
  account_suspended: "Tài khoản đã bị tạm khoá.",
  invalid_request: "Thông tin chưa hợp lệ. Kiểm tra lại (mật khẩu tối thiểu 8 ký tự).",
  email_not_verified: "Email chưa được xác nhận. Kiểm tra hộp thư của bạn.",
  not_authorized: "Email này chưa được cấp quyền. Liên hệ Admin để được thêm vào danh sách.",
  missing_code: "Không nhận được mã xác thực. Thử đăng nhập lại.",
  oauth_failed: "Đăng nhập không thành công. Thử lại.",
};

export function errorMessage(code?: string): string {
  return ERROR_MESSAGES[code ?? ""] ?? "Có lỗi xảy ra. Thử lại.";
}

/** POST JSON; returns `{ ok, data }` so callers can branch on the error code. */
export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
