/**
 * Kiểu dữ liệu thẩm định ký gửi (hồ sơ 16) — KHỚP backend `inspection.types.ts` (01-CONTRACTS §3, §7).
 * CẤM import module mock ở đây: cổng thẩm định chạy hoàn toàn trên API thật.
 */
import type { DoorAccessView } from "@/lib/host/types";

export type { DoorAccessView };

export type ConsignmentStage = "draft" | "awaiting_host" | "inspecting" | "awaiting_landlord" | "approved" | "rejected";
export type InventoryGroup = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export type Liability = "misuse" | "wear_or_misuse";
export type PhotoSlot = string; // 'listing' | '1'..'32' | 'X1'..'X10'
export type ListingRoom = "living_room" | "bedroom" | "kitchen" | "bathroom" | "balcony" | "view" | "other";
export type DeclaredField = "identity" | "layout" | "areaM2" | "furnishing" | "lock";
export type Furnishing = "full" | "basic" | "empty";
export type LockKind = "smart" | "physical";
export type LayoutKind = "Studio" | "1PN" | "2PN" | "3PN";

export interface InventoryLineReport {
  code: string;
  group: InventoryGroup;
  name: string;
  present: boolean;
  qty?: number;
  condition?: number;
  spec?: string;
  note?: string;
  liability: Liability;
  compensation?: number;
  photoIds: string[];
}

/** Thông tin thực tế do Inspector xác nhận (hồ sơ 18, 01 §4.2). */
export interface InspectionFacts {
  areaM2: number;
  layout: LayoutKind;
  bathrooms: number;
  direction: string | null;
  floor: number;
}

export interface InspectionPricing {
  rent: number;
  securityDeposit: number;
  reason?: string;
}

export interface InspectionListing {
  title: string;
  highlights: string[];
  description: string;
}

export interface InspectionReport {
  hostId: string;
  submittedAt: string;
  declared: { field: DeclaredField; ok: boolean; actual?: string }[];
  inventory: InventoryLineReport[];
  functions: { ac: boolean; kitchen: boolean; waterHeater: boolean; drainage: boolean };
  netAreaM2: number;
  furnishing: Furnishing;
  listingPhotoIds: string[];
  recommendation: "approve" | "reject";
  note?: string;
  facts?: InspectionFacts;
  pricing?: InspectionPricing;
  listing?: InspectionListing;
  avgCondition: number;
}

export interface InspectionCard {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  floor: number;
  door: string | null;
  layoutKind: LayoutKind;
  areaM2: number;
  askRent: number;
  furnished: boolean | null;
  locks: LockKind[];
  landlordName: string;
  stage: ConsignmentStage;
  signedAt: string;
  inspectDueAt: string;
  overdue: boolean;
  tier: "assigned" | "open";
  hostAcceptedAt: string | null;
  decidedAt: string | null;
}

export interface InspectionBoard {
  serverTime: string;
  mine: InspectionCard[];
  open: InspectionCard[];
  done: InspectionCard[];
}

export interface CatalogItem {
  code: string;
  group: InventoryGroup;
  name: string;
  passport: string;
  liability: Liability;
  specHint: string;
  checkHint: string;
}

export interface InspectionPhotoView {
  id: string;
  slot: PhotoSlot;
  room: ListingRoom | null;
  width: number;
  height: number;
  size: number;
  uploadedAt: string;
  /** Link ký 1 giờ (null nếu ký lỗi). */
  url: string | null;
}

export interface InspectionLimits {
  minSidePx: number;
  perLineMax: number;
  listingMin: number;
  listingMax: number;
  totalMax: number;
}

/**
 * Phần chủ khai đã lưu ở `units` mà màn thẩm định cần để điền sẵn. CHƯA có ở API hiện tại (WP2 không trả) — web đọc nếu có,
 * thiếu thì dùng mặc định theo layout / để trống (xem report R03).
 */
export interface DeclaredListingInfo {
  bathrooms?: number;
  direction?: string | null;
  title?: string | null;
  highlights?: string[];
  description?: string | null;
}

