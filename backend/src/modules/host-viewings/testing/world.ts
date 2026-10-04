import { PhoneService } from '../../auth/phone/phone.service';
import { fakeConfig } from '../../auth/testing/fake-config';
import { DispatchAssignerService } from '../../dispatch/dispatch-assigner.service';
import { DoorCodeService } from '../../door/door-code.service';
import { HostActorService } from '../host-actor.service';
import { HostBoardService } from '../host-board.service';
import { ViewingFlowService } from '../viewing-flow.service';
import { FakeDb } from './fake-db';

export const NOW = new Date('2026-10-06T01:00:00Z'); // 08:00 giờ VN
export const min = (n: number) => new Date(NOW.getTime() + n * 60_000);
export const sec = (n: number) => new Date(NOW.getTime() + n * 1000);
export const PIN = '482910';
export const TENANT_PHONE = '+84912345678';

/** Dựng toàn bộ service thật trên FakeDb. */
export function buildWorld() {
  const db = new FakeDb();
  const prisma = db.prisma as any;
  const phones = new PhoneService(fakeConfig({ AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!', NODE_ENV: 'test' }));
  const assigner = new DispatchAssignerService(prisma);
  const doors = new DoorCodeService(prisma, phones);
  const flow = new ViewingFlowService(prisma, phones, assigner, doors);
  const board = new HostBoardService(prisma, phones);
  const actors = new HostActorService(prisma);

  let n = 0;
  const w = {
    db, prisma, phones, assigner, doors, flow, board, actors,

    addHost(name: string, o: { zone?: string; roles?: string[]; duty?: string; active?: boolean; rating?: number } = {}) {
      n += 1;
      const host = {
        id: `host-${name}`,
        profileId: `prof-${name}`,
        assignedZone: o.zone ?? 'The Sapphire 1',
        roles: o.roles ?? ['SALE'],
        dutyStatus: o.duty ?? 'ONLINE_AVAILABLE',
        rating: o.rating ?? 5,
        createdAt: new Date(2026, 0, n),
        profile: { fullName: `Sale ${name}`, isActive: o.active ?? true },
      };
      db.hosts.push(host);
      return host;
    },

    addUnit(code: string, o: { lock?: 'ELECTRONIC_PIN' | 'PHYSICAL_KEY'; ref?: string | null; zone?: string } = {}) {
      const lock = o.lock ?? 'ELECTRONIC_PIN';
      const unit = {
        id: `unit-${code}`,
        unitCode: code,
        floorNumber: 12,
        layoutType: 'ONE_BED_PLUS',
        baseRentPrice: 6_500_000,
        doorLockType: lock,
        building: { buildingCode: 'S1.02', zoneName: o.zone ?? 'The Sapphire 1' },
        media: [{ url: '/units/a.jpg', order: 0 }],
      };
      db.units.push(unit);
      const ref = o.ref === undefined ? (lock === 'ELECTRONIC_PIN' ? `aes:${phones.encrypt(PIN)}` : null) : o.ref;
      db.doorKeys.push({
        unitId: unit.id,
        keyType: lock,
        vaultSecretRef: ref,
        status: 'ACTIVE',
        physicalKeyState: lock === 'PHYSICAL_KEY' ? 'AT_DESK' : null,
        physicalKeyHolderId: null,
      });
      return unit;
    },

    addViewing(unit: any, o: { ref?: string; slot?: Date; status?: string; tenantId?: string; extra?: Record<string, unknown> } = {}) {
      n += 1;
      const v = {
        id: `view-${n}`,
        bookingRefCode: o.ref ?? `VS-T${String(n).padStart(4, '0')}`,
        unitId: unit.id,
        tenantId: o.tenantId ?? 'tenant-1',
        contactName: 'Nguyễn Văn Thuê',
        contactPhoneEnc: phones.encrypt(TENANT_PHONE),
        partySize: 2,
        tenantNote: 'Đi cùng vợ',
        viewingSlot: o.slot ?? min(120),
        status: o.status ?? 'PENDING_CONFIRMATION',
        closedReason: null,
        lobbyCheckInAt: null,
        confirmedAt: null,
        reminderSentAt: null,
        lateRequestedAt: null,
        receivingAt: null,
        viewingStartedAt: null,
        viewEndedAt: null,
        completedAt: null,
        tenantRating: null,
        ...(o.extra ?? {}),
      };
      db.viewings.push(v);
      return v;
    },

    addTicket(viewing: any, o: { hostId?: string | null; status?: string; offeredAt?: Date; acceptedAt?: Date | null } = {}) {
      const t = {
        id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
        viewingId: viewing.id,
        hostId: o.hostId === undefined ? null : o.hostId,
        tier: o.hostId ? 1 : 2,
        slaSeconds: 180,
        status: o.status ?? 'OFFERED',
        offeredAt: o.offeredAt ?? NOW,
        acceptedAt: o.acceptedAt ?? null,
        rejectReason: null,
        closedAt: null,
      };
      db.tickets.push(t);
      return t;
    },

    actor: (host: any) => actors.resolve(host.profileId),
    viewing: (id: string) => db.viewings.find((v) => v.id === id)!,
    audits: (action: string) => db.audits.filter((a) => a.actionType === action),
  };
  return w;
}

/** Bắt mã lỗi nghiệp vụ (`code`) của HttpException. */
export async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (e: any) {
    return e?.response?.code ?? `other:${e?.message}`;
  }
}
