import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  PrismaClient,
  LayoutType,
  Furnishing,
  Amenity,
  UnitStatus,
  DoorLockType,
  DoorKeyStatus,
  PhysicalKeyState,
  HostDutyStatus,
  MandateStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PhoneService } from '../src/modules/auth/phone/phone.service';

const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  sapphire1: { lat: 20.998412, lng: 105.945281 },
  sapphire2: { lat: 20.996541, lng: 105.942189 },
  zenpark: { lat: 20.9935, lng: 105.947 },
  pavilion: { lat: 20.995, lng: 105.9395 },
  masteri: { lat: 20.992, lng: 105.944 },
};

function mapLayoutType(layout: string, bathrooms: number): LayoutType {
  switch (layout) {
    case 'Studio':
      return LayoutType.STUDIO;
    case '1PN':
      return LayoutType.ONE_BED_PLUS;
    case '2PN':
      return bathrooms >= 2 ? LayoutType.TWO_BED_TWO_BATH : LayoutType.TWO_BED_ONE_BATH;
    case '3PN':
      return LayoutType.THREE_BED;
    default:
      return LayoutType.STUDIO;
  }
}

interface WebCatalog {
  exportedAt: string;
  zones: Array<{
    id: string;
    name: string;
    short: string;
    buildings: string[];
    hostId: string;
  }>;
  landlords: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    since?: string;
  }>;
  hosts: Array<{
    id: string;
    name: string;
    phone: string;
    zones: string[];
    rfid: string;
    status: string;
    rating: number;
  }>;
  units: Array<{
    id: string;
    building: string;
    floor: number;
    door: string;
    layout: string;
    layoutLabel: string;
    bathrooms: number;
    areaM2: number;
    direction?: string;
    view?: string;
    furnishing: string;
    rent: number;
    marketAvg: number;
    baseStatus: string;
    lock: string;
    landlordId: string;
    images: number;
    petFriendly: boolean;
    minMonths: number;
    title: string;
    description: string;
    items: string[];
    zoneId: string;
    code: string;
    verifiedAt?: string;
  }>;
}

