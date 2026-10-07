export type BookingStatusWeb =
  | 'pending'
  | 'confirmed'
  | 'lobby'
  | 'receiving'
  | 'viewing'
  | 'closing'
  | 'holding'
  | 'leased'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'rejected';

/** Một dòng nội thất công khai của căn (có độ mới %; không có bồi thường/ảnh bằng chứng — B6). */
export interface UnitInventoryLine {
  /** Mã catalog "1".."32" — ghép ảnh minh hoạ `/inventory/<code>.jpg`. */
  code: string;
  group: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
  groupLabel: string;
  name: string;
  qty: number;
  spec: string | null;
  /** "Độ mới" % do Host kiểm định ước lượng (30–98); null = chưa có. */
  conditionPct: number | null;
}

export interface TenantUnit {
  code: string;
  building: string;
  zoneName?: string;
  floor: number;
  door: string;
  layout: 'Studio' | '1PN' | '2PN' | '3PN';
  layoutLabel: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  direction: string | null;
  view: string | null;
  furnishing: 'full' | 'basic' | 'empty';
  items: string[];
  rent: number;
  marketAvg: number;
  managementFee: number;
  parkingFeeEstimate: number;
  utilityCostEstimate: number;
  status: 'available' | 'holding' | 'rented';
  lock: 'smart' | 'physical';
  photos: string[];
  interest24h: number;
  petFriendly: boolean;
  minMonths: number;
  verifiedAt: string;
  title: string;
  description: string;
  holdHours: number; // 12..72 — B4
  activeViewingAt: string | null; // ca xem sớm nhất hôm nay đang CONFIRMED/LOBBY/RECEIVING/VIEWING — nhãn FOMO
  securityDeposit: number; // Tiền cọc bảo đảm: units.securityDeposit ?? baseRentPrice
  holdingDeposit: number; // Cọc giữ chỗ backend đang thu — chỉ đọc từ API
  highlights: string[]; // ≤ 3
  inventory: UnitInventoryLine[]; // chỉ ở chi tiết căn; danh sách = []
}

export interface CreateBookingDto {
  unitCode: string;
  slot: string; // ISO, khớp SLOT_TIMES giờ VN
  contactName: string; // 2..100
  phone: string; // VN, chuẩn hoá E.164 ở backend
  partySize: number; // 1..10
  note?: string; // ≤ 300
  actionToken?: string; // bắt buộc trừ khi profile.isPhoneVerified và phone khớp profile
}

export interface TenantBooking {
  ref: string;
  status: BookingStatusWeb;
  unit: TenantUnit;
  slot: string;
  createdAt: string;
  confirmedAt?: string;
  reminderSentAt?: string;
  lateRequestedAt?: string;
  lobbyAt?: string;
  receivingAt?: string;
  viewingAt?: string;
  viewEndedAt?: string;
  closedReason?: string;
  rating?: number;
  rescheduleCount: number;
  contact: {
    name: string;
    phoneMasked: string;
    persons: number;
    note?: string;
  };
  host: {
    name: string;
    rating: number | null;
  } | null;
  canModify: boolean; // status ∈ {pending, confirmed} && slot − now ≥ 2h
  deposit?: {
    amount: number;
    transferContent: string;
    qrRef: string;
    createdAt: string;
    termsAcceptedAt: string;
    termsVersion: string;
    paidAt?: string;
    holdHours?: number;
    expiresAt?: string;
    outcome: 'awaiting_payment' | 'active' | 'expired' | 'converted' | 'refunded' | 'forfeited';
    vietqr: {
      bankId: string;
      bankName?: string;
      accountNo: string;
      accountName: string;
      qrUrl: string;
    } | null;
  };
  kyc?: {
    verifiedAt: string;
    confidenceMin: number;
    manuallyEdited: boolean;
    mismatch: string[];
  };
  contractId?: string;
}

export interface DepositTermsDoc {
  version: string; // 'HOLD-2026.10-v1'
  amount: number;
  holdHours: number;
  items: { id: string; text: string; source: string }[]; // source = "legal/02 Điều 6.1" …
  houseRules: { id: string; title: string; body: string; source: string }[];
  consentLabel: string;
}

export interface EkycScanResult {
  scanId: string; // ràng với booking, hết hạn 15 phút
  fields: {
    fullName: string;
    idNumber: string;
    dob: string; /* DD/MM/YYYY */
    issuedDate: string; /* DD/MM/YYYY */
    address: string;
  };
  confidence: Record<keyof EkycScanResult['fields'], number>;
  lowConfidenceKeys: string[]; // confidence < 0.85 ⇒ khách phải xác nhận/nhập tay
  faceMatch: number;
}

export interface SubmitEkycDto {
  scanId: string;
  consentVersion: string;
  fields: EkycScanResult['fields']; // đã xác nhận / sửa tay
  confirmedLowConfidence: boolean; // bắt buộc true nếu lowConfidenceKeys ≠ ∅
  confirmedNameMismatch?: boolean; // bắt buộc true nếu fullName ≠ contactName (bỏ dấu, hoa)
  lease: {
    startDate: string; /* YYYY-MM-DD */
    months: number;
    paymentCycle: 1 | 3 | 6;
  };
}

export interface TenantContract {
  id: string;
  contractNumber: string;
  bookingRef: string;
  unit: TenantUnit;
  status: 'active' | 'expiring' | 'ended'; // dẫn xuất từ endDate (≤ 30 ngày ⇒ expiring)
  establishedAt: string;
  startDate: string;
  endDate: string;
  months: number;
  paymentCycle: 1 | 3 | 6;
  monthlyRent: number;
  securityDeposit: number;
  convertedHolding: number;
  firstPaymentDue: {
    rent: number;
    depositTopUp: number;
    total: number;
    transferContent: string;
  };
  pdf: {
    ready: boolean;
    sha256?: string;
    sizeBytes?: number;
  };
}
