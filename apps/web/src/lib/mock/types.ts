import type { Household } from "./cost";
import type { Furnishing, ItemKey, LayoutKind, UnitStatus, ZoneId } from "./units";

// ─── Lịch xem nhà ───────────────────────────────────────────────────────────────────────────

/**
 * Vòng đời một lịch xem (PRD §3.2–3.4):
 * pending → confirmed → lobby → receiving → viewing → closing → holding → signed → leased
 * Nhánh phụ: completed (xem xong, chưa thuê), no_show, cancelled, rejected.
 */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "lobby"
  | "receiving"
  | "viewing"
  | "closing"
  | "holding"
  | "signed"
  | "leased"
  | "completed"
  | "no_show"
  | "cancelled"
  | "rejected";

export interface IdCardData {
  fullName: string;
  idNumber: string;
  dob: string;
  issuedDate: string;
  address: string;
  /** Độ tin cậy OCR từng trường (0–1). < 0.85 → bắt đối chiếu tay. */
  confidence: { fullName: number; idNumber: number; issuedDate: number; address: number };
  manuallyEdited: boolean;
  /** Điểm khớp khuôn mặt giữa ảnh chân dung và ảnh trên CCCD (0–1). */
  faceMatch: number;
  consentAt: string;
  verifiedAt: string;
}

export interface DepositInfo {
  amount: number;
  /** Nội dung chuyển khoản: COC [Mã căn] [SĐT]. */
  content: string;
  qrRef: string;
  createdAt: string;
  paidAt?: string;
  /** Hết hạn giữ chỗ 24h kể từ lúc thanh toán. */
  expiresAt?: string;
  method?: "webhook" | "host_receipt";
  /** Host tải UNC lên khi webhook chậm — giữ tạm 30 phút. */
  tempHoldUntil?: string;
}

export interface Booking {
  id: string;
  ref: string;
  unitId: string;
  hostId: string;
  tenant: { name: string; phone: string; persons: number; note?: string };
  slot: string;
  status: BookingStatus;
  createdAt: string;
  confirmedAt?: string;
  /** Khách bấm "Đang trên đường - xin trễ 10p". */
  lateRequested?: boolean;
  lobbyAt?: string;
  receivingAt?: string;
  viewingAt?: string;
  doorCode?: string;
  doorCodeExpiresAt?: string;
  deposit?: DepositInfo;
  kyc?: IdCardData;
  agreement?: { signedAt: string; docId: string };
  lease?: { signedAt: string; startDate: string; months: number; rent: number; docId: string };
  closedReason?: string;
  rating?: number;
  reminderSentAt?: string;
}

// ─── Thông báo (Zalo / push) ─────────────────────────────────────────────────────────────────

export type NoticeAudience = "tenant" | "landlord" | "host" | "admin";

export interface NoticeAction {
  id: "arrived" | "late" | "reschedule";
  label: string;
  /** Đã bấm — nút chuyển sang trạng thái đã phản hồi. */
  doneAt?: string;
}

export interface Notice {
  id: string;
  at: string;
  channel: "zalo" | "push" | "system";
  audience: NoticeAudience;
  /** tenant: SĐT chuẩn hoá · landlord: landlordId · host: hostId · admin: bỏ trống. */
  toKey?: string;
  title: string;
  body: string;
  bookingId?: string;
  unitId?: string;
  tone?: "info" | "success" | "warning" | "alert";
  actions?: NoticeAction[];
}

// ─── Ký gửi / uỷ quyền ────────────────────────────────────────────────────────────────────────

export interface Mandate {
  unitId: string;
  status: "active" | "exiting" | "ended";
  signedAt: string;
  exitRequestedAt?: string;
  exitEffectiveAt?: string;
}

export interface Consignment {
  id: string;
  landlordId: string;
  building: string;
  floor: number;
  door: string;
  layout: LayoutKind;
  areaM2: number;
  askRent: number;
  furnishing: Furnishing;
  lock: "smart" | "physical";
  auditByHost: boolean;
  items: ItemKey[];
  /** draft = mới đăng ký, chưa ký uỷ quyền · pending = chờ Admin duyệt · approved · rejected */
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
  note?: string;
}

// ─── Cấu hình biến phí (Admin) ───────────────────────────────────────────────────────────────

export interface FeeConfig {
  baseViewingFee: number;
  dealCommission: number;
  ratingMultiplier: number;
  campaignBonus: number;
}

export interface FeeAudit {
  id: string;
  at: string;
  by: string;
  field: keyof FeeConfig;
  from: number;
  to: number;
}

// ─── OTP & chat ───────────────────────────────────────────────────────────────────────────────

export interface OtpChallenge {
  phone: string;
  code: string;
  expiresAt: number;
  purpose: "booking" | "kyc" | "agreement" | "lease";
}

export interface CriteriaState {
  /** Ngân sách trần All-in / tháng (VNĐ). */
  budget?: number;
  layouts: LayoutKind[];
  zones: ZoneId[];
  buildings: string[];
  floor?: "low" | "mid" | "high";
  furnishing?: Furnishing;
  items: ItemKey[];
  pets?: boolean;
  household: Household;
  moveIn?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  /** Tin trả lời có kết quả tìm căn. */
  resultIds?: string[];
  criteria?: CriteriaState;
}

export interface ChatState {
  messages: ChatMessage[];
  criteria: CriteriaState;
  /** Đã có ít nhất một lần tìm căn → giao diện chuyển sang chế độ kết quả. Danh sách căn luôn tính lại từ `criteria`. */
  searched: boolean;
}

// ─── State tổng ───────────────────────────────────────────────────────────────────────────────

export interface UnitOverride {
  status: UnitStatus;
  holdingUntil?: string;
}

export interface MockState {
  ready: boolean;
  seededOn: string;
  bookings: Booking[];
  notices: Notice[];
  unitState: Record<string, UnitOverride>;
  mandates: Record<string, Mandate>;
  consignments: Consignment[];
  fees: FeeConfig;
  feeAudit: FeeAudit[];
  favorites: string[];
  otp: OtpChallenge | null;
  /** Số tin khách vãng lai đã nhắn (giới hạn 1). */
  guestSent: number;
  chat: ChatState;
  /** Thông tin khách đã dùng để điền sẵn form đặt lịch. */
  tenantProfile?: { name: string; phone: string };
}
