import { DepositStatus } from '@prisma/client';
import type { PhoneService } from '../auth/phone/phone.service';
import { decryptPhoneForDisplay } from '../auth/phone/phone-display';
import { DOOR_CODE_TTL_MIN, NO_SHOW_GRACE_MIN, REMINDER_LEAD_MIN } from '../dispatch/dispatch.constants';
import { slaEndsAt, TicketTier } from '../dispatch/ticket-tier';
import { layoutTypeToKind, statusToWeb } from '../tenant/tenant.mappers';
import type { DoorRead } from '../door/door-code.service';
import type { DoorAccessView, HostUnitView, HostViewingDetail, HostViewingSummary, TicketCard } from './host-viewings.types';

/** Include chung cho mọi truy vấn cần hiển thị căn. */
export const UNIT_INCLUDE = { building: true, media: { orderBy: { order: 'asc' as const }, take: 1 } };

const iso = (d: Date | null | undefined): string | null => (d ? new Date(d).toISOString() : null);

/** B4: trước khi nhận chỉ thấy `09•• ••• 678`. */
export function maskHostPhone(local: string | null): string {
  const digits = (local ?? '').replace(/\D/g, '');
  if (digits.length < 9) return '•••• ••• •••';
  return `${digits.slice(0, 2)}•• ••• ${digits.slice(-3)}`;
}

export function toHostUnit(unit: any): HostUnitView {
  return {
    code: unit.unitCode,
    building: unit.building?.buildingCode ?? '',
    zone: unit.building?.zoneName ?? '',
    floor: unit.floorNumber,
    layout: layoutTypeToKind(unit.layoutType),
    photo: unit.media?.[0]?.url ?? null,
    rent: Number(unit.baseRentPrice),
  };
}

export function toTicketCard(
  ticket: any,
  tier: TicketTier,
  flags: { canAccept: boolean; canClaim: boolean },
  phones: PhoneService,
): TicketCard {
  const v = ticket.viewing;
  return {
    ticketId: ticket.id,
    tier,
    slaEndsAt: tier === 'ASSIGNED' ? slaEndsAt(ticket.offeredAt).toISOString() : null,
    canAccept: flags.canAccept,
    canClaim: flags.canClaim,
    ref: v.bookingRefCode,
    slot: new Date(v.viewingSlot).toISOString(),
    unit: toHostUnit(v.unit),
    tenant: {
      name: v.contactName || 'Khách thuê',
      partySize: v.partySize ?? 1,
      note: v.tenantNote ?? null,
      phoneMasked: maskHostPhone(decryptPhoneForDisplay(phones, v.contactPhoneEnc)),
      phoneVerified: true,
    },
  };
}

export function toSummary(v: any): HostViewingSummary {
  return {
    ref: v.bookingRefCode,
    slot: new Date(v.viewingSlot).toISOString(),
    status: statusToWeb(v.status),
    unit: toHostUnit(v.unit),
    tenant: { name: v.contactName || 'Khách thuê', partySize: v.partySize ?? 1 },
    receivingAt: iso(v.receivingAt),
    viewEndedAt: iso(v.viewEndedAt),
    closedReason: v.closedReason ?? null,
  };
}

export function toDetail(v: any, phones: PhoneService, doorRevealedAt: Date | null, now: Date): HostViewingDetail {
  const slotMs = new Date(v.viewingSlot).getTime();
  const nowMs = now.getTime();
  const summary = toSummary(v);
  return {
    ...summary,
    tenant: {
      name: summary.tenant.name,
      partySize: summary.tenant.partySize,
      note: v.tenantNote ?? null,
      phone: decryptPhoneForDisplay(phones, v.contactPhoneEnc), // B4: đã là chủ ca
    },
    unit: { ...summary.unit, lockType: v.unit.doorLockType === 'PHYSICAL_KEY' ? 'PHYSICAL_KEY' : 'ELECTRONIC_PIN' },
    timeline: {
      lobbyCheckInAt: iso(v.lobbyCheckInAt),
      confirmedAt: iso(v.confirmedAt),
      reminderSentAt: iso(v.reminderSentAt),
      lateRequestedAt: iso(v.lateRequestedAt),
      receivingAt: iso(v.receivingAt),
      viewingStartedAt: iso(v.viewingStartedAt),
      viewEndedAt: iso(v.viewEndedAt),
      completedAt: iso(v.completedAt),
    },
    canRemind: v.status === 'CONFIRMED' && nowMs >= slotMs - REMINDER_LEAD_MIN * 60_000,
    canNoShow: (v.status === 'CONFIRMED' || v.status === 'LOBBY') && nowMs >= slotMs + NO_SHOW_GRACE_MIN * 60_000,
    doorRevealedAt: iso(doorRevealedAt),
    deposit: v.deposit
      ? { status: v.deposit.paymentStatus as DepositStatus, holdExpiresAt: iso(v.deposit.expiresAt) }
      : null,
    contract: v.deposit?.contract ? { status: v.deposit.contract.status } : null,
  };
}

export function toDoorView(read: DoorRead, zoneName: string, now: Date): DoorAccessView {
  const expiresAt = new Date(now.getTime() + DOOR_CODE_TTL_MIN * 60_000).toISOString();
  if (read.type === 'ELECTRONIC_PIN') {
    return { type: 'ELECTRONIC_PIN', pin: read.pin, expiresAt, instructions: 'Nhập mã rồi bấm #.' };
  }
  return {
    type: 'PHYSICAL_KEY',
    pin: null,
    expiresAt,
    instructions: `Nhận chìa tại quầy phân khu ${zoneName}, trả lại sau ca.`,
  };
}
