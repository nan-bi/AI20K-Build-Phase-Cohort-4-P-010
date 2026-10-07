import { DoorLockType, LayoutType, MandateStatus, UnitStatus } from '@prisma/client';

/** Điều khoản thoát ủy quyền: báo trước 15 ngày (legal/01 Điều 8). */
export const EXIT_NOTICE_DAYS = 15;
/** SLA Field Host thẩm định căn ký gửi kể từ lúc chủ nhà ký. */
export const INSPECT_SLA_HOURS = 48;
/** Kỳ ủy quyền độc quyền 12 tháng, tự gia hạn (legal/01). */
export const MANDATE_TERM_MONTHS = 12;

/** Khóa FeeConfig do Admin cấu hình; chưa có thì dùng mặc định và trả `feeSource: 'default'`. */
export const SERVICE_FEE_CONFIG_KEY = 'landlord_service_fee_rate';
export const DEFAULT_SERVICE_FEE_PERCENT = 5;
export const MGMT_FEE_CONFIG_KEY = 'mgmt_fee_per_m2';
export const DEFAULT_MGMT_FEE_PER_M2 = 9500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID_RE.test(value);

// ─── Trạng thái căn / ủy quyền ────────────────────────────────────────────────────────────────

export type UiUnitStatus = 'available' | 'viewing' | 'holding' | 'rented' | 'unlisted' | 'maintenance';

/** `viewing` = căn đang có khách xem (đã check-in sảnh, chưa kết thúc) — suy ra từ lịch xem, không lưu trong DB. */
export function toUiUnitStatus(status: UnitStatus, hasLiveViewing: boolean): UiUnitStatus {
  switch (status) {
    case UnitStatus.HOLDING:
      return 'holding';
    case UnitStatus.RENTED:
      return 'rented';
    case UnitStatus.UNLISTED:
      return 'unlisted';
    case UnitStatus.MAINTENANCE:
      return 'maintenance';
    default:
      return hasLiveViewing ? 'viewing' : 'available';
  }
}

/**
 * Căn thuộc "danh sách căn hộ" của chủ nhà CHỈ khi đã qua luồng ký gửi: có ủy quyền và không còn chờ thẩm định.
 * Căn không có bản ghi ủy quyền (nhập thẳng DB) hoặc còn là hồ sơ ký gửi chưa duyệt thì KHÔNG tính —
 * hồ sơ chưa duyệt nằm ở `/landlord/consignments`.
 */
export const isConsigned = (unit: { mandates: { status: MandateStatus }[] }): boolean =>
  !!unit.mandates[0] && unit.mandates[0].status !== MandateStatus.PENDING_INSPECTION;

export type UiMandateStatus = 'pending_inspection' | 'active' | 'exiting' | 'ended';

export function toUiMandateStatus(status: MandateStatus): UiMandateStatus {
  switch (status) {
    case MandateStatus.ACTIVE:
      return 'active';
    case MandateStatus.EXIT_REQUESTED:
      return 'exiting';
    case MandateStatus.PENDING_INSPECTION:
      return 'pending_inspection';
    default:
      return 'ended';
  }
}

// ─── Hồ sơ ký gửi (lưu trong ExclusiveMandate.doorAccessConfig.consignment) ────────────────────

/** Chuỗi hợp lệ: draft → awaiting_host → inspecting → approved | rejected | awaiting_landlord (đổi giá/cọc ⇒ chủ duyệt: accept ⇒ approved, decline ⇒ rejected — hồ sơ 18). */
export type ConsignmentStage = 'draft' | 'awaiting_host' | 'inspecting' | 'awaiting_landlord' | 'approved' | 'rejected';

export interface ConsignmentForm {
  building: string;
  floor: number;
  door: string;
  areaM2: number;
  askRent: number;
  suggestedDeposit: number;
  leaseTerm: 'mid' | 'long' | 'fixed' | null;
  furnished: boolean | null;
  locks: ('smart' | 'physical')[];
  note: string | null;
}

/**
 * Phần mở rộng của hồ sơ ký gửi mà schema chưa có cột riêng. Các bước sau (Inspector nhận/nộp phiếu thẩm định)
 * ghi `stage`, `hostAcceptedAt`, `inspection`, `report`, `decidedAt`, `decidedBy`, `decisionNote` vào cùng khóa này.
 * Mọi lần ghi phải đi qua `ConsignmentMetaStore.mutate()` (khóa dòng) — không ghi đọc-sửa-ghi trần.
 * TUYỆT ĐỐI không lưu mã cửa ở đây — mã cửa nằm trong DoorAccessKey.vaultSecretRef (đã mã hóa).
 */
/** Ảnh tham khảo chủ nhà đính kèm hồ sơ. KHÔNG phải ảnh Verified: ảnh niêm yết chính thức do Host chụp khi thẩm định. */
export interface ConsignmentPhoto {
  id: string;
  /** Đường dẫn trong bucket Storage (private); chỉ backend dùng, không trả ra client. */
  path: string;
  name: string;
  size: number;
  mime: string;
  uploadedAt: string;
}

