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
