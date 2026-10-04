/**
 * VinStay AI - Typed API Client for Frontend (calls /api/v1/* proxied to NestJS Backend)
 */

const API_BASE = "/api/v1";

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
  message?: string;
  code?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    // FormData: để trình duyệt tự đặt Content-Type (kèm boundary); đặt tay sẽ làm hỏng multipart.
    const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers,
    });

    const body: unknown = await res.json().catch(() => ({}));

    // NestJS response envelope or raw object
    const rec = (body && typeof body === "object") ? (body as Record<string, unknown>) : undefined;
    const data = rec && "data" in rec ? rec.data : body;
    const message = rec && typeof rec.message === "string" ? rec.message : undefined;
    const code = rec && typeof rec.code === "string" ? rec.code : undefined;

    return {
      ok: res.ok,
      status: res.status,
      data: (res.ok ? data : data || {}) as T,
      message,
      code,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Lỗi kết nối máy chủ";
    return {
      ok: false,
      status: 0,
      data: {} as T,
      message: errMessage,
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  postForm: <T>(endpoint: string, form: FormData) => request<T>(endpoint, { method: "POST", body: form }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

/* ── Specific Domain Endpoints ── */

export interface UserProfileDto {
  id?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  isPhoneVerified?: boolean;
}

export const accountApi = {
  getProfile: () =>
    api.get<UserProfileDto>("/me/profile"),
  updateProfile: (dto: { fullName?: string; email?: string; phone?: string }) =>
    api.patch<UserProfileDto>("/me/profile", dto),
  getFavorites: () =>
    api.get<string[]>("/me/favorites"),
  addFavorite: (unitId: string) =>
    api.put<{ success: boolean; unitId: string; saved: boolean }>(`/me/favorites/${unitId}`),
  removeFavorite: (unitId: string) =>
    api.delete<{ success: boolean; unitId: string; saved: boolean }>(`/me/favorites/${unitId}`),
  getNotifications: () =>
    api.get<Record<string, unknown>[]>("/me/notifications"),
};
