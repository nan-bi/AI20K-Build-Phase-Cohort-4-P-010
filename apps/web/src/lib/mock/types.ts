import type { Household } from "./cost";
import type { Furnishing, ItemKey, LayoutKind, PassportItem, UnitStatus, ZoneId } from "./units";

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
  lease?: { signedAt: string; startDate: string; months: number; rent: number; docId: string; renewalRemindedAt?: string };
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
  endedAt?: string;   // ISO — lúc Admin hoàn tất thoát uỷ quyền
  endedBy?: string;   // tên Admin
}

export type ConsignmentStatus =
  | "draft"          // đã đăng ký, chưa ký OTP ủy quyền
  | "awaiting_host"  // đã ký, ticket đã gán Host phân khu, Host chưa nhận
  | "inspecting"     // Host đã nhận, đang kiểm tra thực tế
  | "reviewing"      // Host đã nộp báo cáo, chờ Admin chốt
  | "approved"       // Admin duyệt — ký gửi hiệu lực
  | "rejected";      // Admin không duyệt (kèm note)

export type DeclaredField = "identity" | "layout" | "areaM2" | "furnishing" | "lock";
export interface DeclaredCheck { field: DeclaredField; ok: boolean; /** bắt buộc khi ok=false, ≤80 ký tự */ actual?: string }
export interface ItemPresence { key: ItemKey; present: boolean }
export interface EquipmentCondition {
  item: PassportItem;          // `(typeof PASSPORT_ITEMS)[number]`, export từ units.ts
  condition: number;           // % độ mới, bội số 10 trong [0,100]
  photoAt: string;             // ISO — mock “ảnh chụp trong app có timestamp”
  note?: string;               // ≤120 ký tự
}
export interface InspectionReport {
  hostId: string;
  submittedAt: string;
  declared: DeclaredCheck[];        // đúng 5 phần tử, mỗi DeclaredField 1 lần
  items: ItemPresence[];            // đúng các key trong Consignment.items, cùng thứ tự
  equipment: EquipmentCondition[];  // đúng 10, thứ tự PASSPORT_ITEMS
  recommendation: "approve" | "reject";
  note?: string;                    // ≤300 ký tự
}
export type InspectionDraft = Omit<InspectionReport, "hostId" | "submittedAt">;

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
  status: ConsignmentStatus;
  createdAt: string;
  note?: string;
  signedAt?: string;       // lúc ký OTP (vào awaiting_host)
  hostId?: string;         // gán lúc ký = zoneOfBuilding(building).hostId
  inspectDueAt?: string;   // signedAt + 48h
  hostAcceptedAt?: string;
  report?: InspectionReport;
  decidedAt?: string;
  decidedBy?: string;      // tên Admin
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
