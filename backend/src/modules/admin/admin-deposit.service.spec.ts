/// <reference types="jest" />
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminDepositService } from './admin-deposit.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };
const NOW = new Date('2026-10-04T03:00:00Z');
const DAY = 86400000;

function deposit(over: any = {}) {
  return {
    id: 'd1',
    depositCode: 'DEP-001',
    unitId: 'u1',
    amount: '2000000',
    paymentStatus: 'UNC_PENDING_REVIEW',
    paidAt: null,
    expiresAt: null,
    attributedHostId: 'h1',
    unit: { id: 'u1', unitCode: 'VHOP-S1.02-12A08', status: 'AVAILABLE' },
    ...over,
  };
}

function build(opts: { deposit?: any; holdDays?: any; contracts?: any[]; failList?: boolean } = {}) {
  const dep = opts.deposit === undefined ? deposit() : opts.deposit;
  const prisma: any = {
    holdingDeposit: {
      findMany: jest.fn(async () => (opts.failList ? Promise.reject(new Error('db down')) : dep ? [dep] : [])),
      count: jest.fn(async () => (dep ? 1 : 0)),
      findUnique: jest.fn(async () => dep),
      update: jest.fn(async ({ data }: any) => Object.assign(dep, data)),
    },
    unit: { update: jest.fn(async ({ data }: any) => Object.assign(dep.unit, data)) },
    feeConfig: { findUnique: jest.fn(async () => (opts.holdDays === undefined ? null : { paramValue: opts.holdDays })) },
    contract: {
      findMany: jest.fn(async () => (opts.failList ? Promise.reject(new Error('db down')) : opts.contracts ?? [])),
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  return { svc: new AdminDepositService(prisma, audit as any), prisma, audit, dep };
}

describe('AdminDepositService — giám sát cọc', () => {
  it('liệt kê cọc, lọc theo paymentStatus, phân trang, tiền là chuỗi Decimal', async () => {
    const { svc, prisma } = build();
    const r: any = await svc.listDeposits({ status: 'UNC_PENDING_REVIEW', page: 2, pageSize: 10 });
    expect(prisma.holdingDeposit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { paymentStatus: 'UNC_PENDING_REVIEW' }, skip: 10, take: 10 }),
    );
    expect(r).toMatchObject({ total: 1, page: 2, pageSize: 10 });
    expect(r.items[0]).toMatchObject({ id: 'd1', depositCode: 'DEP-001', unitCode: 'VHOP-S1.02-12A08', amount: '2000000' });
  });

  it('lỗi DB khi liệt kê ⇒ ném lỗi, không trả dữ liệu giả', async () => {
    const { svc } = build({ failList: true });
    await expect(svc.listDeposits({})).rejects.toThrow();
  });
});

