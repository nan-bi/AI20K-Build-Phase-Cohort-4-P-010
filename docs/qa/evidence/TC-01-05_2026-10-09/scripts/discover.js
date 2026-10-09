// CHỈ ĐỌC DB: lấy ID phục vụ TC-01..05. Chạy: node discover.js (cwd bất kỳ).
const path = require('path');
const BACKEND = 'D:/P-010/backend';
require(path.join(BACKEND, 'node_modules/dotenv')).config({ path: path.join(BACKEND, '.env') });
const { PrismaClient } = require(path.join(BACKEND, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

const DEMO = ['admin@vinstay.vn', 'host.oceanpark@vinstay.vn', 'chunha.oceanpark@vinstay.vn', 'khachthue.demo@vinstay.vn'];

(async () => {
  const profiles = await prisma.profile.findMany({
    where: { email: { in: DEMO } },
    select: { id: true, email: true, isPhoneVerified: true, phoneHash: true, role: { select: { code: true } } },
  });
  const out = { profiles: profiles.map((p) => ({ id: p.id, email: p.email, role: p.role.code, isPhoneVerified: p.isPhoneVerified, hasPhone: !!p.phoneHash })) };
  const byEmail = Object.fromEntries(profiles.map((p) => [p.email, p]));

  const host = await prisma.fieldHost.findUnique({ where: { profileId: byEmail['host.oceanpark@vinstay.vn']?.id ?? '00000000-0000-0000-0000-000000000000' } });
  out.host = host && { id: host.id, assignedZone: host.assignedZone, roles: host.roles };

  const landlordId = byEmail['chunha.oceanpark@vinstay.vn']?.id;
  out.landlordUnits = await prisma.unit.findMany({
    where: { landlordId },
    select: { id: true, unitCode: true, status: true, isVerified: true, building: { select: { buildingCode: true, zoneName: true } } },
    take: 20,
  });
  out.otherLandlordUnit = await prisma.unit.findFirst({ where: { landlordId: { not: landlordId } }, select: { id: true, unitCode: true, landlordId: true } });

  const tenantId = byEmail['khachthue.demo@vinstay.vn']?.id;
  out.tenantViewings = await prisma.viewing.findMany({ where: { tenantId }, select: { id: true, bookingRefCode: true, status: true, viewingSlot: true }, orderBy: { createdAt: 'desc' }, take: 10 });
  out.otherTenantViewing = await prisma.viewing.findFirst({ where: { tenantId: { not: tenantId } }, select: { bookingRefCode: true, tenantId: true } });
  out.otherHostViewing = await prisma.viewing.findFirst({
    where: { tickets: { some: { hostId: { not: host?.id ?? undefined }, NOT: { hostId: null } } }, NOT: { tickets: { some: { hostId: host?.id } } } },
    select: { bookingRefCode: true },
  });
  out.contractNotTenant = await prisma.contract.findFirst({ where: { tenantId: { not: tenantId } }, select: { id: true, tenantId: true } });
  out.signedDocument = await prisma.signedDocument.findFirst({ select: { id: true } });
  out.contractWithDoc = await prisma.contract.findFirst({ where: { NOT: { documentId: null } }, select: { id: true, documentId: true } });
  out.counts = {
    viewings: await prisma.viewing.count(),
    dispatchTickets: await prisma.dispatchTicket.count(),
    otpCodes: await prisma.otpCode.count(),
  };
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
