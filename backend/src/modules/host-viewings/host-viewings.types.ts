import type { DepositStatus, ContractStatus, HostDutyStatus } from '@prisma/client';
import type { BookingStatusWeb } from '../tenant/tenant.types';
import type { TicketTier } from '../dispatch/ticket-tier';

/** Hợp đồng dây cổng Sale (hồ sơ 15, 01-CONTRACTS §5). Web có bản sao ở `apps/web/src/lib/host/types.ts`. */
export interface HostUnitView {
  code: string;
  building: string;
  zone: string;
  floor: number;
  layout: string;
  photo: string | null;
  rent: number;
}

export interface TicketCard {
  ticketId: string;
  tier: TicketTier;
  slaEndsAt: string | null;
  canAccept: boolean;
  canClaim: boolean;
  ref: string;
  slot: string;
  unit: HostUnitView;
  tenant: { name: string; partySize: number; note: string | null; phoneMasked: string; phoneVerified: true };
}

export interface HostViewingSummary {
  ref: string;
  slot: string;
  status: BookingStatusWeb;
  unit: HostUnitView;
  tenant: { name: string; partySize: number };
  receivingAt: string | null;
  viewEndedAt: string | null;
  closedReason: string | null;
}

export interface HostBoard {
  requests: TicketCard[];
  schedule: HostViewingSummary[];
  history: HostViewingSummary[];
  lobbyNow: string | null;
  kpis: { pending: number; today: number; avgAcceptSeconds: number | null; rating: number; ratedCount: number };
  dutyStatus: HostDutyStatus;
  serverTime: string;
}

export interface HostViewingDetail extends Omit<HostViewingSummary, 'tenant' | 'unit'> {
  tenant: { name: string; partySize: number; note: string | null; phone: string | null };
  unit: HostUnitView & { lockType: 'ELECTRONIC_PIN' | 'PHYSICAL_KEY' };
  timeline: {
    lobbyCheckInAt: string | null;
    confirmedAt: string | null;
    reminderSentAt: string | null;
    lateRequestedAt: string | null;
    receivingAt: string | null;
    viewingStartedAt: string | null;
    viewEndedAt: string | null;
    completedAt: string | null;
  };
  canRemind: boolean;
  canNoShow: boolean;
  doorRevealedAt: string | null;
  deposit: { status: DepositStatus; holdExpiresAt: string | null } | null;
  contract: { status: ContractStatus } | null;
}

export interface DoorAccessView {
  type: 'ELECTRONIC_PIN' | 'PHYSICAL_KEY';
  pin: string | null;
  expiresAt: string;
  instructions: string;
}

/** Host đang thao tác — dựng 1 lần từ `request.user` + `field_hosts`. */
export interface HostActor {
  hostId: string;
  profileId: string;
  assignedZone: string;
  rating: number;
  dutyStatus: HostDutyStatus;
}

/** Ngữ cảnh request ghi vào AuditLog. */
export interface ReqCtx {
  ipAddress?: string;
  userAgent?: string;
}