export interface InspectionDetail extends InspectionCard {
  declared?: DeclaredListingInfo;
  suggestedDeposit: number;
  leaseTerm: "mid" | "long" | "fixed" | null;
  note: string | null;
  landlordPhotos: { id: string; name: string; url: string | null }[];
  photos: InspectionPhotoView[];
  doorKind: LockKind;
  /** Đã có PIN hợp lệ trong hệ thống. KHÔNG bao giờ trả PIN ở chi tiết. */
  doorCodeOnFile: boolean;
  catalog: CatalogItem[];
  limits: InspectionLimits;
  report: InspectionReport | null;
}

export interface InspectionResult {
  stage: "approved" | "rejected" | "awaiting_landlord";
  unitCode: string;
  listedAt: string | null;
}

export interface LandlordInspectionView {
  hostName: string | null;
  submittedAt: string;
  report: InspectionReport;
  photos: InspectionPhotoView[];
}

/** Metric đo trên máy Host gửi kèm ảnh (chỉ tham khảo — server không dựa vào đó, B7). */
export interface PhotoUploadMeta {
  slot: PhotoSlot;
  room?: ListingRoom;
  takenAt?: string | null;
  sharpness?: number | null;
  brightness?: number | null;
}

// ─── Nháp phiếu (client) ────────────────────────────────────────────────────────────────────────

export interface DraftLine {
  code: string;
  group: InventoryGroup;
  name: string;
  liability: Liability;
  present: boolean;
  qty: number;
  /** null = chưa chọn. */
  condition: number | null;
  spec: string;
  note: string;
  /** Chuỗi gõ tay (VNĐ); rỗng = không có. */
  compensation: string;
  /** Suy ra từ ảnh trên server theo `slot` (xem `syncPhotos`) — không lưu ở nháp. */
  photoIds: string[];
}

export interface InspectionDraft {
  declared: Record<DeclaredField, { ok: boolean; actual: string }>;
  netAreaM2: string;
  furnishing: Furnishing;
  /** 32 dòng catalog + 0..10 dòng X, theo đúng thứ tự gửi lên. */
  inventory: DraftLine[];
  functions: { ac: boolean; kitchen: boolean; waterHeater: boolean; drainage: boolean };
  /** Thứ tự ảnh niêm yết do Host sắp (id ảnh slot `listing`). */
  listingOrder: string[];
  /** Ảnh niêm yết đã đồng bộ với server (= `listingOrder` lọc theo ảnh còn tồn tại + ảnh mới). */
  listingPhotoIds: string[];
  recommendation: "approve" | "reject";
  note: string;
  doorPin: string;
  /** Hồ sơ 18 — thông tin thực tế (điền sẵn từ chủ khai), giá & cọc, giới thiệu căn. */
  facts: FactsDraft;
  pricing: PricingDraft;
  listing: ListingDraft;
}

export interface FactsDraft {
  /** Chuỗi gõ tay. */
  areaM2: string;
  layout: LayoutKind;
  bathrooms: string;
  /** "" = Chưa rõ ⇒ gửi `null`. */
  direction: string;
  floor: string;
}

export interface PricingDraft {
  /** Chuỗi chữ số (VNĐ nguyên). */
  rent: string;
  securityDeposit: string;
  reason: string;
}

export interface ListingDraft {
  title: string;
  /** Luôn 3 ô; ô rỗng bị bỏ khi gửi. */
  highlights: string[];
  description: string;
}

export interface SubmitInspectionDto {
  declared: InspectionReport["declared"];
  inventory: InventoryLineReport[];
  functions: InspectionReport["functions"];
  netAreaM2: number;
  furnishing: Furnishing;
  listingPhotoIds: string[];
  recommendation: "approve" | "reject";
  note?: string;
  doorPin?: string;
  /** Bắt buộc khi `approve` (backend: thiếu ⇒ 400 REPORT_INVALID field facts/pricing/listing). */
  facts?: InspectionFacts;
  pricing?: InspectionPricing;
  listing?: InspectionListing;
}

export interface DraftError {
  field: string;
  message: string;
}
