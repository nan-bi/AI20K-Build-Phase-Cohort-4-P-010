/// <reference types="jest" />
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminDepositService } from './admin-deposit.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };
const NOW = new Date('2026-10-04T03:00:00Z');

function deposit(over: any = {}) {
  return {
    id: 'd1',
    depositCode: 'DEP-001',
    unitId: 'u1',
    amount: '2000000',
    paymentStatus: 'UNC_PENDING_REVIEW',
    paidAt: null,
    expiresAt: null,
    holdHours: 48,
    attributedHostId: 'h1',
    unit: { id: 'u1', unitCode: 'VHOP-S1.02-12A08', status: 'AVAILABLE' },
    ...over,
  };
}

function build(opts: {
  deposit?: any;
  holdHours?: any;
  competingDeposits?: any[];
  uncUploads?: any[];
  contracts?: any[];
  failList?: boolean;
  transactionError?: any;
} = {}) {
  const dep = opts.deposit === undefined ? deposit() : opts.deposit;
  const applyUnitUpdate = ({ where, data }: any) => {
    const matches = dep?.unit?.id === where.id && (!where.status || dep.unit.status === where.status);
    if (matches) Object.assign(dep.unit, data);
    return { count: matches ? 1 : 0 };
  };
  const prisma: any = {
    holdingDeposit: {
      findMany: jest.fn(async ({ where }: any = {}) => {
        if (opts.failList) throw new Error('db down');
        if (where?.id?.not) return opts.competingDeposits ?? [];
        return dep ? [dep] : [];
      }),
      count: jest.fn(async () => (dep ? 1 : 0)),
      findUnique: jest.fn(async () => dep),
      update: jest.fn(async ({ data }: any) => Object.assign(dep, data)),
    },
    unit: {
      update: jest.fn(async ({ data }: any) => Object.assign(dep.unit, data)),
      updateMany: jest.fn(async (args: any) => applyUnitUpdate(args)),
    },
    auditLog: {
      findMany: jest.fn(async () => opts.uncUploads ?? []),
    },
    feeConfig: { findUnique: jest.fn(async () => (opts.holdHours === undefined ? null : { paramValue: opts.holdHours })) },
    contract: {
      findMany: jest.fn(async () => (opts.failList ? Promise.reject(new Error('db down')) : opts.contracts ?? [])),
    },
    $transaction: jest.fn(async (cb: any) => {
      if (opts.transactionError) throw opts.transactionError;
      return cb(prisma);
    }),
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

  it('trả chứng từ UNC mới nhất cho admin duyệt', async () => {
    const { svc, prisma } = build({
      uncUploads: [
        { entityId: 'd1', newValue: { receiptUrl: 'https://storage.example/unc.jpg', note: 'Đã chuyển đủ' } },
      ],
    });
    const r: any = await svc.listDeposits({ status: 'UNC_PENDING_REVIEW' });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ entityId: { in: ['d1'] } }) }),
    );
    expect(r.items[0]).toMatchObject({
      receiptUrl: 'https://storage.example/unc.jpg',
      receiptNote: 'Đã chuyển đủ',
    });
  });

  it('lỗi DB khi liệt kê ⇒ ném lỗi, không trả dữ liệu giả', async () => {
    const { svc } = build({ failList: true });
    await expect(svc.listDeposits({})).rejects.toThrow();
  });
});

describe('AdminDepositService.resolveUnc', () => {
  it('APPROVE: PAID_HOLDING, Unit HOLDING, giữ đúng số giờ của QR và có audit', async () => {
    const { svc, dep, prisma, audit } = build({ deposit: deposit({ holdHours: 36 }) });
    await svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'Đã đối soát sao kê' }, ACTOR, NOW);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', status: 'AVAILABLE' },
      data: { status: 'HOLDING' },
    });
    expect(dep.paymentStatus).toBe('PAID_HOLDING');
    expect(dep.paidAt).toEqual(NOW);
    expect(dep.holdHours).toBe(36);
    expect(dep.expiresAt).toEqual(new Date(NOW.getTime() + 36 * 3_600_000));
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

  it('APPROVE UNC trên căn tạm HOLDING: giữ được khi khóa thuộc chính UNC và gia hạn đúng giờ', async () => {
    const { svc, dep, prisma } = build({
      deposit: deposit({
        expiresAt: new Date(NOW.getTime() + 30 * 60_000),
        unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' },
      }),
    });
    await svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW);
    expect(dep.paymentStatus).toBe('PAID_HOLDING');
    expect(dep.expiresAt).toEqual(new Date(NOW.getTime() + 48 * 3_600_000));
    expect(prisma.unit.updateMany).not.toHaveBeenCalled();
  });

  it('APPROVE khi có khoản cọc khác còn hiệu lực ⇒ 409, không đổi gì', async () => {
    const { svc, dep, audit } = build({
      deposit: deposit({
        expiresAt: new Date(NOW.getTime() + 30 * 60_000),
        unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' },
      }),
      competingDeposits: [{ id: 'd2' }],
    });
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(dep.paymentStatus).toBe('UNC_PENDING_REVIEW');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('REJECT: chuyển QR_EXPIRED, mở lại căn đang tạm giữ và ghi audit kèm lý do', async () => {
    const { svc, dep, prisma, audit } = build({
      deposit: deposit({
        expiresAt: new Date(NOW.getTime() + 30 * 60_000),
        unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' },
      }),
    });
    await svc.resolveUnc('d1', { decision: 'REJECT', reason: 'UNC giả' }, ACTOR, NOW);
    expect(dep.paymentStatus).toBe('QR_EXPIRED');
    expect(dep.unit.status).toBe('AVAILABLE');
    expect(prisma.unit.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', status: 'HOLDING' },
      data: { status: 'AVAILABLE' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DEPOSIT_UNC_REJECTED',
        newValue: expect.objectContaining({ paymentStatus: 'QR_EXPIRED', reason: 'UNC giả' }),
      }),
    );
  });

  it('không giải phóng căn khi còn khoản cọc khác đang giữ', async () => {
    const { svc, dep } = build({
      deposit: deposit({
        expiresAt: new Date(NOW.getTime() + 30 * 60_000),
        unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' },
      }),
      competingDeposits: [{ id: 'd2' }],
    });
    await svc.resolveUnc('d1', { decision: 'REJECT', reason: 'UNC giả' }, ACTOR, NOW);
    expect(dep.paymentStatus).toBe('QR_EXPIRED');
    expect(dep.unit.status).toBe('HOLDING');
  });

  it('UNC quá 30 phút: hết hạn, giải phóng căn và trả 409', async () => {
    const { svc, dep, audit } = build({
      deposit: deposit({
        expiresAt: new Date(NOW.getTime() - 1),
        unit: { id: 'u1', unitCode: 'X', status: 'HOLDING' },
      }),
    });
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'đã kiểm tra' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(dep.paymentStatus).toBe('QR_EXPIRED');
    expect(dep.unit.status).toBe('AVAILABLE');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'DEPOSIT_UNC_EXPIRED' }));
  });

  it('P2034 ở transaction duyệt UNC được ánh xạ thành 409', async () => {
    const { svc } = build({ transactionError: { code: 'P2034' } });
    await expect(svc.resolveUnc('d1', { decision: 'APPROVE', reason: 'ok' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
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
