import { api, type ApiResponse } from "@/lib/apiClient";
import { useApiQuery, type Query } from "@/lib/query/useApiQuery";

export interface AdminFeeConfig {
  id: string;
  configKey: string;
  paramValue: number;
  paramUnit: string;
  updatedAt: string;
}

export interface AdminPayoutHost {
  hostId: string;
  fullName: string | null;
  rating: number | null;
  total: number;
  count: number;
  /** Tách theo loại khoản (transRef): thù lao dẫn · hoa hồng cọc · thưởng đánh giá (Host ≥ 4,8★) · thưởng nóng chiến dịch. */
  viewings: number;
  viewingFee: number;
  deals: number;
  commission: number;
  ratingBonus: number;
  campaignBonus: number;
  /** Vai Host ('sale' | 'inspector'); Host vai Thẩm định có thêm khoản thù lao thẩm định. */
  roles: string[];
  inspections: number;
  inspectionFee: number;
}

export interface AdminLandlordFee {
  percent: number;
  /** `config` = Admin đã đặt; `default` = chưa cấu hình, đang dùng mức tạm. */
  source: "config" | "default";
  defaultPercent: number;
  min: number;
  max: number;
  updatedAt: string | null;
}

export interface AdminFeeAudit {
  id: string;
  at: string;
  by: string;
  configKey: string;
  from: number | null;
  to: number | null;
  reason: string | null;
}

export interface AdminPayoutStatement {
  period: string;
  hosts: AdminPayoutHost[];
  grandTotal: number;
}

export interface AdminDispatchTicket {
  ticketId: string;
  viewingId: string;
  bookingRef: string;
  viewingSlot: string;
  viewingStatus: string;
  unitCode: string;
  building: string;
  hostId: string | null;
  hostName: string;
  tier: number;
  slaSeconds: number;
  status: string;
  offeredAt: string;
  deadlineAt: string;
  secondsOverdue: number;
  isBreached: boolean;
}