export const MAX_PHOTOS = 8;
/** Trần dung lượng MỖI ảnh lưu trên Storage (bản free của Supabase có hạn mức lưu trữ nhỏ). Web nén ảnh xuống dưới mức này trước khi gửi. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/** Ô ảnh: `listing` = ảnh niêm yết; `1`..`32` = hạng mục Điều 5; `X1`..`X10` = hạng mục phát sinh. */
export type PhotoSlot = 'listing' | `${number}` | `X${number}`;
export type ListingRoom = 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'balcony' | 'view' | 'other';

/** Ảnh do Inspector chụp lúc thẩm định. `uploadedAt` là giờ MÁY CHỦ — mốc timestamp chính thức; các số đo do máy Host tính chỉ để tham khảo. */
export interface InspectionPhoto {
  id: string;
  /** `inspections/<mandateId>/<id>.<ext>` — chỉ backend dùng. */
  path: string;
  slot: PhotoSlot;
  /** Chỉ khi slot = 'listing'. */
  room?: ListingRoom;
  mime: string;
  size: number;
  width: number;
  height: number;
  /** Phương sai Laplacian do máy Host tính (tham khảo). */
  sharpness: number | null;
  /** Độ sáng trung bình 0..255 (tham khảo). */
  brightness: number | null;
  takenAt: string | null;
  uploadedAt: string;
  hostId: string;
}

export interface InspectionMeta {
  photos: InspectionPhoto[];
  doorRevealedAt?: string[];
}

/** Trách nhiệm hạng mục theo catalog Điều 5: lỗi do dùng, hoặc hao mòn/lỗi dùng. (01-CONTRACTS ghi `wear|misuse` nhưng catalog thật dùng `wear_or_misuse` — theo catalog, xem report R02.) */
export type Liability = 'misuse' | 'wear_or_misuse';

export interface InventoryLineReport {
  code: string;
  group: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
  name: string;
  present: boolean;
  qty?: number;
  /** Bội của 10, 0..100. */
  condition?: number;
  spec?: string;
  note?: string;
  liability: Liability;
  compensation?: number;
  photoIds: string[];
}

export type UnitLayoutKind = 'Studio' | '1PN' | '2PN' | '3PN';

/** Thông tin thực tế do Inspector xác nhận (hồ sơ 18 01 §4.2). Chỉ bắt buộc khi `approve`. */
export interface InspectionFacts {
  areaM2: number;
  layout: UnitLayoutKind;
  bathrooms: number;
  direction: string | null;
  floor: number;
}

/** Giá/cọc bảo đảm Inspector đề xuất (VNĐ nguyên). `reason` bắt buộc khi khác giá/cọc chủ khai. */
export interface InspectionPricing {
  rent: number;
  securityDeposit: number;
  reason?: string;
}

/** Nội dung công khai Inspector có thể sửa so với bản chủ khai. */
export interface InspectionListing {
  title: string;
  highlights: string[];
  description: string;
}

/** Đề xuất giá/cọc chờ chủ nhà duyệt (stage `awaiting_landlord`). */
export interface PricingProposal {
  rent: number;
  securityDeposit: number;
  reason: string | null;
  proposedAt: string;
  original: { rent: number; securityDeposit: number };
}

export interface InspectionReport {
  hostId: string;
  submittedAt: string;
  declared: { field: 'identity' | 'layout' | 'areaM2' | 'furnishing' | 'lock'; ok: boolean; actual?: string }[];
  inventory: InventoryLineReport[];
  functions: { ac: boolean; kitchen: boolean; waterHeater: boolean; drainage: boolean };
  netAreaM2: number;
  furnishing: 'full' | 'basic' | 'empty';
  /** Thứ tự hiển thị trên tin. */
  listingPhotoIds: string[];
  recommendation: 'approve' | 'reject';
  note?: string;
  /** Hồ sơ 18: có khi Inspector nộp phiếu mới; báo cáo cũ (trước hồ sơ 18) và phiếu `reject` có thể không có. */
  facts?: InspectionFacts;
  pricing?: InspectionPricing;
  listing?: InspectionListing;
  /** Server tính, không nhận từ client. */
  avgCondition: number;
}

export interface ConsignmentMeta {
  form: ConsignmentForm;
  photos?: ConsignmentPhoto[];
  stage?: ConsignmentStage;
  ownershipWarrantedAt?: string;
  /** SĐT đã ký OTP, mã hoá AES (cùng `PhoneService`); KHÔNG gắn vào Profile. */
  signedPhoneEnc?: string;
  inspectDueAt?: string;
  /** FieldHost.id được GIAO (lúc ký) hoặc NHẬN (accept/claim). */
  hostId?: string;
  /** Mốc giao cho `hostId` — tính tầng Open Pool. */
  offeredAt?: string;
  hostAcceptedAt?: string;
  inspection?: InspectionMeta;
  report?: InspectionReport;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  /** Có khi stage = `awaiting_landlord`; giữ lại sau khi chủ quyết định (đối soát). */
  pricingProposal?: PricingProposal;
  pricingDecision?: { decision: 'accept' | 'decline'; decidedAt: string };
}

