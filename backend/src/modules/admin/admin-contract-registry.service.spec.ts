import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminContractRegistryService, depositBreakdown } from './admin-contract-registry.service';

const NOW = new Date('2026-10-08T03:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const unit = { id: 'u1', unitCode: 'VHOP-S1.02-12A08', floorNumber: 12, doorNumber: '08', baseRentPrice: new Prisma.Decimal(9_000_000), building: { buildingCode: 'S1.02' }, landlord: { fullName: 'Chủ An' }, landlordId: 'l1' };

function build() {
  const mandates = [
    { id: 'm1', contractNumber: 'VSA-MANDATE-01', status: 'EXIT_REQUESTED', exitEffectiveAt: days(-1), signedAt: days(-200), createdAt: days(-200), unit, unitId: 'u1' },
    { id: 'm2', contractNumber: 'VSA-MANDATE-02', status: 'ACTIVE', signedAt: days(-10), createdAt: days(-10), unit, unitId: 'u1' },
  ];
  const deposits = [
    { id: 'd1', depositCode: 'VSA-HOLD-01', paymentStatus: 'PAID_HOLDING', amount: new Prisma.Decimal(2_000_000), paidAt: days(-1), expiresAt: new Date(NOW.getTime() + 3_600_000), createdAt: days(-1), unit, unitId: 'u1', viewing: { tenant: { id: 't1', fullName: 'Khách Bình' } }, attributedHost: { id: 'h1', profile: { fullName: 'Host Chi' } }, attributedHostId: 'h1' },
    { id: 'd2', depositCode: 'VSA-HOLD-02', paymentStatus: 'UNC_PENDING_REVIEW', amount: new Prisma.Decimal(2_000_000), createdAt: days(-2), unit, unitId: 'u1', viewing: { contactName: 'Khách Dung' } },
  ];
  const leases = [
    { id: 'c1', contractNumber: 'VSA-LEASE-01', status: 'ACTIVE', startDate: days(-340), endDate: days(20), monthlyRentPrice: new Prisma.Decimal(9_000_000), securityDepositAmount: new Prisma.Decimal(9_000_000), leaseTermMonths: 12, paymentCycleMonths: 1, createdAt: days(-345), unit, unitId: 'u1', tenant: { fullName: 'Khách Bình' }, landlord: { fullName: 'Chủ An' }, tenantId: 't1', landlordId: 'l1' },
  ];
  const hosts = [
    { id: 'abcdef12-0000-4000-8000-000000000000', assignedZone: 'The Sapphire 1', roles: ['SALE', 'INSPECTOR'], rating: new Prisma.Decimal(4.9), createdAt: days(-30), profile: { fullName: 'Host Chi', email: 'chi@x.vn', isActive: true } },
    { id: 'b2', assignedZone: 'The Zenpark', roles: ['SALE'], rating: new Prisma.Decimal(5), createdAt: days(-5), profile: { fullName: 'Host Em', isActive: false } },
  ];
  const byId = (rows: any[]) => jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null);
  const prisma: any = {
    exclusiveMandate: { findMany: jest.fn(async () => mandates), findUnique: byId(mandates) },
    holdingDeposit: { findMany: jest.fn(async () => deposits), findUnique: byId(deposits) },
    contract: { findMany: jest.fn(async () => leases), findUnique: byId(leases) },
    fieldHost: { findMany: jest.fn(async () => hosts), findUnique: byId(hosts) },
  };
  return { svc: new AdminContractRegistryService(prisma), prisma };
}

describe('AdminContractRegistryService — sổ hợp đồng 4 loại', () => {
  it('gộp đủ 4 loại từ bảng thật, key = kind-id, mới nhất trước', async () => {
    const rows = await build().svc.list(NOW);
    expect(new Set(rows.map((r) => r.kind))).toEqual(new Set(['mandate', 'holding', 'lease', 'partnership']));
    expect(rows).toHaveLength(7);
    expect(rows[0].key).toBe('holding-d1');
    expect(rows.map((r) => r.createdAt)).toEqual([...rows.map((r) => r.createdAt)].sort().reverse());
  });

  it('cờ cần xử lý: đủ 15 ngày thoát, UNC chờ duyệt, cọc hết hạn trong 24h, HĐ thuê hết hạn trong 30 ngày', async () => {
    const rows = Object.fromEntries((await build().svc.list(NOW)).map((r) => [r.key, r]));
    expect(rows['mandate-m1'].needsAction).toMatch(/15 ngày/);
    expect(rows['mandate-m2'].needsAction).toBeNull();
    expect(rows['holding-d1'].needsAction).toMatch(/24 giờ/);
    expect(rows['holding-d2'].needsAction).toMatch(/uỷ nhiệm chi/);
    expect(rows['lease-c1'].needsAction).toMatch(/30 ngày/);
    expect(rows['holding-d1'].parties.map((p) => p.role)).toEqual(['tenant', 'platform', 'host']);
    expect(rows['holding-d1'].scope).toBe('S1.02 · Tầng 12 · Căn 08');
  });

  it('đối tác Host: mã hồ sơ từ id, khoá tài khoản ⇒ tạm ngừng', async () => {
    const rows = (await build().svc.list(NOW)).filter((r) => r.kind === 'partnership');
    expect(rows.map((r) => r.docNumber)).toContain('HOST-ABCDEF12');
    expect(rows.find((r) => r.id === 'b2')).toEqual(expect.objectContaining({ status: 'SUSPENDED', tone: 'neutral' }));
  });

  it('detail: có facts + timeline; cọc ghi rõ chuyển 100% thành cọc bảo đảm, không trừ tháng đầu', async () => {
    const d = await build().svc.detail('holding', 'd1', NOW);
    expect(d.facts.find((f) => f.label === 'Khi ký HĐ thuê')?.value).toMatch(/100%.*không trừ tiền thuê tháng đầu/);
    expect(d.timeline.map((t) => t.label)).toContain('Gạch nợ — khoá căn');
    expect(d.hostId).toBe('h1');
  });

  it('cấu thành cọc: cọc giữ chỗ là một phần của cọc bảo đảm, không phải khoản thứ hai', () => {
    expect(depositBreakdown(7_000_000, 2_000_000)).toBe('2.000.000đ cọc giữ chỗ (chuyển đổi 100%) + 5.000.000đ nộp thêm khi ký = 7.000.000đ');
    expect(depositBreakdown(2_000_000, 2_000_000)).toMatch(/không phải nộp thêm/);
    expect(depositBreakdown(7_000_000, null)).toMatch(/chưa ghi nhận/);
  });

  it('kind lạ ⇒ 400; id lạ ⇒ 404', async () => {
    const { svc } = build();
    await expect(svc.detail('rent', 'x')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.detail('lease', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
