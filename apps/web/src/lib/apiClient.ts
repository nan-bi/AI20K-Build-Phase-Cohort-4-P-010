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
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      credentials: "same-origin",
      headers,
    });

    const body = await res.json().catch(() => ({}));

    // NestJS response envelope or raw object
    const data = (body && typeof body === "object" && "data" in body) ? (body as any).data : body;
    const message = (body && typeof body === "object" && "message" in body) ? (body as any).message : undefined;
    const code = (body && typeof body === "object" && "code" in body) ? (body as any).code : undefined;

    return {
      ok: res.ok,
      status: res.status,
      data: (res.ok ? data : data || {}) as T,
      message,
      code,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: {} as T,
      message: err?.message || "Lỗi kết nối máy chủ",
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

/* ── Specific Domain Endpoints ── */

export const authApi = {
  login: (body: { email: string; password: string; portal: string }) =>
    api.post<{ user: any; needsRfidVerification?: boolean; hostId?: string }>("/auth/login", body),
  signup: (body: { email: string; password: string; fullName: string; portal: string }) =>
    api.post<{ needsEmailConfirmation: boolean; user?: any }>("/auth/signup", body),
  demoLogin: (portal: string) =>
    api.post<{ user: any; needsRfidVerification?: boolean; hostId?: string }>("/auth/demo-login", { portal }),
  session: () =>
    api.get<{ user: any }>("/auth/session"),
  refresh: () =>
    api.post<{ expiresIn: number }>("/auth/refresh"),
  logout: () =>
    api.post<{ loggedOut: boolean }>("/auth/logout"),
  sendOtp: (phone: string, purpose = "PHONE_VERIFY") =>
    api.post<{ message: string; phone: string }>("/auth/otp/send", { phone, purpose }),
  verifyOtp: (phone: string, code: string, purpose = "PHONE_VERIFY") =>
    api.post<{ verified: boolean }>("/auth/otp/verify", { phone, code, purpose }),
};

export const propertyApi = {
  getBuildings: () =>
    api.get<any[]>("/properties/buildings"),
  getUnits: (params?: {
    zone?: string;
    layoutType?: string;
    minPrice?: number;
    maxPrice?: number;
    motorbikes?: number;
    cars?: number;
    occupants?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.zone) qs.set("zone", params.zone);
    if (params?.layoutType) qs.set("layoutType", params.layoutType);
    if (params?.minPrice) qs.set("minPrice", params.minPrice.toString());
    if (params?.maxPrice) qs.set("maxPrice", params.maxPrice.toString());
    if (params?.motorbikes !== undefined) qs.set("motorbikes", params.motorbikes.toString());
    if (params?.cars !== undefined) qs.set("cars", params.cars.toString());
    if (params?.occupants !== undefined) qs.set("occupants", params.occupants.toString());
    const qStr = qs.toString();
    return api.get<any[]>(`/properties/units${qStr ? `?${qStr}` : ""}`);
  },
  getUnitById: (id: string, params?: { motorbikes?: number; cars?: number; occupants?: number }) => {
    const qs = new URLSearchParams();
    if (params?.motorbikes !== undefined) qs.set("motorbikes", params.motorbikes.toString());
    if (params?.cars !== undefined) qs.set("cars", params.cars.toString());
    if (params?.occupants !== undefined) qs.set("occupants", params.occupants.toString());
    const qStr = qs.toString();
    return api.get<any>(`/properties/units/${id}${qStr ? `?${qStr}` : ""}`);
  },
};

export const matchmakerApi = {
  recommend: (body: {
    maxAllInBudget: number;
    preferredLayout?: string;
    motorbikes?: number;
    cars?: number;
    occupants?: number;
    prompt?: string;
  }) => api.post<{ scanSummary: any; topRecommendations: any[] }>("/matchmaker/recommend", body),
};

export const bookingApi = {
  requestOtp: (dto: { phone: string; fullName?: string }) =>
    api.post<{ message: string; phone: string; expiresInSeconds: number; testHint?: string }>("/bookings/request-otp", dto),
  confirm: (dto: { phone: string; otp: string; unitId: string; viewingSlot: string }) =>
    api.post<any>("/bookings/confirm", dto),
  create: (dto: { unitId: string; slot: string; name: string; phone: string; persons?: number; note?: string }) =>
    api.post<any>("/bookings", dto),
  getById: (id: string) =>
    api.get<any>(`/bookings/${id}`),
  getByRef: (ref: string) =>
    api.get<any>(`/bookings/by-ref/${ref}`),
  lobbyCheckIn: (id: string) =>
    api.post<{ message: string; lobbyCheckInAt: string; instruction: string }>(`/bookings/${id}/lobby-checkin`),
  cancel: (id: string, reason: string) =>
    api.post<{ success: boolean; message: string; status: string }>(`/bookings/${id}/cancel`, { reason }),
  reschedule: (id: string, slot: string) =>
    api.post<{ success: boolean; message: string; newViewingSlot: string }>(`/bookings/${id}/reschedule`, { slot }),
  rate: (id: string, stars: number, comment?: string) =>
    api.post<{ success: boolean; message: string }>(`/bookings/${id}/rating`, { stars, comment }),
};

export const depositApi = {
  generateVietQr: (dto: { viewingId: string; unitId?: string; hostId?: string; amount?: number }) =>
    api.post<any>("/deposits/generate-vietqr", dto),
  getStatus: (id: string) =>
    api.get<any>(`/deposits/${id}`),
  webhook: (dto: { depositCode: string; amount: number; bankRefNumber: string }) =>
    api.post<any>("/deposits/webhook-vietqr", dto),
  uploadHostReceipt: (depositId: string, receiptUrl: string) =>
    api.post<any>(`/deposits/${depositId}/host-receipt`, { receiptUrl }),
};

export const identityApi = {
  verifyEkyc: (dto: {
    depositId: string;
    consentVersion: string;
    hasConsent: boolean;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
  }) => api.post<any>("/identity/ekyc/verify", dto),
  getResult: (depositId: string) =>
    api.get<any>(`/identity/${depositId}`),
};

export const contractApi = {
  signDepositAgreement: (dto: { depositId: string; signatureSvg: string; otp: string }) =>
    api.post<any>("/contracts/holding-agreement/sign", dto),
  getEvidencePackage: (id: string) =>
    api.get<any>(`/contracts/${id}/evidence-package`),
};

export const accountApi = {
  getProfile: () =>
    api.get<any>("/me/profile"),
  updateProfile: (dto: { fullName?: string; email?: string; phone?: string }) =>
    api.patch<any>("/me/profile", dto),
  getBookings: () =>
    api.get<any[]>("/me/bookings"),
  getContracts: () =>
    api.get<any[]>("/me/contracts"),
  getFavorites: () =>
    api.get<any[]>("/me/favorites"),
  addFavorite: (unitId: string) =>
    api.put<{ success: boolean; unitId: string; saved: boolean }>(`/me/favorites/${unitId}`),
  removeFavorite: (unitId: string) =>
    api.delete<{ success: boolean; unitId: string; saved: boolean }>(`/me/favorites/${unitId}`),
  getNotifications: () =>
    api.get<any[]>("/me/notifications"),
};
