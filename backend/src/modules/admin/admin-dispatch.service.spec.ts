/// <reference types="jest" />
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminDispatchService } from './admin-dispatch.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };
const NOW = new Date('2026-10-04T03:00:00Z');
const ago = (s: number) => new Date(NOW.getTime() - s * 1000);

function ticket(over: any = {}) {
  return {
    id: 't1',
    viewingId: 'v1',
    hostId: 'h-old',
    tier: 1,
    slaSeconds: 300,
    status: 'OFFERED',
    offeredAt: ago(60),
    acceptedAt: null,
    viewing: {
      id: 'v1',
      status: 'CONFIRMED',
      unit: { unitCode: 'VHOP-S1.02-12A08', building: { buildingCode: 'S1.02' } },
    },
    host: { profile: { fullName: 'Lê Quốc Bảo' } },
    ...over,
  };
}

function build(tickets: any[], hosts: Record<string, any> = {}) {
  const rows = tickets;
  const prisma: any = {
    dispatchTicket: {
      findMany: jest.fn(async () => rows),
      findFirst: jest.fn(async ({ where }: any) =>
        rows.find((t) => (where.viewingId ? t.viewingId === where.viewingId : true)) ?? null,
      ),
      findUnique: jest.fn(async ({ where }: any) => rows.find((t) => t.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const t = rows.find((r) => r.id === where.id)!;
        Object.assign(t, data);
        return t;
      }),
    },
    fieldHost: { findUnique: jest.fn(async ({ where }: any) => hosts[where.id] ?? null) },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  const svc = new AdminDispatchService(prisma, audit as any);
  return { svc, prisma, audit, rows };
}

describe('AdminDispatchService — bảng SLA', () => {
  it('giữ các trường cũ và thêm deadlineAt, secondsOverdue, isBreached thật', async () => {
    const { svc } = build([
      ticket({ id: 'ok', offeredAt: ago(60) }),
      ticket({ id: 'late', offeredAt: ago(400) }),
      ticket({ id: 'accepted', status: 'ACCEPTED', offeredAt: ago(900) }),
    ]);
    const rows = await svc.getSlaMonitoring(NOW);
    const byId = Object.fromEntries(rows.map((r: any) => [r.ticketId, r]));
    expect(byId.ok).toEqual(
      expect.objectContaining({
        ticketId: 'ok',
        unitCode: 'VHOP-S1.02-12A08',
        building: 'S1.02',
        hostName: 'Lê Quốc Bảo',
        tier: 1,
        slaSeconds: 300,
        status: 'OFFERED',
        isBreached: false,
        secondsOverdue: 0,
      }),
    );
    expect(byId.late.isBreached).toBe(true);
    expect(byId.late.secondsOverdue).toBe(100);
    expect(byId.late.deadlineAt).toBe(ago(400 - 300).toISOString());
    expect(byId.accepted.isBreached).toBe(false);
  });

  it('lỗi DB thành lỗi, không trả dữ liệu giả', async () => {
    const { svc, prisma } = build([]);
    prisma.dispatchTicket.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(svc.getSlaMonitoring(NOW)).rejects.toBeDefined();
    prisma.dispatchTicket.findMany.mockResolvedValueOnce([]);
    expect(await svc.getSlaMonitoring(NOW)).toEqual([]);
  });

  it('summary theo tầng và đếm quá hạn', async () => {
    const { svc } = build([
      ticket({ id: 'a', tier: 1, offeredAt: ago(400) }),
      ticket({ id: 'b', tier: 1, status: 'ACCEPTED' }),
      ticket({ id: 'c', tier: 2, slaSeconds: 180, status: 'ESCALATED' }),
    ]);
    const s = await svc.getSlaSummary(NOW);
    expect(s.breachedCount).toBe(1);
    expect(s.byTier['1']).toEqual(expect.objectContaining({ total: 2, offered: 1, accepted: 1, breached: 1 }));
    expect(s.byTier['2']).toEqual(expect.objectContaining({ total: 1, escalated: 1, breached: 0 }));
  });
});

describe('AdminDispatchService — reassign (:id = Viewing id)', () => {
  const hosts = {
    'h-new': { id: 'h-new', dutyStatus: 'ONLINE_AVAILABLE' },
    'h-off': { id: 'h-off', dutyStatus: 'OFF_DUTY' },
    'h-old': { id: 'h-old', dutyStatus: 'ONLINE_AVAILABLE' },
  };

  it.each(['OFFERED', 'EXPIRED', 'ESCALATED'])('cho giao lại từ %s, giữ slaSeconds, reset offeredAt, có audit', async (status) => {
    const { svc, rows, audit } = build([ticket({ status, tier: 2, slaSeconds: 180 })], hosts);
    const res = await svc.reassign('v1', { hostId: 'h-new', reason: 'Host cũ kẹt thang' }, ACTOR, NOW);
    expect(res).toEqual(expect.objectContaining({ bookingId: 'v1', newHostId: 'h-new' }));
    expect(rows[0]).toEqual(
      expect.objectContaining({ hostId: 'h-new', status: 'OFFERED', slaSeconds: 180, offeredAt: NOW }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR.id,
        actorRole: 'ops_admin',
        actionType: 'DISPATCH_REASSIGNED',
        entityName: 'DispatchTicket',
        entityId: 't1',
        oldValue: expect.objectContaining({ hostId: 'h-old', status }),
        newValue: expect.objectContaining({ hostId: 'h-new', reason: 'Host cũ kẹt thang' }),
      }),
    );
  });

  it.each(['ACCEPTED', 'CHECKED', 'COMPLETED', 'CANCELLED'])('409 khi ticket ở %s, không ghi gì', async (status) => {
    const { svc, prisma, audit } = build([ticket({ status })], hosts);
    await expect(svc.reassign('v1', { hostId: 'h-new', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.dispatchTicket.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('409 khi viewing đã COMPLETED/NO_SHOW/CANCELLED', async () => {
    const t = ticket();
    t.viewing.status = 'NO_SHOW';
    const { svc } = build([t], hosts);
    await expect(svc.reassign('v1', { hostId: 'h-new', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it('từ chối host không tồn tại, offline, hoặc trùng host hiện tại', async () => {
    const { svc } = build([ticket()], hosts);
    await expect(svc.reassign('v1', { hostId: 'nope', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.reassign('v1', { hostId: 'h-off', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.reassign('v1', { hostId: 'h-old', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 khi viewing không có ticket; bắt buộc có lý do', async () => {
    const { svc } = build([], hosts);
    await expect(svc.reassign('zz', { hostId: 'h-new', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
    const b = build([ticket()], hosts);
    await expect(b.svc.reassign('v1', { hostId: 'h-new', reason: '  ' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ticket chuyển sang Host mới (bảng /host/board của Host mới sẽ thấy ASSIGNED, Host cũ không)', async () => {
    const { svc, rows } = build([ticket()], hosts);
    await svc.reassign('v1', { hostId: 'h-new', reason: 'đổi host' }, ACTOR, NOW);
    expect(rows[0]).toEqual(expect.objectContaining({ hostId: 'h-new', status: 'OFFERED', offeredAt: NOW }));
  });
});

describe('AdminDispatchService — escalate', () => {
  it('tầng 1 → 2: ESCALATED, bỏ host, slaSeconds 180, có audit', async () => {
    const { svc, rows, audit } = build([ticket()]);
    const res = await svc.escalate('t1', { reason: 'Host không phản hồi' }, ACTOR, NOW);
    expect(res).toEqual(expect.objectContaining({ ticketId: 't1', tier: 2, status: 'ESCALATED' }));
    expect(rows[0]).toEqual(
      expect.objectContaining({ tier: 2, status: 'ESCALATED', hostId: null, slaSeconds: 180, offeredAt: NOW }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DISPATCH_ESCALATED',
        entityId: 't1',
        oldValue: expect.objectContaining({ tier: 1, status: 'OFFERED', hostId: 'h-old' }),
        newValue: expect.objectContaining({ tier: 2, status: 'ESCALATED', reason: 'Host không phản hồi' }),
      }),
    );
  });

  it('tầng 2 → 3 được; tầng 3 bị chặn 409', async () => {
    const { svc, rows } = build([ticket({ tier: 2, slaSeconds: 180, status: 'EXPIRED' })]);
    await svc.escalate('t1', { reason: 'x' }, ACTOR, NOW);
    expect(rows[0].tier).toBe(3);
    rows[0].status = 'OFFERED';
    await expect(svc.escalate('t1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['ACCEPTED', 'CHECKED', 'COMPLETED', 'CANCELLED', 'ESCALATED'])('409 khi ticket ở %s', async (status) => {
    const { svc, prisma, audit } = build([ticket({ status })]);
    await expect(svc.escalate('t1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.dispatchTicket.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('404 khi không có ticket; bắt buộc có lý do', async () => {
    const { svc } = build([]);
    await expect(svc.escalate('zz', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
    const b = build([ticket()]);
    await expect(b.svc.escalate('t1', { reason: '' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });
});
