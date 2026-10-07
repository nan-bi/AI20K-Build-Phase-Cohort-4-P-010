import { holdingDepositAmount } from '../deposit/deposit-amount';
import { ViewingStatus, LayoutType } from '@prisma/client';
import { INSPECTION_GROUPS } from '../inspection/inspection.catalog';
import { BookingStatusWeb, UnitInventoryLine, TenantBooking, TenantContract, TenantUnit } from './tenant.types';
import { getVietQrPaymentDetails } from '../deposit/vietqr';

export const ZONE_BUILDINGS: Record<string, string[]> = {
  sapphire1: ['S1.01', 'S1.02', 'S1.03', 'S1.05', 'S1.08', 'S1.09', 'S1.10', 'S1.12'],
  sapphire2: ['S2.01', 'S2.02', 'S2.05', 'S2.07', 'S2.09', 'S2.12', 'S2.16', 'S2.18', 'S2.19'],
  zenpark: ['ZR1', 'ZR2', 'R1.02'],
  pavilion: ['P3', 'P4', 'BE3'],
  masteri: ['H1', 'H2', 'M2', 'M3'],
};

export function statusToWeb(status: ViewingStatus): BookingStatusWeb {
  switch (status) {
    case ViewingStatus.PENDING_CONFIRMATION:
      return 'pending';
    case ViewingStatus.CONFIRMED:
      return 'confirmed';
    case ViewingStatus.LOBBY:
      return 'lobby';
    case ViewingStatus.RECEIVING:
      return 'receiving';
    case ViewingStatus.VIEWING:
      return 'viewing';
    case ViewingStatus.CLOSING:
      return 'closing';
    case ViewingStatus.HOLDING:
      return 'holding';
    case ViewingStatus.LEASED:
      return 'leased';
    case ViewingStatus.COMPLETED:
      return 'completed';
    case ViewingStatus.NO_SHOW:
      return 'no_show';
    case ViewingStatus.CANCELLED:
      return 'cancelled';
    case ViewingStatus.REJECTED:
      return 'rejected';
    default:
      return 'pending';
  }
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '090 ••• ••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
  }
  return '••••••••••';
}

export function layoutTypeToKind(layout: LayoutType): 'Studio' | '1PN' | '2PN' | '3PN' {
  switch (layout) {
    case LayoutType.STUDIO:
      return 'Studio';
    case LayoutType.ONE_BED_PLUS:
      return '1PN';
    case LayoutType.TWO_BED_ONE_BATH:
    case LayoutType.TWO_BED_TWO_BATH:
      return '2PN';
    case LayoutType.THREE_BED:
      return '3PN';
    default:
      return 'Studio';
  }
}

export function bedroomsFromLayout(layout: LayoutType): number {
  switch (layout) {
    case LayoutType.STUDIO:
      return 0;
    case LayoutType.ONE_BED_PLUS:
      return 1;
    case LayoutType.TWO_BED_ONE_BATH:
    case LayoutType.TWO_BED_TWO_BATH:
      return 2;
    case LayoutType.THREE_BED:
      return 3;
    default:
      return 0;
  }
}