export async function seedWebCatalog(options: { dryRun?: boolean } = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  try {
    const catalogPath = path.resolve(__dirname, 'web-catalog.json');
    if (!fs.existsSync(catalogPath)) {
      throw new Error(`Catalog file not found: ${catalogPath}. Run 'npm run catalog:export' first.`);
    }

    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const catalog: WebCatalog = JSON.parse(raw);

    const catalogCodes = catalog.units.map((u) => u.code);

    if (isDryRun) {
      // READ-ONLY DRY-RUN MODE
      const existingBuildings = await prisma.building.findMany({ select: { buildingCode: true } });
      const existingBuildingCodes = new Set(existingBuildings.map((b) => b.buildingCode));
      const allCatalogBuildings = new Set<string>();
      catalog.zones.forEach((z) => z.buildings.forEach((b) => allCatalogBuildings.add(b)));
      const buildingsCreate = Array.from(allCatalogBuildings).filter((b) => !existingBuildingCodes.has(b)).length;

      const existingLandlords = await prisma.profile.findMany({
        where: { email: { in: catalog.landlords.map((l) => l.email) } },
        select: { email: true },
      });
      const existingLandlordEmails = new Set(existingLandlords.map((l) => l.email));
      const landlordsCreate = catalog.landlords.filter((l) => !existingLandlordEmails.has(l.email)).length;

      const hostEmails = catalog.hosts.map((h) => `host.${h.id.toLowerCase()}@vinstay.demo`);
      const existingHosts = await prisma.profile.findMany({
        where: { email: { in: hostEmails } },
        select: { email: true },
      });
      const existingHostEmails = new Set(existingHosts.map((h) => h.email));
      const hostsCreate = hostEmails.filter((e) => !existingHostEmails.has(e)).length;

      const existingFeeConfig = await prisma.feeConfig.findUnique({
        where: { configKey: 'hold_hours_default' },
      });
      const feeConfigCreate = !existingFeeConfig;

      const existingUnits = await prisma.unit.findMany({
        where: { unitCode: { in: catalogCodes } },
        select: { unitCode: true },
      });
      const existingUnitCodes = new Set(existingUnits.map((u) => u.unitCode));

      const createCodes = catalogCodes.filter((c) => !existingUnitCodes.has(c));
      const updateCodes = catalogCodes.filter((c) => existingUnitCodes.has(c));

      const candidatesToHide = await prisma.unit.findMany({
        where: {
          unitCode: { notIn: catalogCodes },
          status: UnitStatus.AVAILABLE,
          isVerified: true,
          media: { none: { url: { startsWith: '/' } } }, // không có ảnh nội bộ: 0 ảnh HOẶC chỉ ảnh stock ngoài (Listing Verified)
        },
        select: { unitCode: true },
      });
      const hideCodes = candidatesToHide.map((c) => c.unitCode);

      const dryRunReport = {
        dryRun: true,
        create: createCodes.length,
        updateListing: updateCodes.length,
        hide: hideCodes.length,
        buildingsCreate,
        landlordsCreate,
        hostsCreate,
        feeConfigCreate,
        codes: {
          create: createCodes,
          updateListing: updateCodes,
          hide: hideCodes,
        },
      };

      console.log(JSON.stringify(dryRunReport, null, 2));
      return dryRunReport;
    }

    // WRITE MODE
    console.log('🌱 Starting seed-web-catalog...');

    // 1. Roles
    const rolesToEnsure = [
      { code: 'tenant', name: 'Khách thuê' },
      { code: 'landlord', name: 'Chủ nhà' },
      { code: 'field_host', name: 'Field Host' },
    ];
    for (const r of rolesToEnsure) {
      await prisma.role.upsert({
        where: { code: r.code },
        update: {},
        create: { code: r.code, name: r.name },
      });
    }

    const landlordRole = await prisma.role.findUniqueOrThrow({ where: { code: 'landlord' } });
    const hostRole = await prisma.role.findUniqueOrThrow({ where: { code: 'field_host' } });

    // 2. Buildings
    const buildingMap: Record<string, string> = {};
    for (const zone of catalog.zones) {
      const baseCoord = ZONE_COORDS[zone.id] ?? { lat: 20.998412, lng: 105.945281 };
      for (let i = 0; i < zone.buildings.length; i++) {
        const bCode = zone.buildings[i];
        const existing = await prisma.building.findUnique({ where: { buildingCode: bCode } });
        if (existing) {
          if (!existing.zoneName) {
            await prisma.building.update({
              where: { id: existing.id },
              data: { zoneName: zone.name },
            });
          }
          buildingMap[bCode] = existing.id;
        } else {
          const created = await prisma.building.create({
            data: {
              buildingCode: bCode,
              zoneName: zone.name,
              totalFloors: 35,
              lobbyLatitude: baseCoord.lat + 0.0003 * i,
              lobbyLongitude: baseCoord.lng + 0.0003 * i,
            },
          });
          buildingMap[bCode] = created.id;
        }
      }
    }

    // 3. Landlords
    const phoneService = new PhoneService(new ConfigService());
    const landlordMap: Record<string, string> = {};
    for (const l of catalog.landlords) {
      let p = await prisma.profile.findUnique({ where: { email: l.email } });
      if (!p) {
        let phoneEnc: string | null = null;
        let phoneHash: string | null = null;
        try {
          const norm = phoneService.normalize(l.phone);
          if (norm) {
            phoneEnc = phoneService.encrypt(norm);
            phoneHash = phoneService.hash(norm);
          }
        } catch (err) {
          console.warn(`[WARN] Phone encryption failed for landlord ${l.email}:`, err);
        }

        p = await prisma.profile.create({
          data: {
            id: randomUUID(),
            fullName: l.name,
            email: l.email,
            roleId: landlordRole.id,
            phoneEnc,
            phoneHash,
            isPhoneVerified: true,
          },
        });
      }
      landlordMap[l.id] = p.id;
    }

    // 4. Hosts
    const zoneMap: Record<string, string> = {};
    catalog.zones.forEach((z) => (zoneMap[z.id] = z.name));

    for (const h of catalog.hosts) {
      const email = `host.${h.id.toLowerCase()}@vinstay.demo`;
      let p = await prisma.profile.findUnique({ where: { email } });
      if (!p) {
        let phoneEnc: string | null = null;
        let phoneHash: string | null = null;
        try {
          const norm = phoneService.normalize(h.phone);
          if (norm) {
            phoneEnc = phoneService.encrypt(norm);
            phoneHash = phoneService.hash(norm);
          }
        } catch (err) {
          console.warn(`[WARN] Phone encryption failed for host ${email}:`, err);
        }

        p = await prisma.profile.create({
          data: {
            id: randomUUID(),
            fullName: h.name,
            email,
            roleId: hostRole.id,
            phoneEnc,
            phoneHash,
            isPhoneVerified: true,
          },
        });
      }

      const assignedZoneName = zoneMap[h.zones[0]] || 'The Sapphire 1';
      const dutyStatus = h.status === 'active' ? HostDutyStatus.ONLINE_AVAILABLE : HostDutyStatus.OFF_DUTY;

      const existingHost = await prisma.fieldHost.findUnique({ where: { profileId: p.id } });
      if (existingHost) {
        await prisma.fieldHost.update({
          where: { profileId: p.id },
          data: {
            assignedZone: assignedZoneName,
            rfidCardNumber: h.rfid,
            dutyStatus,
            rating: h.rating,
          },
        });
      } else {
        await prisma.fieldHost.create({
          data: {
            profileId: p.id,
            assignedZone: assignedZoneName,
            rfidCardNumber: h.rfid,
            dutyStatus,
            rating: h.rating,
          },
        });
      }
    }

    // 5. Units
    let createdUnitsCount = 0;
    let updatedUnitsCount = 0;

    for (const u of catalog.units) {
      const existing = await prisma.unit.findUnique({
        where: { unitCode: u.code },
        include: { media: true },
      });

      const verifiedDate = u.verifiedAt ? new Date(u.verifiedAt) : new Date();

      if (existing) {
        // Căn đã có: CHỈ cập nhật cột nội dung listing
        await prisma.unit.update({
          where: { id: existing.id },
          data: {
            doorNumber: u.door,
            hasExtraRoom: u.layoutLabel.includes('+'),
            bathrooms: u.bathrooms,
            direction: u.direction,
            viewLabel: u.view,
            furnishing: u.furnishing.toUpperCase() as Furnishing,
            amenities: u.items.map((i) => i.toUpperCase()) as Amenity[],
            petFriendly: u.petFriendly,
            minLeaseMonths: u.minMonths,
            title: u.title,
            description: u.description,
            verifiedAt: verifiedDate,
            isVerified: true,
          },
        });
        updatedUnitsCount++;

        // UnitMedia: chỉ thêm nếu căn chưa có media
        if (existing.media.length === 0) {
          for (let n = 1; n <= u.images; n++) {
            await prisma.unitMedia.create({
              data: {
                unitId: existing.id,
                url: `/units/${u.id}/${n}.jpg`,
                order: n,
                category: 'living_room',
                verifiedAt: verifiedDate,
              },
            });
          }
        }
      } else {
        // Căn mới
        const buildingId = buildingMap[u.building];
        if (!buildingId) {
          throw new Error(`Building code ${u.building} not found for unit ${u.code}`);
        }
        const landlordProfileId = landlordMap[u.landlordId];
        if (!landlordProfileId) {
          throw new Error(`Landlord ${u.landlordId} not found for unit ${u.code}`);
        }

        const newUnit = await prisma.unit.create({
          data: {
            unitCode: u.code,
            buildingId,
            landlordId: landlordProfileId,
            floorNumber: u.floor,
            doorNumber: u.door,
            layoutType: mapLayoutType(u.layout, u.bathrooms),
            hasExtraRoom: u.layoutLabel.includes('+'),
            carpetAreaM2: u.areaM2,
            baseRentPrice: u.rent,
            managementFee: Math.round(u.areaM2 * 9500),
            parkingFeeEstimate: 150000,
            utilityCostEstimate: 600000,
            marketAvgPrice: u.marketAvg,
            doorLockType: u.lock === 'smart' ? DoorLockType.ELECTRONIC_PIN : DoorLockType.PHYSICAL_KEY,
            bathrooms: u.bathrooms,
            direction: u.direction,
            viewLabel: u.view,
            furnishing: u.furnishing.toUpperCase() as Furnishing,
            amenities: u.items.map((i) => i.toUpperCase()) as Amenity[],
            petFriendly: u.petFriendly,
            minLeaseMonths: u.minMonths,
            title: u.title,
            description: u.description,
            verifiedAt: verifiedDate,
            isVerified: true,
            status: u.baseStatus.toUpperCase() as UnitStatus,
          },
        });
        createdUnitsCount++;

        // Media
        for (let n = 1; n <= u.images; n++) {
          await prisma.unitMedia.create({
            data: {
              unitId: newUnit.id,
              url: `/units/${u.id}/${n}.jpg`,
              order: n,
              category: 'living_room',
              verifiedAt: verifiedDate,
            },
          });
        }

        // DoorAccessKey
        await prisma.doorAccessKey.create({
          data: {
            unitId: newUnit.id,
            keyType: u.lock === 'smart' ? DoorLockType.ELECTRONIC_PIN : DoorLockType.PHYSICAL_KEY,
            vaultSecretRef: u.lock === 'smart' ? `vault:demo:${u.code}` : null,
            physicalKeyState: u.lock === 'physical' ? PhysicalKeyState.AT_DESK : null,
            status: DoorKeyStatus.ACTIVE,
          },
        });

        // ExclusiveMandate
        const validUntil = new Date(verifiedDate);
        validUntil.setFullYear(validUntil.getFullYear() + 1);

        await prisma.exclusiveMandate.create({
          data: {
            unitId: newUnit.id,
            contractNumber: `UQ-${u.code}`,
            status: MandateStatus.ACTIVE,
            signedAt: verifiedDate,
            validUntil,
          },
        });
      }
    }

    // 6. FeeConfig hold_hours_default
    const feeConfig = await prisma.feeConfig.findUnique({
      where: { configKey: 'hold_hours_default' },
    });
    if (!feeConfig) {
      const admin =
        (await prisma.profile.findFirst({
          where: { role: { code: 'ops_admin' } },
        })) ?? (await prisma.profile.findFirst());

      if (admin) {
        await prisma.feeConfig.create({
          data: {
            configKey: 'hold_hours_default',
            paramValue: 48,
            paramUnit: 'giờ',
            updatedBy: admin.id,
          },
        });
        console.log('👉 FeeConfig hold_hours_default = 48 created.');
      } else {
        console.warn('[WARN] No profile found to set updatedBy for hold_hours_default');
      }
    }

    // 7. Ẩn căn cũ không thuộc catalog web, status AVAILABLE và không có ảnh thực tế nội bộ (0 ảnh hoặc chỉ ảnh stock như Unsplash)
    const candidatesToHide = await prisma.unit.findMany({
      where: {
        unitCode: { notIn: catalogCodes },
        status: UnitStatus.AVAILABLE,
        isVerified: true,
        media: { none: { url: { startsWith: '/' } } }, // không có ảnh nội bộ: 0 ảnh HOẶC chỉ ảnh stock ngoài (Listing Verified)
      },
      select: { id: true, unitCode: true },
    });

    for (const c of candidatesToHide) {
      await prisma.unit.update({
        where: { id: c.id },
        data: { isVerified: false },
      });
    }

    console.log(
      `✅ Seed completed: ${createdUnitsCount} units created, ${updatedUnitsCount} units updated, ${candidatesToHide.length} units hidden. Total catalog: ${catalog.units.length} units.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedWebCatalog().catch((e) => {
    console.error('❌ seedWebCatalog error:', e);
    process.exit(1);
  });
}
