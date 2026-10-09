import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminInventoryService } from './admin-inventory.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };
const NOW = new Date('2026-10-04T03:00:00Z');
const DAY = 86400000;
const inDays = (d: number) => new Date(NOW.getTime() + d * DAY);

function mandate(over: any = {}) {
  return {
    id: 'm1',
    unitId: 'u1',
    status: 'EXIT_REQUESTED',
    exitRequestedAt: inDays(-15),
    exitEffectiveAt: inDays(0),
    ...over,
  };
}

function build(opts: { mandate?: any; unit?: any; contracts?: any[]; units?: any[] } = {}) {
  const m = opts.mandate === undefined ? mandate() : opts.mandate;
  const u = opts.unit ?? { id: 'u1', status: 'AVAILABLE' };
  const contracts = opts.contracts ?? [];
  const prisma: any = {
    unit: {
      findMany: jest.fn(async () => opts.units ?? []),
      findUnique: jest.fn(async () => u),
      update: jest.fn(async ({ data }: any) => Object.assign(u, data)),
    },
    exclusiveMandate: {
      findUnique: jest.fn(async () => m),
      update: jest.fn(async ({ data }: any) => Object.assign(m, data)),
    },
    contract: {
      count: jest.fn(async ({ where }: any) => contracts.filter((c) => where.status.in.includes(c.status)).length),
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  return { svc: new AdminInventoryService(prisma, audit as any), prisma, audit, m, u };
}

const unitRow = (over: any = {}) => ({
  id: 'u1',
  unitCode: 'VHOP-S1.02-12A08',
  layoutType: 'STUDIO',
  carpetAreaM2: '30',
  baseRentPrice: '6500000',
  status: 'AVAILABLE',
  building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
  landlord: { fullName: 'Nguyễn Văn Minh' },
  mandates: [mandate({ status: 'ACTIVE', exitRequestedAt: null, exitEffectiveAt: null })],
  ...over,
});

describe('AdminInventoryService — rổ hàng độc quyền', () => {
  it('giữ các trường cũ; không có yêu cầu thoát thì countdown null', async () => {
    const { svc } = build({ units: [unitRow()] });
    const [r]: any = await svc.getExclusiveInventory(NOW);
    expect(r).toEqual(
      expect.objectContaining({
        id: 'u1',
        unitCode: 'VHOP-S1.02-12A08',
        building: 'S1.02',
        zone: 'The Sapphire 1',
        layout: 'STUDIO',
        carpetAreaM2: 30,
        baseRentPrice: 6500000,
        status: 'AVAILABLE',
        landlordName: 'Nguyễn Văn Minh',
        mandateStatus: 'ACTIVE',
        exitCountdownDays: null,
        mandateId: 'm1',
      }),
    );
  });

  it('countdown thật: làm tròn lên theo ngày, không âm', async () => {
    const mk = (days: number) =>
      unitRow({ mandates: [mandate({ exitEffectiveAt: new Date(NOW.getTime() + days * DAY) })] });
    const { svc } = build({ units: [mk(10.2), mk(-3)] });
    const rows: any = await svc.getExclusiveInventory(NOW);
    expect(rows[0].exitCountdownDays).toBe(11);
    expect(rows[1].exitCountdownDays).toBe(0);
    expect(rows[0].exitEffectiveAt).toBe(inDays(10.2).toISOString());
  });

  it('canTerminate/terminateBlockedReason theo điều kiện', async () => {
    const { svc } = build({
      units: [
        unitRow({ id: 'a', mandates: [mandate({ exitEffectiveAt: inDays(0) })] }),
        unitRow({ id: 'b', mandates: [mandate({ exitEffectiveAt: inDays(5) })] }),
        unitRow({ id: 'c', status: 'HOLDING', mandates: [mandate({ exitEffectiveAt: inDays(0) })] }),
      ],
    });
    const rows: any = await svc.getExclusiveInventory(NOW);
    expect(rows[0].canTerminate).toBe(true);
    expect(rows[0].terminateBlockedReason).toBeNull();
    expect(rows[1].canTerminate).toBe(false);
    expect(rows[1].terminateBlockedReason).toBe('EXIT_NOTICE_NOT_ELAPSED');
    expect(rows[2].canTerminate).toBe(false);
    expect(rows[2].terminateBlockedReason).toBe('UNIT_HOLDING');
  });

  it('lỗi DB thành lỗi, không trả mock', async () => {
    const { svc, prisma } = build();
    prisma.unit.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(svc.getExclusiveInventory(NOW)).rejects.toBeDefined();
  });
});

describe('AdminInventoryService — terminate mandate', () => {
  it('thành công: mandate TERMINATED, Unit UNLISTED, audit có old/new/lý do, trong transaction', async () => {
    const { svc, prisma, audit, m, u } = build();
    await svc.terminateMandate('m1', 'Chủ nhà đã thoát đủ 15 ngày', ACTOR, NOW);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(m.status).toBe('TERMINATED');
    expect(u.status).toBe('UNLISTED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR.id,
        actorRole: 'ops_admin',
        actionType: 'MANDATE_TERMINATED_BY_ADMIN',
        entityName: 'ExclusiveMandate',
        entityId: 'm1',
        oldValue: expect.objectContaining({ status: 'EXIT_REQUESTED', unitStatus: 'AVAILABLE' }),
        newValue: expect.objectContaining({
          status: 'TERMINATED',
          unitStatus: 'UNLISTED',
          reason: 'Chủ nhà đã thoát đủ 15 ngày',
        }),
      }),
    );
  });

  it('409 khi Unit đang HOLDING; không đổi gì, không audit', async () => {
    const { svc, audit, m, u } = build({ unit: { id: 'u1', status: 'HOLDING' } });
    await expect(svc.terminateMandate('m1', 'lý do', ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(m.status).toBe('EXIT_REQUESTED');
    expect(u.status).toBe('HOLDING');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'AWAITING_TENANT_SIGN', 'AWAITING_LANDLORD_SIGN', 'DISPUTED'])(
    '409 khi có hợp đồng %s',
    async (status) => {
      const { svc, m } = build({ contracts: [{ status }] });
      await expect(svc.terminateMandate('m1', 'lý do', ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
      expect(m.status).toBe('EXIT_REQUESTED');
    },
  );

  it('409 khi chưa đủ 15 ngày báo trước', async () => {
    const { svc } = build({ mandate: mandate({ exitEffectiveAt: inDays(3) }) });
    await expect(svc.terminateMandate('m1', 'lý do', ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['ACTIVE', 'PENDING_INSPECTION', 'TERMINATED', 'EXPIRED'])(
    '409 khi mandate ở %s (chưa có yêu cầu thoát)',
    async (status) => {
      const { svc } = build({ mandate: mandate({ status }) });
      await expect(svc.terminateMandate('m1', 'lý do', ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('404 khi không có mandate', async () => {
    const { svc } = build({ mandate: null });
    await expect(svc.terminateMandate('x', 'lý do', ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400 khi thiếu lý do', async () => {
    const { svc } = build();
    await expect(svc.terminateMandate('m1', '  ', ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminInventoryService — thời gian khoá căn (từng căn)', () => {
  const unitRow = (over: any = {}) => ({ id: 'u1', status: 'AVAILABLE', holdHoursOverride: null, ...over });

  it('đặt riêng cho căn còn trống: ghi holdHoursOverride + audit cũ/mới/lý do', async () => {
    const { svc, prisma, audit } = build({ unit: unitRow() });
    const res = await svc.updateHoldHours('u1', 24, ' Căn hot, quay vòng nhanh ', ACTOR);
    expect(prisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { holdHoursOverride: 24 } });
    expect(res).toEqual(expect.objectContaining({ holdHours: 24, holdHoursOverride: 24, defaultHoldHours: 48 }));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'UNIT_HOLD_HOURS_UPDATED',
        entityName: 'units',
        entityId: 'u1',
        oldValue: { holdHours: 48 },
        newValue: { holdHours: 24, reset: false, reason: 'Căn hot, quay vòng nhanh' },
      }),
    );
  });

  it('hours = null ⇒ về mặc định 48 giờ (xoá mức riêng)', async () => {
    const { svc, prisma, audit } = build({ unit: unitRow({ holdHoursOverride: 24 }) });
    const res = await svc.updateHoldHours('u1', null, 'về mặc định', ACTOR);
    expect(prisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { holdHoursOverride: null } });
    expect(res.holdHours).toBe(48);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ oldValue: { holdHours: 24 }, newValue: expect.objectContaining({ holdHours: 48, reset: true }) }),
    );
  });

  it.each(['HOLDING', 'RENTED', 'UNLISTED', 'MAINTENANCE'])('409 khi căn đang %s: chỉ sửa được căn còn trống, không ghi, không audit', async (status) => {
    const { svc, prisma, audit } = build({ unit: unitRow({ status }) });
    await expect(svc.updateHoldHours('u1', 24, 'x', ACTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.unit.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it.each([11, 73, 24.5, 0, -1])('400 khi hours = %s (nguyên, 12–72)', async (hours) => {
    const { svc, prisma } = build({ unit: unitRow() });
    await expect(svc.updateHoldHours('u1', hours, 'x', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.unit.update).not.toHaveBeenCalled();
  });

  it('400 khi thiếu lý do; 404 khi không có căn', async () => {
    const { svc } = build({ unit: unitRow() });
    await expect(svc.updateHoldHours('u1', 24, '  ', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    const none = build();
    none.prisma.unit.findUnique.mockResolvedValueOnce(null);
    await expect(none.svc.updateHoldHours('zz', 24, 'x', ACTOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('chi tiết căn trả holdHours hiệu lực + cờ canEditHoldHours chỉ bật khi AVAILABLE', async () => {
    const base = { building: { buildingCode: 'S1' }, landlord: null, mandates: [], media: [], carpetAreaM2: 40, baseRentPrice: 1, managementFee: 1, marketAvgPrice: 1, unitCode: 'U', floorNumber: 1, layoutType: 'STUDIO', isVerified: true, doorLockType: 'ELECTRONIC_PIN' };
    for (const [status, override, expectHours, canEdit] of [['AVAILABLE', null, 48, true], ['AVAILABLE', 36, 36, true], ['HOLDING', 36, 36, false]] as const) {
      const { svc, prisma } = build();
      prisma.unit.findFirst = jest.fn(async () => ({ ...base, id: 'u1', status, holdHoursOverride: override }));
      const d: any = await svc.getExclusiveInventoryDetail('U');
      expect(d).toEqual(expect.objectContaining({ holdHours: expectHours, canEditHoldHours: canEdit, defaultHoldHours: 48 }));
    }
  });
});
