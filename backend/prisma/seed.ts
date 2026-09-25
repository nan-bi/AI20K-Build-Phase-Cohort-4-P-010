// ====================================================================
// VINSTAY AI — DATABASE SEED SCRIPT (PostgreSQL / Supabase)
// Seed initial data for Vinhomes Ocean Park (The Sapphire 1 & 2)
// Aligned with SAD v2.0 & Prototype presentation
// ====================================================================

import { PrismaClient, LayoutType, DoorLockType, UnitStatus, HostDutyStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VinStay AI database seeding...');

  // 1. Roles & Permissions
  console.log('👉 Seeding Roles...');
  const rolesData = [
    { code: 'tenant', name: 'Khách thuê', description: 'Người tìm thuê, đặt cọc và ký hợp đồng' },
    { code: 'landlord', name: 'Chủ nhà', description: 'Chủ hộ ủy quyền ký gửi quản lý độc quyền' },
    { code: 'field_host', name: 'Field Host', description: 'Nhân sự vận hành & sale hiện trường tại phân khu' },
    { code: 'area_lead', name: 'Area Lead', description: 'Trưởng khu vực giám sát điều phối SLA' },
    { code: 'ops_admin', name: 'Ops Admin', description: 'Quản trị viên hệ thống và cấu hình biến phí' },
    { code: 'compliance_officer', name: 'Compliance Officer', description: 'Cán bộ kiểm soát tuân thủ eKYC & hợp đồng' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
    roleMap[r.code] = role.id;
  }

  // 2. Fee Configs (All-in Cost & Dynamic Commission Engine)
  console.log('👉 Seeding Fee Configs...');
  const feeConfigs = [
    { configKey: 'mgmt_fee_per_m2', paramValue: 9500, paramUnit: 'VND/m2' },
    { configKey: 'parking_fee_motorbike', paramValue: 150000, paramUnit: 'VND/tháng' },
    { configKey: 'parking_fee_car', paramValue: 1250000, paramUnit: 'VND/tháng' },
    { configKey: 'utility_per_person', paramValue: 300000, paramUnit: 'VND/người/tháng' },
    { configKey: 'holding_deposit_amount', paramValue: 2000000, paramUnit: 'VND' },
    { configKey: 'holding_duration_days', paramValue: 7, paramUnit: 'ngày' },
    { configKey: 'host_base_viewing_fee', paramValue: 50000, paramUnit: 'VND/lượt' },
    { configKey: 'host_deal_commission', paramValue: 400000, paramUnit: 'VND/cọc' },
    { configKey: 'host_rating_multiplier_5star', paramValue: 1.2, paramUnit: 'hệ số' },
    { configKey: 'host_peak_hour_multiplier', paramValue: 1.15, paramUnit: 'hệ số' },
  ];

  const systemAdminId = '00000000-0000-0000-0000-000000000001';
  for (const f of feeConfigs) {
    await prisma.feeConfig.upsert({
      where: { configKey: f.configKey },
      update: { paramValue: f.paramValue },
      create: {
        ...f,
        updatedBy: systemAdminId,
      },
    });
  }

  // 3. Buildings (The Sapphire 1 & 2)
  console.log('👉 Seeding Buildings at Vinhomes Ocean Park...');
  const buildings = [
    {
      buildingCode: 'S1.02',
      zoneName: 'The Sapphire 1',
      totalFloors: 28,
      lobbyLatitude: 20.998412,
      lobbyLongitude: 105.945281,
    },
    {
      buildingCode: 'S1.05',
      zoneName: 'The Sapphire 1',
      totalFloors: 27,
      lobbyLatitude: 20.999152,
      lobbyLongitude: 105.946123,
    },
    {
      buildingCode: 'S2.01',
      zoneName: 'The Sapphire 2',
      totalFloors: 30,
      lobbyLatitude: 20.996541,
      lobbyLongitude: 105.942189,
    },
  ];

  const buildingMap: Record<string, string> = {};
  for (const b of buildings) {
    const building = await prisma.building.upsert({
      where: { buildingCode: b.buildingCode },
      update: {},
      create: b,
    });
    buildingMap[b.buildingCode] = building.id;
  }

  // 4. Sample Profiles & Field Hosts
  console.log('👉 Seeding Sample Profiles and Field Hosts...');
  const hostProfile1 = await prisma.profile.upsert({
    where: { phoneHash: 'hash_0912345678' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      roleId: roleMap['field_host'],
      fullName: 'Trần Hoàng Nam',
      phoneHash: 'hash_0912345678',
      email: 'nam.fieldhost@vinstay.ai',
      isPhoneVerified: true,
    },
  });

  await prisma.fieldHost.upsert({
    where: { profileId: hostProfile1.id },
    update: {},
    create: {
      profileId: hostProfile1.id,
      assignedZone: 'The Sapphire 1 (S1.01 - S1.06)',
      rfidCardNumber: 'RFID-VHOP-00124',
      dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
      rating: 4.95,
      walletBalance: 850000,
      currentLatitude: 20.998412,
      currentLongitude: 105.945281,
    },
  });

  const hostProfile2 = await prisma.profile.upsert({
    where: { phoneHash: 'hash_0987654321' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      roleId: roleMap['field_host'],
      fullName: 'Lê Thị Thanh',
      phoneHash: 'hash_0987654321',
      email: 'thanh.fieldhost@vinstay.ai',
      isPhoneVerified: true,
    },
  });

  await prisma.fieldHost.upsert({
    where: { profileId: hostProfile2.id },
    update: {},
    create: {
      profileId: hostProfile2.id,
      assignedZone: 'The Sapphire 2 (S2.01 - S2.05)',
      rfidCardNumber: 'RFID-VHOP-00891',
      dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
      rating: 4.90,
      walletBalance: 450000,
      currentLatitude: 20.996541,
      currentLongitude: 105.942189,
    },
  });

  // Sample Landlord
  const landlordProfile = await prisma.profile.upsert({
    where: { phoneHash: 'hash_0901234567' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333333',
      roleId: roleMap['landlord'],
      fullName: 'Nguyễn Văn Minh (Chủ nhà)',
      phoneHash: 'hash_0901234567',
      email: 'minh.landlord@vinstay.ai',
      isPhoneVerified: true,
    },
  });

  // 5. Sample Units (from Prototype & SAD)
  console.log('👉 Seeding Sample Units with All-in Cost formulas...');
  const sampleUnits = [
    {
      unitCode: 'VHOP-S1.02-12A08',
      buildingId: buildingMap['S1.02'],
      landlordId: landlordProfile.id,
      floorNumber: 12,
      layoutType: LayoutType.ONE_BED_PLUS,
      carpetAreaM2: 47.0,
      baseRentPrice: 6500000,
      managementFee: 446500, // 47 * 9500
      parkingFeeEstimate: 150000,
      utilityCostEstimate: 600000,
      marketAvgPrice: 7300000,
      doorLockType: DoorLockType.ELECTRONIC_PIN,
      isVerified: true,
      status: UnitStatus.AVAILABLE,
      isHot: true,
    },
    {
      unitCode: 'VHOP-S1.05-0804',
      buildingId: buildingMap['S1.05'],
      landlordId: landlordProfile.id,
      floorNumber: 8,
      layoutType: LayoutType.STUDIO,
      carpetAreaM2: 32.5,
      baseRentPrice: 4800000,
      managementFee: 308750, // 32.5 * 9500
      parkingFeeEstimate: 150000,
      utilityCostEstimate: 400000,
      marketAvgPrice: 5500000,
      doorLockType: DoorLockType.ELECTRONIC_PIN,
      isVerified: true,
      status: UnitStatus.AVAILABLE,
      isHot: false,
    },
    {
      unitCode: 'VHOP-S2.01-1812',
      buildingId: buildingMap['S2.01'],
      landlordId: landlordProfile.id,
      floorNumber: 18,
      layoutType: LayoutType.TWO_BED_TWO_BATH,
      carpetAreaM2: 69.0,
      baseRentPrice: 9000000,
      managementFee: 655500, // 69 * 9500
      parkingFeeEstimate: 300000,
      utilityCostEstimate: 900000,
      marketAvgPrice: 9500000,
      doorLockType: DoorLockType.PHYSICAL_KEY,
      isVerified: true,
      status: UnitStatus.AVAILABLE,
      isHot: false,
    },
  ];

  for (const u of sampleUnits) {
    const unit = await prisma.unit.upsert({
      where: { unitCode: u.unitCode },
      update: {},
      create: u,
    });

    // Create Door Access Key (Protected in Vault)
    await prisma.doorAccessKey.upsert({
      where: { unitId: unit.id },
      update: {},
      create: {
        unitId: unit.id,
        keyType: u.doorLockType,
        vaultSecretRef: u.doorLockType === DoorLockType.ELECTRONIC_PIN ? 'vault:enc:pin:482910' : null,
      },
    });

    // Sample Verified Media with Timestamps
    await prisma.unitMedia.createMany({
      data: [
        {
          unitId: unit.id,
          url: `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200`,
          category: 'living_room',
          order: 1,
        },
        {
          unitId: unit.id,
          url: `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200`,
          category: 'bedroom',
          order: 2,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