export interface AdminContract {
  id: string;
  contractNumber: string;
  unitCode: string | null;
  tenantName: string | null;
  landlordName: string | null;
  monthlyRentPrice: string;
  securityDepositAmount: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface AdminContractDetail {
  id: string;
  contractNumber: string;
  unitCode: string;
  tenant: { fullName: string | null; phone: string | null; idNumber: string | null };
  landlord: { fullName: string | null; phone: string | null };
  monthlyRentPrice: number;
  securityDepositAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  evidenceSha256: string | null;
  tsaTimestamp: string | null;
}

export interface AdminContractParty {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "tenant" | "landlord";
  contracts?: string[];
  activeContracts?: number;
  needsSignature?: number;
}

/** Sổ hợp đồng hợp nhất — khớp `AdminContractRegistryService` ở backend. */
export type RegistryKind = "mandate" | "holding" | "lease" | "partnership";
export type RegistryTone = "ok" | "warn" | "danger" | "info" | "neutral";

export interface RegistryRow {
  key: string;
  kind: RegistryKind;
  id: string;
  docNumber: string;
  unitId: string | null;
  unitCode: string | null;
  scope: string;
  parties: { role: "landlord" | "tenant" | "host" | "platform"; name: string; id?: string }[];
  status: string;
  statusLabel: string;
  tone: RegistryTone;
  startAt: string | null;
  endAt: string | null;
  amount: number | null;
  amountLabel: string | null;
  needsAction: string | null;
  createdAt: string;
}

export interface RegistryDetail extends RegistryRow {
  facts: { label: string; value: string }[];
  timeline: { label: string; at: string | null }[];
  evidence: { sha256: string | null; tsaTime: string | null; signatures: { role: string; method: string; signedAt: string }[] } | null;
  hostId: string | null;
}

/** `lease-<uuid>` → { kind, id }; uuid trần (link cũ) coi là HĐ thuê. */
export function parseRegistryKey(key: string): { kind: RegistryKind; id: string } {
  const m = /^(mandate|holding|lease|partnership)-(.+)$/.exec(key);
  return m ? { kind: m[1] as RegistryKind, id: m[2] } : { kind: "lease", id: key };
}

export interface AdminContractTemplate {
  id: string;
  name: string;
  code: string;
}

const fail = (res: ApiResponse<unknown>) =>
  res.status === 0 ? "Không kết nối được máy chủ." : res.message || "Không tải được dữ liệu.";

export const adminApi = {
  dispatch: () => api.get<AdminDispatchTicket[]>("/admin/dispatch-sla"),
  reassign: (viewingId: string, hostId: string, reason: string) =>
    api.post<{ success: boolean; message: string }>(`/admin/bookings/${encodeURIComponent(viewingId)}/reassign`, { hostId, reason }),
  commission: () => api.get<{ configs: AdminFeeConfig[] }>("/admin/commission-engine"),
  commissionAudit: () => api.get<AdminFeeAudit[]>("/admin/commission-engine/audit"),
  updateCommission: (configKey: string, paramValue: number, reason: string) =>
    api.post<{ success: boolean }>("/admin/commission-engine/config", { configKey, paramValue, reason }),
  depositPolicy: () => api.get<{ minRatio: number; maxRatio: number; defaultRatio: number }>("/admin/settings/deposit-policy"),
  updateDepositPolicy: (data: { minRatio?: number; maxRatio?: number; defaultRatio?: number; reason: string }) =>
    api.post<{ success: boolean; policy: { minRatio: number; maxRatio: number; defaultRatio: number } }>("/admin/settings/deposit-policy", data),
  landlordFee: () => api.get<AdminLandlordFee>("/admin/settings/landlord-fee"),
  updateLandlordFee: (percent: number, reason: string) =>
    api.post<{ success: boolean; percent: number }>("/admin/settings/landlord-fee", { percent, reason }),
  sweepPayouts: () =>
    api.post<{ viewingsScanned: number; depositsScanned: number; inspectionsScanned: number; created: number; skipped: number }>("/admin/payouts/sweep"),
  payouts: (period?: string) => api.get<AdminPayoutStatement>(`/admin/payouts${period ? `?period=${encodeURIComponent(period)}` : ""}`),
  hostEarnings: () => api.get<HostEarnings>("/host/earnings"),
  contracts: () => api.get<AdminContract[]>("/admin/contracts"),
  registry: () => api.get<RegistryRow[]>("/admin/contract-registry"),
  registryDetail: (kind: RegistryKind, id: string) =>
    api.get<RegistryDetail>(`/admin/contract-registry/${kind}/${encodeURIComponent(id)}`),
  contract: (id: string) => api.get<AdminContractDetail>(`/admin/contracts/${encodeURIComponent(id)}`),
  voidHold: (id: string, reason: "landlord_breach" | "force_majeure", note: string) =>
    api.post(`/admin/contracts/${encodeURIComponent(id)}/void-hold`, { reason, note }),
  completeExit: (id: string) => api.post(`/admin/contracts/${encodeURIComponent(id)}/complete-exit`),
  remindRenewal: (id: string) => api.post(`/admin/contracts/${encodeURIComponent(id)}/remind-renewal`),
  contractParties: () => api.get<AdminContractParty[]>("/admin/contract-parties"),
  contractParty: (id: string) => api.get<AdminContractParty>(`/admin/contract-parties/${encodeURIComponent(id)}`),
  contractTemplates: () => api.get<AdminContractTemplate[]>("/admin/contract-templates"),
  contractTemplate: (id: string) => api.get<AdminContractTemplate>(`/admin/contract-templates/${encodeURIComponent(id)}`),
};

export interface HostEarnings {
  hostId: string;
  fullName: string | null;
  roles: string[];
  rating: number;
  walletBalance: number;
  stats: {
    totalViewings: number;
    totalDeals: number;
    dealCommissionTotal: number;
    viewingFeeTotal: number;
    ratingBonus: number;
    campaignBonus: number;
    totalInspections: number;
    inspectionFeeTotal: number;
    totalEarnings: number;
  };
  currentPeriod: string | null;
  payouts: { id: string; amount: number; period: string; status: string; createdAt: string }[];
}

export const useAdminDispatch = (): Query<AdminDispatchTicket[]> =>
  useApiQuery({ key: "admin-dispatch", fetch: adminApi.dispatch, errorText: fail }, true, { pollMs: 15_000 });

export const useAdminCommission = (): Query<{ configs: AdminFeeConfig[] }> =>
  useApiQuery({ key: "admin-commission", fetch: adminApi.commission, errorText: fail });

export const useAdminCommissionAudit = (): Query<AdminFeeAudit[]> =>
  useApiQuery({ key: "admin-commission-audit", fetch: adminApi.commissionAudit, errorText: fail });

export const useAdminLandlordFee = (): Query<AdminLandlordFee> =>
  useApiQuery({ key: "admin-landlord-fee", fetch: adminApi.landlordFee, errorText: fail });

export const useAdminDepositPolicy = (): Query<{ minRatio: number; maxRatio: number; defaultRatio: number }> =>
  useApiQuery({ key: "admin-deposit-policy", fetch: adminApi.depositPolicy, errorText: fail });

export const useAdminPayouts = (): Query<AdminPayoutStatement> =>
  useApiQuery({ key: "admin-payouts", fetch: adminApi.payouts, errorText: fail });

export const useHostEarnings = (): Query<HostEarnings> =>
  useApiQuery({ key: "host-earnings", fetch: adminApi.hostEarnings, errorText: fail });

export const useAdminContracts = (): Query<AdminContract[]> =>
  useApiQuery({ key: "admin-contracts", fetch: adminApi.contracts, errorText: fail });

export const useAdminContract = (id: string, enabled = true): Query<AdminContractDetail> =>
  useApiQuery({ key: `admin-contract:${id}`, fetch: () => adminApi.contract(id), errorText: fail }, enabled);

export const useContractRegistry = (): Query<RegistryRow[]> =>
  useApiQuery({ key: "admin-contract-registry", fetch: adminApi.registry, errorText: fail });

export const useContractRegistryDetail = (kind: RegistryKind, id: string): Query<RegistryDetail> =>
  useApiQuery({ key: `admin-contract-registry:${kind}:${id}`, fetch: () => adminApi.registryDetail(kind, id), errorText: fail });

export const useAdminContractParties = (): Query<AdminContractParty[]> =>
  useApiQuery({ key: "admin-contract-parties", fetch: adminApi.contractParties, errorText: fail });

export const useAdminContractParty = (id: string): Query<AdminContractParty> =>
  useApiQuery({ key: `admin-contract-party:${id}`, fetch: () => adminApi.contractParty(id), errorText: fail });

export const useAdminContractTemplates = (): Query<AdminContractTemplate[]> =>
  useApiQuery({ key: "admin-contract-templates", fetch: adminApi.contractTemplates, errorText: fail });

export const useAdminContractTemplate = (id: string): Query<AdminContractTemplate> =>
  useApiQuery({ key: `admin-contract-template:${id}`, fetch: () => adminApi.contractTemplate(id), errorText: fail });
