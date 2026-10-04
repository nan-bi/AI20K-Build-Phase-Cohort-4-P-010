import type { BookingStatusWeb } from "@/lib/tenant/types";

/** Hợp đồng dây cổng Sale — bản sao của `backend/src/modules/host-viewings/host-viewings.types.ts` (hồ sơ 15, 01 §5). */
export type HostDuty = "ONLINE_AVAILABLE" | "BUSY_VIEWING" | "OFF_DUTY";
export type TicketTier = "ASSIGNED" | "ZONE_POOL" | "WIDE_POOL";

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
  dutyStatus: HostDuty;
  serverTime: string;
}

export interface HostViewingDetail extends Omit<HostViewingSummary, "tenant" | "unit"> {
  tenant: { name: string; partySize: number; note: string | null; phone: string | null };
  unit: HostUnitView & { lockType: "ELECTRONIC_PIN" | "PHYSICAL_KEY" };
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
  deposit: { status: string; holdExpiresAt: string | null } | null;
  contract: { status: string } | null;
}

export interface DoorAccessView {
  type: "ELECTRONIC_PIN" | "PHYSICAL_KEY";
  pin: string | null;
  expiresAt: string;
  instructions: string;
}
