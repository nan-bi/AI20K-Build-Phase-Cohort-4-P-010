import { AuditService } from '../../audit/audit.service';
import { PhoneService } from '../../auth/phone/phone.service';
import { fakeConfig } from '../../auth/testing/fake-config';
import { DoorCodeService } from '../../door/door-code.service';
import type { HostActor } from '../../host-viewings/host-viewings.types';
import { ConsignmentMetaStore } from '../../landlord/consignment-meta.store';
import { ConsignmentMeta, InspectionPhoto, PhotoSlot, withConsignmentMeta } from '../../landlord/landlord.mappers';
import { INSPECTION_CATALOG } from '../inspection.catalog';
import { InspectionFlowService } from '../inspection-flow.service';
import { InspectionPhotoService } from '../inspection-photo.service';
import { InspectionQueryService } from '../inspection-query.service';
import type { SubmitInspectionInput } from '../inspection.types';
import { ListingMediaService } from '../listing-media.service';
import { ListingPublisher } from '../listing-publisher.service';
import { FakeInspectionDb } from './fake-db';

export const NOW = new Date('2026-10-06T01:00:00Z');
export const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
export const PIN = '482910';
export const ZONE = 'The Sapphire 1';

/** Dựng service thật trên FakeInspectionDb + Storage giả. */
export function buildWorld() {
  const db = new FakeInspectionDb();
  const prisma = db.prisma as any;
  const phones = new PhoneService(fakeConfig({ AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!', NODE_ENV: 'test' }));
  const storage = {
    signedUrls: jest.fn(async (paths: string[]) => new Map<string, string | null>(paths.map((p) => [p, `https://signed.test/${p}`]))),
    uploadAt: jest.fn(async (path: string) => path),
    remove: jest.fn(async (_paths: string[]) => undefined),
    download: jest.fn(async (_path: string): Promise<Buffer | null> => Buffer.from('img-bytes')),
  };
  const doors = new DoorCodeService(prisma, phones);
  const store = new ConsignmentMetaStore(prisma);
  const query = new InspectionQueryService(prisma, storage as any, doors);
  const publisher = new ListingPublisher(doors);
  const flow = new InspectionFlowService(store, query, doors, publisher, new AuditService(prisma));
  const photos = new InspectionPhotoService(prisma, store, storage as any);
  const media = new ListingMediaService(prisma, storage as any);

  let n = 0;
  const w = {
    db, prisma, phones, storage, doors, store, query, publisher, flow, photos, media,

    addInspector(name: string, o: { zone?: string; roles?: string[] } = {}) {
      n += 1;
      const host = {
        id: `host-${name}`, profileId: `prof-${name}`, assignedZone: o.zone ?? ZONE, roles: o.roles ?? ['INSPECTOR'],
        dutyStatus: 'ONLINE_AVAILABLE', rating: 5, createdAt: new Date(2026, 0, n), profile: { fullName: `Thẩm định ${name}` },
      };
      db.hosts.push(host);
      return host;
    },

    actor(host: { id: string; profileId: string; assignedZone: string }): HostActor {
      return { hostId: host.id, profileId: host.profileId, assignedZone: host.assignedZone, rating: 5, dutyStatus: 'ONLINE_AVAILABLE' as any };
    },

    /** Một hồ sơ ký gửi (unit UNLISTED + mandate PENDING_INSPECTION) ở stage cho trước. */
    addCase(o: {
      stage?: ConsignmentMeta['stage']; hostId?: string; offeredAt?: Date; signedAt?: Date; lock?: 'ELECTRONIC_PIN' | 'PHYSICAL_KEY';
      pin?: string | null; landlordId?: string; furnished?: boolean | null; askRent?: number; suggestedDeposit?: number; areaM2?: number; photos?: InspectionPhoto[]; name?: string;
    } = {}) {
      n += 1;
      const lock = o.lock ?? 'ELECTRONIC_PIN';
      const unit = {
        id: `unit-${n}`, unitCode: `VHOP-S1.02-${10 + n}08`, floorNumber: 10 + n, layoutType: 'ONE_BED_PLUS', carpetAreaM2: o.areaM2 ?? 47,
        baseRentPrice: 6_500_000, marketAvgPrice: 6_500_000, securityDeposit: null, bathrooms: 1, direction: null, managementFee: 446_500,
        landlordId: o.landlordId ?? 'landlord-1', highlights: [], doorLockType: lock, status: 'UNLISTED', isVerified: false, verifiedAt: null,
        furnishing: 'FULL', doorNumber: null,
        building: { buildingCode: 'S1.02', zoneName: ZONE }, landlord: { fullName: o.name ?? 'Nguyễn Thị Mai' },
      };
      db.units.push(unit);
      if (o.pin !== null) {
        db.doorKeys.push({
          unitId: unit.id, keyType: lock, status: 'ACTIVE', physicalKeyState: lock === 'PHYSICAL_KEY' ? 'AT_DESK' : null, physicalKeyHolderId: null,
          vaultSecretRef: lock === 'ELECTRONIC_PIN' ? `aes:${phones.encrypt(o.pin ?? PIN)}` : null,
        });
      }
      const signedAt = o.signedAt ?? hoursAgo(1);
      const meta: ConsignmentMeta = {
        form: {
          building: 'S1.02', floor: unit.floorNumber, door: '08', areaM2: o.areaM2 ?? 47, askRent: o.askRent ?? 6_500_000, suggestedDeposit: o.suggestedDeposit ?? 6_500_000,
          leaseTerm: 'long', furnished: o.furnished ?? true, locks: [lock === 'PHYSICAL_KEY' ? 'physical' : 'smart'], note: null,
        },
        stage: o.stage ?? 'awaiting_host',
        inspectDueAt: new Date(signedAt.getTime() + 48 * 3_600_000).toISOString(),
        ...(o.hostId ? { hostId: o.hostId, offeredAt: (o.offeredAt ?? signedAt).toISOString() } : {}),
        ...(o.photos ? { inspection: { photos: o.photos } } : {}),
      };
      const mandate = {
        id: `00000000-0000-4000-8000-${String(100000 + n).padStart(12, '0')}`, unitId: unit.id, contractNumber: `UQ-${n}`,
        status: 'PENDING_INSPECTION', signedAt, validUntil: null, createdAt: signedAt,
        doorAccessConfig: withConsignmentMeta(null, meta),
      };
      db.mandates.push(mandate);
      return { mandate, unit };
    },

    // Giao dịch hoàn tác thay hàng bằng bản sao ⇒ luôn tra lại theo id, đừng giữ tham chiếu cũ.
    mandateRow: (m: { id: string }): any => db.mandates.find((x) => x.id === m.id),
    unitRow: (u: { id: string }): any => db.units.find((x) => x.id === u.id),
    metaOf: (mandate: { id: string }): ConsignmentMeta => db.mandates.find((x) => x.id === mandate.id)!.doorAccessConfig.consignment,
  };
  return w;
}

export type World = ReturnType<typeof buildWorld>;

export function photo(slot: PhotoSlot, hostId: string, over: Partial<InspectionPhoto> = {}): InspectionPhoto {
  const id = over.id ?? `00000000-0000-4000-9000-${String(Math.floor(Math.random() * 1e11)).padStart(12, '0')}`;
  return {
    id, path: `inspections/m/${id}.jpg`, slot, ...(slot === 'listing' ? { room: 'living_room' as const } : {}), mime: 'image/jpeg', size: 90_000,
    width: 800, height: 600, sharpness: 120, brightness: 120, takenAt: null, uploadedAt: '2026-10-06T00:30:00.000Z', hostId, ...over,
  };
}

/** Ảnh đủ cho phiếu hợp lệ: 1 ảnh mỗi dòng catalog + `listing` ảnh niêm yết. */
export function fullPhotos(hostId: string, listing = 4): InspectionPhoto[] {
  return [
    ...INSPECTION_CATALOG.map((c) => photo(c.code as PhotoSlot, hostId)),
    ...Array.from({ length: listing }, () => photo('listing', hostId)),
  ];
}

/** Phiếu hợp lệ (đạt) dựng từ ảnh đã có trong meta. */
export function validInput(photos: InspectionPhoto[], over: Partial<SubmitInspectionInput> = {}): SubmitInspectionInput {
  return {
    declared: (['identity', 'layout', 'areaM2', 'furnishing', 'lock'] as const).map((field) => ({ field, ok: true })),
    inventory: INSPECTION_CATALOG.map((c) => ({
      code: c.code, group: c.group, name: c.name, present: true, qty: 1, condition: 80, liability: c.liability,
      photoIds: photos.filter((p) => p.slot === c.code).map((p) => p.id),
    })),
    functions: { ac: true, kitchen: true, waterHeater: true, drainage: true },
    facts: { areaM2: 47, layout: '1PN', bathrooms: 1, direction: 'Đông Nam', floor: 12 },
    pricing: { rent: 6_500_000, securityDeposit: 6_500_000 },
    listing: { highlights: ['View hồ', 'Nội thất đầy đủ', 'Gần sảnh'] },
    netAreaM2: 44,
    furnishing: 'full',
    listingPhotoIds: photos.filter((p) => p.slot === 'listing').map((p) => p.id),
    recommendation: 'approve',
    ...over,
  };
}
