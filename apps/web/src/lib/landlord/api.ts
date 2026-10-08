import { api, type ApiResponse } from "@/lib/apiClient";
import type {
  BuildingOption,
  Consignment,
  ConsignmentPhoto,
  CreateConsignmentInput,
  DoorAuditEntry,
  ExitResult,
  Finance,
  InventoryCatalogEntry,
  MyProfile,
  PricingDecisionResult,
  SignOtpInfo,
  UnitDetail,
  UnitRow,
  ViewingLogEntry,
} from "./types";

const BASE = "/landlord";

export const landlordApi = {
  units: () => api.get<UnitRow[]>(`${BASE}/units`),
  unit: (id: string) => api.get<UnitDetail>(`${BASE}/units/${encodeURIComponent(id)}`),
  viewings: (id: string) => api.get<ViewingLogEntry[]>(`${BASE}/units/${encodeURIComponent(id)}/viewings`),
  doorAudit: (id: string) => api.get<DoorAuditEntry[]>(`${BASE}/units/${encodeURIComponent(id)}/audit-trail`),

  consignments: () => api.get<Consignment[]>(`${BASE}/consignments`),
  consignment: (id: string) => api.get<Consignment>(`${BASE}/consignments/${encodeURIComponent(id)}`),
  createConsignment: (input: CreateConsignmentInput) => api.post<Consignment>(`${BASE}/consignments`, input),
  /** Tải ảnh lên hồ sơ (multipart, field `files`); trả danh sách ảnh đầy đủ sau khi thêm. */
  uploadPhotos: (id: string, files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append("files", f, f.name);
    return api.postForm<ConsignmentPhoto[]>(`${BASE}/consignments/${encodeURIComponent(id)}/photos`, form);
  },
  deletePhoto: (id: string, photoId: string) =>
    api.delete<ConsignmentPhoto[]>(`${BASE}/consignments/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`),
  sendSignOtp: (id: string, phone?: string) =>
    api.post<SignOtpInfo>(`${BASE}/consignments/${encodeURIComponent(id)}/send-otp`, phone ? { phone } : {}),
  signConsignment: (id: string, body: { ownershipWarranted: boolean; otp?: string; phone?: string }) =>
    api.post<Consignment>(`${BASE}/consignments/${encodeURIComponent(id)}/sign`, body),

  /** Chủ nhà đồng ý / không đồng ý giá + cọc bảo đảm do Inspector đề xuất. 409 `PRICING_NOT_PENDING`, 403 `NOT_OWNER`. */
  decidePricing: (id: string, decision: "accept" | "decline") =>
    api.post<PricingDecisionResult>(`${BASE}/consignments/${encodeURIComponent(id)}/pricing-decision`, { decision }),

  finance: () => api.get<Finance>(`${BASE}/finance`),

  requestExit: (mandateId: string, reason: string) => api.post<ExitResult>(`${BASE}/mandates/request-exit`, { mandateId, reason }),
  cancelExit: (mandateId: string) => api.post<{ mandateId: string; status: "active" }>(`${BASE}/mandates/cancel-exit`, { mandateId }),

  buildings: () => api.get<BuildingOption[]>("/properties/buildings"),
  inventoryCatalog: () => api.get<InventoryCatalogEntry[]>(`${BASE}/inventory-catalog`),
  profile: () => api.get<MyProfile>("/me/profile"),
};

/** Thông báo lỗi tiếng Việt cho người dùng: ưu tiên message của backend (đã là tiếng Việt), message dạng mảng thì ghép lại. */
export function errorText(res: Pick<ApiResponse<unknown>, "message" | "status">, fallback = "Có lỗi xảy ra, thử lại sau."): string {
  const m = res.message as unknown;
  if (Array.isArray(m)) return m.join(" ");
  if (typeof m === "string" && m) return m;
  if (res.status === 0) return "Không kết nối được máy chủ.";
  return fallback;
}