describe('AdminDepositService.resolveUnc', () => {
  it('APPROVE: PAID_HOLDING, Unit HOLDING, expiresAt = now + holding_duration_days, có audit', async () => {
    const { svc, dep, prisma, audit } = build({ holdDays: '10' });
    await svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'Đã đối soát sao kê' }, ACTOR, NOW);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(dep.paymentStatus).toBe('PAID_HOLDING');
    expect(dep.paidAt).toEqual(NOW);
    expect(dep.expiresAt).toEqual(new Date(NOW.getTime() + 10 * DAY));
    expect(dep.unit.status).toBe('HOLDING');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR.id,
        actorRole: 'ops_admin',
        actionType: 'DEPOSIT_UNC_APPROVED',
        entityName: 'holding_deposits',
        entityId: 'd1',
        oldValue: expect.objectContaining({ paymentStatus: 'UNC_PENDING_REVIEW' }),
        newValue: expect.objectContaining({ paymentStatus: 'PAID_HOLDING', reason: 'Đã đối soát sao kê' }),
      }),
    );
  });

  it('APPROVE: chưa có holding_duration_days ⇒ mặc định 7 ngày', async () => {
    const { svc, dep } = build();
    await svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW);
    expect(dep.expiresAt).toEqual(new Date(NOW.getTime() + 7 * DAY));
  });

  it('APPROVE khi căn không còn AVAILABLE (người khác cọc trước) ⇒ 409, không đổi gì', async () => {
    const { svc, dep, audit } = build({ deposit: deposit({ unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' } }) });
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(dep.paymentStatus).toBe('UNC_PENDING_REVIEW');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('REJECT: chuyển QR_EXPIRED, không đụng Unit, có audit kèm lý do', async () => {
    const { svc, dep, prisma, audit } = build();
    await svc.resolveUnc('d1', { decision: 'REJECT', reason: 'UNC giả' }, ACTOR, NOW);
    expect(dep.paymentStatus).toBe('QR_EXPIRED');
    expect(prisma.unit.update).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DEPOSIT_UNC_REJECTED',
        newValue: expect.objectContaining({ paymentStatus: 'QR_EXPIRED', reason: 'UNC giả' }),
      }),
    );
  });

  it('idempotent: gọi lần hai (đã PAID_HOLDING) ⇒ 409, không khóa căn hay audit lần hai', async () => {
    const { svc, prisma, audit } = build();
    await svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW);
    audit.log.mockClear();
    prisma.unit.update.mockClear();
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.unit.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it.each(['PENDING_PAYMENT', 'QR_EXPIRED', 'CONVERTED_TO_CONTRACT', 'REFUNDED', 'FORFEITED'])(
    'trạng thái %s không được resolve ⇒ 409',
    async (st) => {
      const { svc } = build({ deposit: deposit({ paymentStatus: st }) });
      await expect(svc.resolveUnc('d1', { decision: 'REJECT', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('thiếu reason / decision sai ⇒ 400; không có cọc ⇒ 404', async () => {
    const { svc } = build();
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: '  ' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.resolveUnc('d1', { decision: 'MAYBE' as any, reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
    const none = build({ deposit: null });
    await expect(none.svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminDepositService.voidHold — khung trạng thái trung tính', () => {
  it('không đổi paymentStatus, không quyết hoàn/tịch thu; ghi audit; message trung tính', async () => {
    const { svc, dep, audit } = build({ deposit: deposit({ paymentStatus: 'PAID_HOLDING' }) });
    const r: any = await svc.voidHold('d1', { reason: 'landlord_breach', note: 'Chủ nhà đòi hủy' }, ACTOR);
    expect(dep.paymentStatus).toBe('PAID_HOLDING');
    expect(r).toMatchObject({ success: true, depositId: 'd1', status: 'PAID_HOLDING', reason: 'landlord_breach' });
    expect(JSON.stringify(r)).not.toMatch(/FORFEITED|REFUNDED|Hoàn 100%|phạt/i);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DEPOSIT_VOID_REQUESTED',
        entityId: 'd1',
        newValue: expect.objectContaining({ reason: 'landlord_breach', note: 'Chủ nhà đòi hủy' }),
      }),
    );
  });

  it('chỉ áp dụng cho cọc PAID_HOLDING ⇒ trạng thái khác 409; không có cọc 404', async () => {
    const a = build({ deposit: deposit({ paymentStatus: 'REFUNDED' }) });
    await expect(a.svc.voidHold('d1', { reason: 'force_majeure', note: 'n' }, ACTOR)).rejects.toBeInstanceOf(ConflictException);
    const b = build({ deposit: null });
    await expect(b.svc.voidHold('d1', { reason: 'force_majeure', note: 'n' }, ACTOR)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminDepositService.getContracts — không PII, không dữ liệu giả', () => {
  const contract = {
    id: 'c1',
    contractNumber: 'HDT-001',
    monthlyRentPrice: '6500000',
    securityDepositAmount: '6500000',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2027-09-30'),
    status: 'ACTIVE',
    unit: { unitCode: 'VHOP-S1.02-12A08' },
    tenant: { id: 't1', fullName: 'Nguyễn Văn An', phoneEnc: 'SECRET-ENC', phoneHash: 'SECRET-HASH', email: 'an@x.vn', passwordHash: 'scrypt$x' },
    landlord: { id: 'l1', fullName: 'Nguyễn Văn Minh', phoneEnc: 'SECRET-ENC2', phoneHash: 'SECRET-HASH2', email: 'minh@x.vn' },
  };

  it('chỉ trả tên + trường hợp đồng; không lọt SĐT/CCCD/email/hash', async () => {
    const { svc } = build({ contracts: [contract] });
    const r: any[] = await svc.getContracts();
    expect(r[0]).toMatchObject({
      id: 'c1',
      contractNumber: 'HDT-001',
      unitCode: 'VHOP-S1.02-12A08',
      tenantName: 'Nguyễn Văn An',
      landlordName: 'Nguyễn Văn Minh',
      monthlyRentPrice: '6500000',
      securityDepositAmount: '6500000',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(r)).not.toMatch(/SECRET|phone|email|passwordHash|idNumber|cccd|@x\.vn/i);
  });

  it('không có hợp đồng ⇒ mảng rỗng (không còn dữ liệu mẫu)', async () => {
    const { svc } = build({ contracts: [] });
    expect(await svc.getContracts()).toEqual([]);
  });

  it('lỗi DB ⇒ ném lỗi (không catch trả giả)', async () => {
    const { svc } = build({ failList: true });
    await expect(svc.getContracts()).rejects.toThrow();
  });
});