export function readConsignmentMeta(doorAccessConfig: unknown): ConsignmentMeta | null {
  if (!doorAccessConfig || typeof doorAccessConfig !== 'object') return null;
  const meta = (doorAccessConfig as { consignment?: ConsignmentMeta }).consignment;
  return meta && typeof meta === 'object' && meta.form ? meta : null;
}

/** Ghi đè khóa `consignment`, giữ nguyên các khóa khác của doorAccessConfig. */
export function withConsignmentMeta(doorAccessConfig: unknown, meta: ConsignmentMeta) {
  const base = doorAccessConfig && typeof doorAccessConfig === 'object' ? (doorAccessConfig as Record<string, unknown>) : {};
  return { ...base, consignment: meta };
}

export function consignmentStage(mandate: {
  status: MandateStatus;
  signedAt: Date | null;
  doorAccessConfig: unknown;
}): ConsignmentStage {
  const explicit = readConsignmentMeta(mandate.doorAccessConfig)?.stage;
  if (explicit) return explicit;
  if (mandate.status === MandateStatus.ACTIVE) return 'approved';
  return mandate.signedAt ? 'awaiting_host' : 'draft';
}

// ─── Enum web ↔ Prisma ────────────────────────────────────────────────────────────────────────

const LAYOUT_INPUT: Record<string, LayoutType> = {
  Studio: LayoutType.STUDIO,
  '1PN': LayoutType.ONE_BED_PLUS,
  '2PN': LayoutType.TWO_BED_ONE_BATH,
  '3PN': LayoutType.THREE_BED,
  STUDIO: LayoutType.STUDIO,
  ONE_BED_PLUS: LayoutType.ONE_BED_PLUS,
  TWO_BED_ONE_BATH: LayoutType.TWO_BED_ONE_BATH,
  TWO_BED_TWO_BATH: LayoutType.TWO_BED_TWO_BATH,
  THREE_BED: LayoutType.THREE_BED,
};

/** Nhận cả giá trị UI (`Studio|1PN|2PN|3PN`) lẫn enum Prisma; null nếu không nhận ra. */
export const toLayoutType = (input: string): LayoutType | null => LAYOUT_INPUT[input] ?? null;

const LAYOUT_KIND: Record<LayoutType, 'Studio' | '1PN' | '2PN' | '3PN'> = {
  STUDIO: 'Studio',
  ONE_BED_PLUS: '1PN',
  TWO_BED_ONE_BATH: '2PN',
  TWO_BED_TWO_BATH: '2PN',
  THREE_BED: '3PN',
};
export const toLayoutKind = (layout: LayoutType) => LAYOUT_KIND[layout];

export type LockKind = 'smart' | 'physical';

export function toLockKind(lock: DoorLockType): LockKind {
  return lock === DoorLockType.PHYSICAL_KEY ? 'physical' : 'smart';
}

/** Nhận `smart|physical` hoặc `ELECTRONIC_PIN|PHYSICAL_KEY`; null nếu không nhận ra. */
export function parseLock(input: string): LockKind | null {
  if (input === 'smart' || input === 'ELECTRONIC_PIN') return 'smart';
  if (input === 'physical' || input === 'PHYSICAL_KEY') return 'physical';
  return null;
}

export const toDoorLockType = (lock: LockKind): DoorLockType =>
  lock === 'physical' ? DoorLockType.PHYSICAL_KEY : DoorLockType.ELECTRONIC_PIN;

// ─── Tiện ích hiển thị / thời gian ────────────────────────────────────────────────────────────

/** `+84901234567` → `0901 *** 567`; trả null nếu không có SĐT. */
export function maskPhone(e164?: string | null): string | null {
  if (!e164) return null;
  const local = e164.startsWith('+84') ? `0${e164.slice(3)}` : e164;
  if (local.length < 7) return null;
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Ngày gia hạn kế tiếp của kỳ ủy quyền 12 tháng, tính từ ngày ký. */
export function mandateRenewsAt(signedAt: Date, now: Date): Date {
  let next = addMonths(signedAt, MANDATE_TERM_MONTHS);
  while (next <= now) next = addMonths(next, MANDATE_TERM_MONTHS);
  return next;
}

export interface MonthWindow {
  key: string; // YYYY-MM
  label: string; // T9
  start: Date;
  end: Date; // ngày cuối tháng, 23:59:59.999
}

/** `count` tháng gần nhất, cũ → mới, tháng cuối là tháng của `now`. */
export function lastMonths(count: number, now: Date): MonthWindow[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: `T${start.getMonth() + 1}`, start, end };
  });
}
