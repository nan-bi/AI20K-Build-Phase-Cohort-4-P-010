import { api, type ApiResponse } from "@/lib/apiClient";
import { useApiQuery, invalidateApiPattern, type Query } from "@/lib/query/useApiQuery";
import type { HostRoleCode } from "@/lib/auth/portals";
import { knownErrorMessage } from "@/components/auth/authApi";

/** Kiểu theo contract planning/14_2026-10-04_Sale-Auth/specs/01-CONTRACTS.md §4.3. */
export type HostDuty = "ONLINE_AVAILABLE" | "BUSY_VIEWING" | "OFF_DUTY";
export type TicketStatusKey = "OFFERED" | "ACCEPTED" | "CHECKED" | "COMPLETED" | "EXPIRED" | "ESCALATED" | "CANCELLED";

export interface HostAdminView {
  id: string;
  profileId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  isPhoneVerified: boolean;
  assignedZone: string;
  roles: HostRoleCode[];
  dutyStatus: HostDuty;
  rating: number;
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface HostAdminDetail extends HostAdminView {
  ticketStats: Record<TicketStatusKey, number>;
}

export interface HostFilters {
  q?: string;
  role?: "sale" | "inspector" | "both";
  zone?: string;
  active?: boolean;
}

export interface CreateHostInput {
  email: string;
  fullName: string;
  assignedZone: string;
  roles: HostRoleCode[];
  password?: string;
}

export interface UpdateHostInput {
  fullName?: string;
  assignedZone?: string;
  roles?: HostRoleCode[];
  password?: string;
  isActive?: boolean;
}

const BASE = "/admin/field-hosts";

/** Dựng query string bộ lọc; tham số rỗng/`undefined` bị bỏ. */
export function hostFilterQuery(f: HostFilters = {}): string {
  const p = new URLSearchParams();
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.role) p.set("role", f.role);
  if (f.zone) p.set("zone", f.zone);
  if (f.active !== undefined) p.set("active", String(f.active));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const adminHostsApi = {
  list: (f?: HostFilters) => api.get<HostAdminView[]>(`${BASE}${hostFilterQuery(f)}`),
  zones: () => api.get<string[]>(`${BASE}/zones`),
  get: (id: string) => api.get<HostAdminDetail>(`${BASE}/${encodeURIComponent(id)}`),
  create: (dto: CreateHostInput) => api.post<HostAdminDetail>(BASE, dto),
  update: (id: string, dto: UpdateHostInput) => api.patch<HostAdminDetail>(`${BASE}/${encodeURIComponent(id)}`, dto),
  deactivate: (id: string) => api.delete<HostAdminDetail>(`${BASE}/${encodeURIComponent(id)}`),
};

/** Sau mọi thay đổi: bỏ cache danh sách/hồ sơ Host để màn đang mở tải lại. */
export const invalidateHosts = () => invalidateApiPattern("admin-host");

const fail = (res: ApiResponse<unknown>) =>
  knownErrorMessage(res.code, res.status === 0 ? "Không kết nối được máy chủ." : res.message || "Có lỗi xảy ra. Thử lại.");

export const useHostList = (f: HostFilters): Query<HostAdminView[]> =>
  useApiQuery<HostAdminView[]>({
    key: `admin-hosts:${hostFilterQuery(f)}`,
    fetch: () => adminHostsApi.list(f),
    errorText: fail,
  });

export const useHostZones = (): Query<string[]> =>
  useApiQuery<string[]>({ key: "admin-host-zones", fetch: adminHostsApi.zones, errorText: fail });

export const useHost = (id: string): Query<HostAdminDetail> =>
  useApiQuery<HostAdminDetail>({ key: `admin-host:${id}`, fetch: () => adminHostsApi.get(id), errorText: fail });

export { fail as hostErrorText };

// ─── Vai Host (hồ sơ 18: chỉ 2 tập {sale} / {sale, inspector}; B5) ───────────────────────────

export type HostRoleChoice = "sale" | "sale_inspector";

export const ROLE_CHOICE_LABEL: Record<HostRoleChoice, string> = { sale: "Sale", sale_inspector: "Sale + Thẩm định" };

/** Lựa chọn radio → `roles` gửi backend. */
export const rolesOfChoice = (c: HostRoleChoice): HostRoleCode[] => (c === "sale" ? ["sale"] : ["sale", "inspector"]);

/** `roles` hiện có → lựa chọn radio. Host cũ chỉ có inspector (chưa chạy script sửa vai) được coi là "Sale + Thẩm định". */
export const choiceOfRoles = (roles: readonly HostRoleCode[]): HostRoleChoice => (roles.includes("inspector") ? "sale_inspector" : "sale");

/** Nhãn hiển thị vai của một Host (một nhãn duy nhất, không tách badge). */
export const hostRoleLabel = (roles: readonly HostRoleCode[]): string => ROLE_CHOICE_LABEL[choiceOfRoles(roles)];