export function toTenantUnit(
  unit: any,
  activeViewingAt?: string | null,
  holdHours?: number,
  interest24h?: number,
): TenantUnit {
  if (!unit) {
    return {
      code: '',
      building: '',
      floor: 0,
      door: '',
      layout: 'Studio',
      layoutLabel: 'Studio',
      bedrooms: 0,
      bathrooms: 1,
      areaM2: 0,
      direction: null,
      view: null,
      furnishing: 'full',
      items: [],
      rent: 0,
      marketAvg: 0,
      managementFee: 0,
      parkingFeeEstimate: 0,
      utilityCostEstimate: 0,
      status: 'available',
      lock: 'smart',
      photos: [],
      interest24h: 0,
      petFriendly: false,
      minMonths: 6,
      verifiedAt: new Date().toISOString(),
      title: '',
      description: '',
      holdHours: 48,
      activeViewingAt: null,
      securityDeposit: 0,
      holdingDeposit: holdingDepositAmount(),
      highlights: [],
      inventory: [],
    };
  }
  const kind = layoutTypeToKind(unit.layoutType);
  const layoutLabel =
    unit.layoutType === LayoutType.ONE_BED_PLUS
      ? '1PN+'
      : unit.hasExtraRoom
        ? `${kind}+`
        : kind;

  const mediaList = unit.media || [];
  const sortedPhotos = [...mediaList]
    .sort((a, b) => a.order - b.order)
    .map((m) => m.url)
    .filter((url) => url.startsWith('/')); // ảnh stock ngoài (Unsplash…) không đi ra catalog khách thuê

  return {
    id: unit.id,
    code: unit.unitCode,
    building: unit.building?.buildingCode ?? '',
    zoneName: unit.building?.zoneName ?? '',
    floor: unit.floorNumber,
    door: unit.doorNumber ?? unit.unitCode.slice(-2),
    layout: kind,
    layoutLabel,
    bedrooms: bedroomsFromLayout(unit.layoutType),
    bathrooms: unit.bathrooms ?? 1,
    areaM2: Number(unit.carpetAreaM2),
    direction: unit.direction ?? null,
    view: unit.viewLabel ?? null,
    furnishing: (unit.furnishing?.toLowerCase() ?? 'full') as 'full' | 'basic' | 'empty',
    items: (unit.amenities ?? []).map((a: string) => a.toLowerCase()),
    rent: Number(unit.baseRentPrice),
    marketAvg: Number(unit.marketAvgPrice),
    managementFee: Number(unit.managementFee),
    parkingFeeEstimate: Number(unit.parkingFeeEstimate),
    utilityCostEstimate: Number(unit.utilityCostEstimate),
    status: (unit.status?.toLowerCase() ?? 'available') as 'available' | 'holding' | 'rented',
    lock: unit.doorLockType === 'ELECTRONIC_PIN' ? 'smart' : 'physical',
    photos: sortedPhotos,
    interest24h: interest24h ?? unit.interest24h ?? 0,
    petFriendly: unit.petFriendly ?? false,
    minMonths: unit.minLeaseMonths ?? 6,
    verifiedAt: unit.verifiedAt
      ? new Date(unit.verifiedAt).toISOString()
      : unit.updatedAt
        ? new Date(unit.updatedAt).toISOString()
        : '',
    title: unit.title ?? '',
    description: unit.description ?? '',
    holdHours: holdHours ?? unit.holdHoursOverride ?? 48,
    activeViewingAt: activeViewingAt ?? null,
    securityDeposit: unit.securityDeposit != null ? Number(unit.securityDeposit) : Number(unit.baseRentPrice),
    holdingDeposit: holdingDepositAmount(unit),
    highlights: Array.isArray(unit.highlights) ? unit.highlights : [],
    inventory: toInventoryLines(unit.inventoryItems),
  };
}

/** Mã số (1…N) theo giá trị; mã X<n> / mã lạ xếp sau, theo thứ tự nhập (sort ổn định) — F9. */
function inventoryOrder(code: unknown): number {
  const c = String(code ?? '');
  if (/^\d+$/.test(c)) return Number(c);
  const x = /^X(\d+)$/i.exec(c);
  return x ? 1e6 + Number(x[1]) : 2e6;
}

/** Chỉ các trường công khai; `condition` công khai dạng conditionPct (độ mới %, chủ tịch 2026-10-07); CẤM compensation/photoIds (B6). */
export function toInventoryLines(items: any[] | undefined | null): UnitInventoryLine[] {
  if (!items?.length) return [];
  return [...items]
    .sort((a, b) => inventoryOrder(a.code) - inventoryOrder(b.code))
    .map((i) => ({
      code: String(i.code),
      group: i.groupCode as UnitInventoryLine['group'],
      groupLabel: (INSPECTION_GROUPS as Record<string, string>)[i.groupCode] ?? i.groupCode,
      name: i.name,
      qty: i.qty ?? 1,
      spec: i.spec ?? null,
      conditionPct: typeof i.condition === 'number' ? i.condition : null,
    }));
}

