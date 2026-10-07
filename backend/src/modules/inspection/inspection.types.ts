import type {
  ConsignmentStage,
  InspectionReport,
  InventoryLineReport,
  Liability,
  ListingRoom,
  PhotoSlot,
} from '../landlord/landlord.mappers';

/**
 * Hợp đồng dây luồng thẩm định (hồ sơ 16, 01-CONTRACTS §7). Web có bản sao ở `apps/web/src/lib/inspection/types.ts`.
 * Kiểu meta lưu trong DB (`InspectionPhoto`, `InspectionReport`, …) nằm ở `landlord.mappers.ts`.
 */
export interface InspectionCard {
  id: string;
  unitCode: string;
  building: string;
  zone: string;
  floor: number;
  door: string | null;
  layoutKind: 'Studio' | '1PN' | '2PN' | '3PN';
  areaM2: number;
  askRent: number;
  furnished: boolean | null;
  locks: ('smart' | 'physical')[];
  landlordName: string;
  stage: ConsignmentStage;
  signedAt: string;
  inspectDueAt: string;
  overdue: boolean;
  /** assigned = giao cho tôi; open = Open Pool. */
  tier: 'assigned' | 'open';
  hostAcceptedAt: string | null;
  decidedAt: string | null;
}

export interface InspectionBoard {
  serverTime: string;
  mine: InspectionCard[];
  open: InspectionCard[];
  /** Tôi đã nộp, 20 gần nhất. */
  done: InspectionCard[];
}

export interface CatalogItem {
  code: string;
  group: InventoryLineReport['group'];
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
  /** Link ký 1h. */
  url: string | null;
}

export interface DeclaredListingInfo {
  bathrooms: number;
  direction: string | null;
  title: string | null;
  highlights: string[];
  description: string | null;
}

export interface InspectionDetail extends InspectionCard {
  /** Chủ nhà khai lúc ký gửi (đọc từ `units`) — màn thẩm định điền sẵn để Inspector xác nhận/sửa. */
  declared: DeclaredListingInfo;
  suggestedDeposit: number;
  leaseTerm: 'mid' | 'long' | 'fixed' | null;
  note: string | null;
  landlordPhotos: { id: string; name: string; url: string | null }[];
  photos: InspectionPhotoView[];
  /** KHÔNG trả PIN ở đây. */
  doorKind: 'smart' | 'physical';
  doorCodeOnFile: boolean;
  /** 32 dòng — NGUỒN DUY NHẤT (backend). */
  catalog: CatalogItem[];
  limits: { minSidePx: number; perLineMax: number; listingMin: number; listingMax: number; totalMax: number };
  report: InspectionReport | null;
}

export interface InspectionResult {
  stage: 'approved' | 'rejected' | 'awaiting_landlord';
  unitCode: string;
  listedAt: string | null;
}

export interface LandlordInspectionView {
  hostName: string | null;
  submittedAt: string;
  report: InspectionReport;
  /** Cả ảnh hạng mục + niêm yết, link ký 1h. */
  photos: InspectionPhotoView[];
}

/** Dữ liệu `submit` sau khi qua DTO (01 §7: `InspectionReport` bỏ `hostId`, `submittedAt`, `avgCondition`; thêm `doorPin`). */
export type SubmitInspectionInput = Omit<InspectionReport, 'hostId' | 'submittedAt' | 'avgCondition'> & { doorPin?: string };
