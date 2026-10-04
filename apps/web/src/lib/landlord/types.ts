/** Kiểu dữ liệu trả về từ `/api/v1/landlord/*` — khớp backend/src/modules/landlord (landlord-*.service.ts). */

import type { LandlordInspectionView } from "@/lib/inspection/types";

export type UnitStatus = "available" | "viewing" | "holding" | "rented" | "unlisted" | "maintenance";
export type MandateStatus = "pending_inspection" | "active" | "exiting" | "ended";
export type LayoutKind = "Studio" | "1PN" | "2PN" | "3PN";
export type LockKind = "smart" | "physical";
export type LeaseTermPref = "mid" | "long" | "fixed";
export type ConsignmentStatus = "draft" | "awaiting_host" | "inspecting" | "approved" | "rejected";

export interface MandateSummary {
  id: string;
  status: MandateStatus;
  signedAt: string | null;
  exitRequestedAt: string | null;
  exitEffectiveAt: string | null;
}

export interface UnitRow {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  floor: number;
  layout: string;
  layoutKind: LayoutKind;
  carpetAreaM2: number;
  baseRentPrice: number;
  rent: number;
  status: UnitStatus;
  isVerified: boolean;
  lock: LockKind;
  thumbnailUrl: string | null;
  holdExpiresAt: string | null;
  totalViewings: number;
  /** null = căn chưa có bản ghi ủy quyền trong hệ thống. */
  mandate: MandateSummary | null;
}

export interface UnitDetail {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  floor: number;
  layout: string;
  layoutKind: LayoutKind;
  carpetAreaM2: number;
  status: UnitStatus;
  isVerified: boolean;
  lock: LockKind;
  media: { url: string; category: string; verifiedAt: string }[];
  baseRentPrice: number;
  rent: number;
  allInCost: { rent: number; managementFee: number; parkingFeeEstimate: number; utilityCostEstimate: number; total: number };
  totalViewings: number;
  host: { id: string; name: string | null } | null;
  mandate: (MandateSummary & { contractNumber: string; renewsAt: string | null }) | null;
  holding: { amount: number; paidAt: string | null; expiresAt: string | null } | null;
  lease: {
    contractNumber: string;
    tenantName: string | null;
    startDate: string;
    endDate: string;
    months: number;
    rent: number;
    serviceFee: number;
    landlordNet: number;
    securityDeposit: number;
  } | null;
  /** Nhật ký xem phòng và nhật ký mở cửa đi kèm trong cùng một response (trang chi tiết cần cả ba). */
  viewings: ViewingLogEntry[];
  doorAudit: DoorAuditEntry[];
}

export type ViewingOutcome = "scheduled" | "in_progress" | "deposit" | "not_decided" | "no_show" | "cancelled";

export interface ViewingLogEntry {
  id: string;
  bookingRef: string;
  slot: string;
  lobbyCheckInAt: string | null;
  completedAt: string | null;
  durationMin: number | null;
  outcome: ViewingOutcome;
  cancelReason: string | null;
  tenantName: string | null;
  tenantPhoneMasked: string | null;
  host: { id: string; name: string | null } | null;
}

export interface DoorAuditEntry {
  id: string;
  at: string;
  actorName: string | null;
  actorRole: string;
  revealedAt: string;
  expiresAt: string | null;
}

/** Ảnh tham khảo chủ nhà đính kèm hồ sơ. `url` là link ký có hạn 1 giờ (null nếu ký lỗi). Không phải ảnh Verified. */
export interface ConsignmentPhoto {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url: string | null;
}

export interface Consignment {
  id: string;
  unitId: string;
  unitCode: string;
  contractNumber: string;
  status: ConsignmentStatus;
  building: string;
  zone: string;
  floor: number;
  door: string | null;
  layout: string;
  layoutKind: LayoutKind;
  areaM2: number;
  askRent: number;
  suggestedDeposit: number;
  leaseTerm: LeaseTermPref | null;
  furnished: boolean | null;
  locks: LockKind[];
  note: string | null;
  photoCount: number;
  /** Chỉ có ở `GET /landlord/consignments/:id` (danh sách chỉ có `photoCount`). */
  photos?: ConsignmentPhoto[];
  createdAt: string;
  signedAt: string | null;
  ownershipWarrantedAt: string | null;
  inspectDueAt: string | null;
  hostId: string | null;
  hostAcceptedAt: string | null;
  /** Phiếu thẩm định + ảnh (link ký 1h) — chỉ có ở `GET /landlord/consignments/:id`; null khi Host chưa nộp. */
  inspection?: LandlordInspectionView | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
}

export interface CreateConsignmentInput {
  building: string;
  floor: number;
  door: string;
  layout: LayoutKind;
  areaM2: number;
  askRent: number;
  suggestedDeposit: number;
  leaseTerm: LeaseTermPref;
  furnished: boolean;
  locks: LockKind[];
  doorCode?: string;
}

export interface SignOtpInfo {
  /** false ⇒ số đã xác thực của tài khoản, backend KHÔNG gửi mã và `sign` không cần OTP. */
  otpRequired: boolean;
  maskedPhone: string | null;
  expiresInSeconds: number;
  /** Chỉ có khi backend bật OTP_ECHO_DEV_CODE (môi trường dev). */
  devCode?: string;
}

export interface ExitResult {
  mandateId: string;
  unitId: string;
  status: "exiting";
  exitRequestedAt: string;
  exitEffectiveAt: string;
  countdownDays: number;
}

export interface FinanceMonth {
  month: string;
  label: string;
  gross: number;
  fee: number;
  net: number;
}

export interface FinanceUnitRow {
  unitId: string;
  unitCode: string;
  building: string;
  status: UnitStatus;
  rent: number;
  fee: number;
  net: number;
  escrow: number;
}

export interface Finance {
  serviceFeePercent: number;
  /** `default` = Admin chưa cấu hình, đang dùng mức tạm. */
  feeSource: "config" | "default";
  thisMonth: { gross: number; fee: number; net: number };
  totalNet6Months: number;
  escrowTotal: number;
  history: FinanceMonth[];
  perUnit: FinanceUnitRow[];
}

export interface BuildingOption {
  id: string;
  buildingCode: string;
  zoneName: string;
  totalFloors: number;
}

export interface MyProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  isPhoneVerified: boolean;
  /** SĐT của chính chủ (dạng `0901234567`), null nếu chưa có. */
  phone: string | null;
  createdAt: string;
}