export function toTenantBooking(
  viewing: any,
  options: {
    activeViewingAt?: string | null;
    holdHours?: number;
    interest24h?: number;
    rawPhone?: string;
  } = {},
): TenantBooking {
  const slotDate = new Date(viewing.viewingSlot);
  const now = Date.now();
  const leadMs = slotDate.getTime() - now;
  const canModify =
    (viewing.status === ViewingStatus.PENDING_CONFIRMATION ||
      viewing.status === ViewingStatus.CONFIRMED) &&
    leadMs >= 2 * 60 * 60 * 1000;

  // Host info from tickets
  const tickets = viewing.tickets || [];
  // Chủ ca = ticket đã nhận (ACCEPTED, hoặc COMPLETED khi ca đã kết thúc — khách vẫn thấy tên Host để đánh giá, A13).
  const ownerTicket = tickets.find((t: any) => t.acceptedAt && (t.status === 'ACCEPTED' || t.status === 'COMPLETED'));
  const acceptedTicket = ownerTicket ?? tickets.find((t: any) => t.status === 'ACCEPTED');
  const latestTicket = tickets[tickets.length - 1];
  let hostInfo: { name: string; rating: number | null } | null = null;
  const targetTicket = acceptedTicket || (latestTicket?.tier === 1 ? latestTicket : null);
  if (targetTicket?.host?.profile) {
    hostInfo = {
      name: targetTicket.host.profile.fullName || 'Chưa cập nhật',
      rating: targetTicket.host.rating == null ? null : Number(targetTicket.host.rating),
    };
  }

  // Deposit mapping
  let depositDto: TenantBooking['deposit'] = undefined;
  if (viewing.deposit) {
    const d = viewing.deposit;
    let outcome: 'awaiting_payment' | 'active' | 'expired' | 'converted' | 'refunded' | 'forfeited' =
      'awaiting_payment';

    if (d.paymentStatus === 'PAID_HOLDING') {
      const expiresAtMs = d.expiresAt ? new Date(d.expiresAt).getTime() : 0;
      outcome = now < expiresAtMs ? 'active' : 'expired';
    } else if (d.paymentStatus === 'CONVERTED_TO_CONTRACT') {
      outcome = 'converted';
    } else if (d.paymentStatus === 'REFUNDED') {
      outcome = 'refunded';
    } else if (d.paymentStatus === 'FORFEITED') {
      outcome = 'forfeited';
    } else {
      outcome = 'awaiting_payment';
    }

    depositDto = {
      amount: holdingDepositAmount(),
      transferContent: d.transferContent || '',
      qrRef: d.vietqrRef,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      termsAcceptedAt: d.termsAcceptedAt ? new Date(d.termsAcceptedAt).toISOString() : new Date().toISOString(),
      termsVersion: d.termsVersion || '',
      paidAt: d.paidAt ? new Date(d.paidAt).toISOString() : undefined,
      holdHours: d.holdHours ?? undefined,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : undefined,
      outcome,
      vietqr: getVietQrPaymentDetails(holdingDepositAmount(), d.transferContent || ''),
    };
  }

  // KYC mapping
  let kycDto: TenantBooking['kyc'] = undefined;
  if (viewing.deposit?.identity) {
    const idn = viewing.deposit.identity;
    kycDto = {
      verifiedAt: idn.verifiedAt ? new Date(idn.verifiedAt).toISOString() : new Date().toISOString(),
      confidenceMin: idn.confidenceScore ? Number(idn.confidenceScore) : 0.95,
      manuallyEdited: idn.manuallyEdited ?? false,
      mismatch: idn.mismatchFields ?? [],
    };
  }

  return {
    ref: viewing.bookingRefCode,
    status: statusToWeb(viewing.status),
    unit: toTenantUnit(
      viewing.unit,
      options.activeViewingAt,
      options.holdHours,
      options.interest24h,
    ),
    slot: slotDate.toISOString(),
    createdAt: viewing.createdAt ? new Date(viewing.createdAt).toISOString() : new Date().toISOString(),
    confirmedAt: viewing.confirmedAt ? new Date(viewing.confirmedAt).toISOString() : undefined,
    reminderSentAt: viewing.reminderSentAt ? new Date(viewing.reminderSentAt).toISOString() : undefined,
    lateRequestedAt: viewing.lateRequestedAt ? new Date(viewing.lateRequestedAt).toISOString() : undefined,
    lobbyAt: viewing.lobbyCheckInAt ? new Date(viewing.lobbyCheckInAt).toISOString() : undefined,
    receivingAt: viewing.receivingAt ? new Date(viewing.receivingAt).toISOString() : undefined,
    viewingAt: viewing.viewingStartedAt ? new Date(viewing.viewingStartedAt).toISOString() : undefined,
    viewEndedAt: viewing.viewEndedAt ? new Date(viewing.viewEndedAt).toISOString() : undefined,
    closedReason: viewing.closedReason ?? viewing.cancelReason ?? undefined,
    rating: viewing.tenantRating ?? undefined,
    rescheduleCount: viewing.rescheduleCount ?? 0,
    contact: {
      name: viewing.contactName || viewing.tenant?.fullName || 'Khách thuê',
      phoneMasked: maskPhone(options.rawPhone),
      persons: viewing.partySize ?? 1,
      note: viewing.tenantNote ?? undefined,
    },
    host: hostInfo,
    canModify,
    deposit: depositDto,
    kyc: kycDto,
    contractId: viewing.deposit?.contract?.id ?? undefined,
  };
}

