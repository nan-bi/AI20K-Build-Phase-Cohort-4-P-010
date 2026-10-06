import type { TenantBooking, TenantUnit } from "./types";
import { zoneOfName, type ItemKey, type Unit } from "@/lib/units";

export type UnitWithExtras = Unit & {
  photos: string[];
  holdHours: number;
  activeViewingAt: string | null;
};

export function toUnit(dto: TenantUnit): UnitWithExtras {
  const zone = zoneOfName(dto.zoneName);
  const photos = dto.photos && dto.photos.length > 0 ? dto.photos : [];
  return {
    id: dto.code,
    code: dto.code,
    building: dto.building,
    zoneId: zone?.id,
    zoneName: dto.zoneName?.trim() || zone?.name || undefined,
    floor: dto.floor,
    door: dto.door,
    layout: dto.layout,
    layoutLabel: dto.layoutLabel,
    bedrooms: dto.bedrooms,
    bathrooms: dto.bathrooms,
    areaM2: dto.areaM2,
    managementFee: dto.managementFee,
    parkingFeeEstimate: dto.parkingFeeEstimate,
    utilityCostEstimate: dto.utilityCostEstimate,
    direction: dto.direction ?? "Chưa cập nhật",
    view: dto.view ?? "Chưa cập nhật",
    furnishing: dto.furnishing,
    rent: dto.rent,
    marketAvg: dto.marketAvg,
    baseStatus: dto.status,
    lock: dto.lock,
    images: photos.length,
    photos,
    interest24h: dto.interest24h,
    petFriendly: dto.petFriendly,
    minMonths: dto.minMonths,
    verifiedAt: dto.verifiedAt,
    title: dto.title,
    description: dto.description,
    items: (dto.items || []) as ItemKey[],
    holdHours: dto.holdHours ?? 48,
    activeViewingAt: dto.activeViewingAt ?? null,
  };
}

export interface TenantBookingView {
  ref: string;
  status: TenantBooking["status"];
  unit: UnitWithExtras;
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
  canModify: boolean;
  deposit?: TenantBooking["deposit"];
  kyc?: TenantBooking["kyc"];
  contractId?: string;
}

export function toBookingView(dto: TenantBooking): TenantBookingView {
  return {
    ...dto,
    unit: toUnit(dto.unit),
  };
}

export const OPEN_BOOKING_STATUSES: TenantBooking["status"][] = [
  "pending",
  "confirmed",
  "lobby",
  "receiving",
  "viewing",
  "closing",
];

export function isUpcomingBooking(b: TenantBooking): boolean {
  return OPEN_BOOKING_STATUSES.includes(b.status) || b.status === "holding";
}

export function splitTenantBookings(bookings: TenantBooking[]): {
  upcoming: TenantBooking[];
  past: TenantBooking[];
} {
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.slot).getTime() - new Date(a.slot).getTime(),
  );
  return {
    upcoming: sorted.filter(isUpcomingBooking),
    past: sorted.filter((b) => !isUpcomingBooking(b)),
  };
}

export interface TimelineStep {
  key: string;
  label: string;
  at?: string;
  hint: string;
  done: boolean;
  current?: boolean;
}

export function buildTimeline(b: TenantBookingView | TenantBooking): TimelineStep[] {
  const status = b.status;
  const rank: Record<TenantBooking["status"], number> = {
    pending: 1,
    confirmed: 2,
    lobby: 3,
    receiving: 4,
    viewing: 5,
    closing: 6,
    holding: 7,
    leased: 8,
    completed: 9,
    no_show: -1,
    cancelled: -1,
    rejected: -1,
  };

  const currentRank = rank[status] ?? 0;

  return [
    {
      key: "created",
      label: "Đặt lịch xem phòng",
      at: b.createdAt,
      hint: "Hệ thống tiếp nhận và phân bổ Field Host",
      done: true,
      current: status === "pending",
    },
    {
      key: "confirmed",
      label: "Host tiếp nhận & chuẩn bị",
      at: b.confirmedAt,
      hint: "Host chuẩn bị thẻ cư dân thang máy tại phân khu",
      done: currentRank >= 2,
      current: status === "confirmed",
    },
    {
      key: "lobby",
      label: "Đón tại sảnh căn hộ",
      at: b.lobbyAt,
      hint: "Khách bấm [Tôi đã có mặt tại sảnh], Host quẹt thẻ thang máy",
      done: currentRank >= 3,
      current: status === "lobby",
    },
    {
      key: "viewing",
      label: "Xem phòng thực tế",
      at: b.viewingAt,
      hint: "Host cấp mã cửa, dẫn khách vào kiểm tra căn",
      done: currentRank >= 5,
      current: status === "receiving" || status === "viewing",
    },
    {
      key: "closing",
      label: "Tư vấn & Chốt căn",
      at: b.viewEndedAt,
      hint: "Tư vấn All-in cost và thủ tục đặt cọc giữ căn",
      done: currentRank >= 6,
      current: status === "closing",
    },
    {
      key: "holding",
      label: "Khóa căn giữ chỗ (2.000.000đ)",
      at: b.deposit?.paidAt,
      hint: "Chuyển cọc qua VietQR động, khoá căn độc quyền",
      done: currentRank >= 7,
      current: status === "holding",
    },
    {
      key: "leased",
      label: "Xác minh eKYC & Ký hợp đồng",
      at: b.kyc?.verifiedAt,
      hint: "Bóc tách CCCD, ký điện tử và lập hợp đồng chính thức",
      done: currentRank >= 8,
      current: status === "leased",
    },
  ];
}