export function toTenantContract(contract: any): TenantContract {
  const nowMs = Date.now();
  const endMs = new Date(contract.endDate).getTime();
  const diffDays = (endMs - nowMs) / (24 * 3600 * 1000);
  const status: 'active' | 'expiring' | 'ended' =
    nowMs >= endMs ? 'ended' : diffDays <= 30 ? 'expiring' : 'active';

  const monthlyRent = Number(contract.monthlyRentPrice);
  const cycle = (contract.paymentCycleMonths || 1) as 1 | 3 | 6;
  const securityDeposit = Number(contract.securityDepositAmount);
  const rent = monthlyRent * cycle;
  const depositTopUp = Math.max(0, securityDeposit - holdingDepositAmount());
  const total = rent + depositTopUp;
  const transferContent = `VSA ${contract.unit?.unitCode || ''} THANH TOAN TIEN THUE KY 1`;

  const bookingRef =
    contract.holdingDeposit?.viewing?.bookingRefCode ||
    contract.bookingRef ||
    '';

  const startDateStr =
    contract.startDate instanceof Date
      ? contract.startDate.toISOString().split('T')[0]
      : String(contract.startDate).split('T')[0];

  const endDateStr =
    contract.endDate instanceof Date
      ? contract.endDate.toISOString().split('T')[0]
      : String(contract.endDate).split('T')[0];

  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    bookingRef,
    unit: toTenantUnit(contract.unit),
    status,
    establishedAt: contract.signedAt
      ? new Date(contract.signedAt).toISOString()
      : contract.createdAt
        ? new Date(contract.createdAt).toISOString()
        : new Date().toISOString(),
    startDate: startDateStr,
    endDate: endDateStr,
    months: contract.leaseTermMonths,
    paymentCycle: cycle,
    monthlyRent,
    securityDeposit,
    convertedHolding: holdingDepositAmount(),
    firstPaymentDue: {
      rent,
      depositTopUp,
      total,
      transferContent,
    },
    pdf: {
      ready: Boolean(contract.document?.sha256),
      sha256: contract.document?.sha256 || undefined,
      sizeBytes: undefined,
    },
  };
}
