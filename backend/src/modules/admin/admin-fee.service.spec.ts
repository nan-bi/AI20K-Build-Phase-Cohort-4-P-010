import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminFeeService } from './admin-fee.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };

function build(rows: Record<string, number>) {
  const store = new Map(Object.entries(rows));
  const prisma: any = {
    feeConfig: {
      findMany: jest.fn(async () =>
        [...store.entries()].map(([configKey, v], i) => ({
          id: `id-${i}`,
          configKey,
          paramValue: new Prisma.Decimal(v),
          paramUnit: 'x',
          updatedAt: new Date('2026-10-01T00:00:00Z'),
        })),
      ),
      findUnique: jest.fn(async ({ where }: any) =>
        store.has(where.configKey)
          ? { id: 'id', configKey: where.configKey, paramValue: new Prisma.Decimal(store.get(where.configKey)!) }
          : null,
      ),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const v = Number((update ?? create).paramValue);
        store.set(where.configKey, v);
        return { id: 'id', configKey: where.configKey, paramValue: new Prisma.Decimal(v), updatedAt: new Date() };
      }),
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  return { svc: new AdminFeeService(prisma, audit as any), prisma, audit, store };
}

describe('AdminFeeService — biến phí', () => {
  it('getCommissionEngine đọc DB, giữ hình dạng { configs: [...] }, không trả dữ liệu giả khi DB lỗi', async () => {
    const { svc, prisma } = build({ host_base_viewing_fee: 50000 });
    const res = await svc.getCommissionEngine();
    expect(res.configs[0]).toEqual(
      expect.objectContaining({ configKey: 'host_base_viewing_fee', paramValue: 50000 }),
    );
    prisma.feeConfig.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(svc.getCommissionEngine()).rejects.toBeDefined();
  });

  it.each([
    ['host_base_viewing_fee', 29999],
    ['host_base_viewing_fee', 100001],
    ['host_deal_commission', 199999],
    ['host_deal_commission', 1000001],
    ['host_rating_multiplier_5star', 1.09],
    ['host_rating_multiplier_5star', 1.51],
    ['host_peak_hour_multiplier', 1.09],
    ['host_peak_hour_multiplier', 1.51],
  ])('từ chối %s = %s (ngoài khoảng SAD_v2 §3.2)', async (configKey, paramValue) => {
    const { svc, prisma, audit } = build({ [configKey]: 50000 });
    await expect(svc.updateCommissionParam({ configKey, paramValue, reason: 'test' }, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.feeConfig.upsert).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('từ chối key lạ không có tiền tố host_ và lý do rỗng', async () => {
    const { svc } = build({});
    await expect(svc.updateCommissionParam({ configKey: 'foo', paramValue: 1, reason: 'x' }, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.updateCommissionParam({ configKey: 'host_deal_commission', paramValue: 450000, reason: '  ' }, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cập nhật hợp lệ: ghi FeeConfig kèm updatedBy và audit old/new/actor/lý do trong cùng transaction', async () => {
    const { svc, prisma, audit } = build({ host_deal_commission: 400000 });
    const res = await svc.updateCommissionParam(
      { configKey: 'host_deal_commission', paramValue: 450000, reason: 'Tuần lễ vàng' },
      ACTOR,
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.feeConfig.upsert.mock.calls[0][0].update).toEqual(
      expect.objectContaining({ updatedBy: ACTOR.id }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR.id,
        actorRole: 'ops_admin',
        entityName: 'FeeConfig',
        oldValue: expect.objectContaining({ paramValue: 400000 }),
        newValue: expect.objectContaining({ paramValue: 450000, reason: 'Tuần lễ vàng' }),
      }),
    );
    expect(res).toEqual(expect.objectContaining({ success: true, configKey: 'host_deal_commission', newValue: 450000 }));
  });

  it('cho phép tạo khóa giờ vàng host_peak_hour_start/end (giờ 0–23, start < end)', async () => {
    const { svc, store } = build({});
    await svc.updateCommissionParam({ configKey: 'host_peak_hour_start', paramValue: 18, reason: 'giờ vàng' }, ACTOR);
    await svc.updateCommissionParam({ configKey: 'host_peak_hour_end', paramValue: 21, reason: 'giờ vàng' }, ACTOR);
    expect(store.get('host_peak_hour_start')).toBe(18);
    await expect(
      svc.updateCommissionParam({ configKey: 'host_peak_hour_start', paramValue: 24, reason: 'sai' }, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminFeeService — hold-policy qua FeeConfig holding_duration_days', () => {
  it('đọc từ FeeConfig (mặc định 7 ngày), giữ trường cũ defaultHours và thêm holdingDurationDays', async () => {
    const { svc } = build({});
    const res: any = await svc.getHoldPolicy();
    expect(res.holdingDurationDays).toBe(7);
    expect(res.defaultHours).toBe(168);
    expect(res).toHaveProperty('byUnit');
  });

  it('ghi days vào FeeConfig + audit; bộ nhớ không còn là nguồn dữ liệu', async () => {
    const { svc, store, audit } = build({ holding_duration_days: 7 });
    const res: any = await svc.updateHoldPolicy({ days: 10, reason: 'mùa cao điểm' }, ACTOR);
    expect(store.get('holding_duration_days')).toBe(10);
    expect(res.success).toBe(true);
    expect(res.holdingDurationDays).toBe(10);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'FeeConfig',
        oldValue: expect.objectContaining({ paramValue: 7 }),
        newValue: expect.objectContaining({ paramValue: 10 }),
      }),
    );
    const again: any = await svc.getHoldPolicy();
    expect(again.holdingDurationDays).toBe(10);
  });

  it.each([0, 15, 1.5])('từ chối days = %s (khoảng 1–14 ngày nguyên)', async (days) => {
    const { svc, store } = build({ holding_duration_days: 7 });
    await expect(svc.updateHoldPolicy({ days }, ACTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(store.get('holding_duration_days')).toBe(7);
  });

  describe('Deposit Policy — Quy định tiền cọc', () => {
    it('getDepositPolicy trả về mặc định minRatio=0.5, maxRatio=4.0, defaultRatio=1.0 khi chưa cấu hình', async () => {
      const { svc } = build({});
      const policy = await svc.getDepositPolicy();
      expect(policy).toEqual(
        expect.objectContaining({
          minRatio: 0.5,
          maxRatio: 4.0,
          defaultRatio: 1.0,
        }),
      );
    });

    it('updateDepositPolicy thành công khi minRatio=0.5, maxRatio=4.0, ghi AuditLog', async () => {
      const { svc, store, audit } = build({});
      const res = await svc.updateDepositPolicy(
        { minRatio: 0.5, maxRatio: 4.0, defaultRatio: 1.0, reason: 'Chính sách cọc chuẩn' },
        ACTOR,
      );
      expect(res.success).toBe(true);
      expect(store.get('deposit_min_ratio')).toBe(0.5);
      expect(store.get('deposit_max_ratio')).toBe(4.0);
      expect(store.get('deposit_default_ratio')).toBe(1.0);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DEPOSIT_POLICY_UPDATED',
          entityName: 'FeeConfig',
        }),
      );
    });

    it('từ chối minRatio < 0.1 hoặc maxRatio < minRatio', async () => {
      const { svc } = build({});
      await expect(
        svc.updateDepositPolicy({ minRatio: 0.05, maxRatio: 4.0 }, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        svc.updateDepositPolicy({ minRatio: 2.0, maxRatio: 1.0 }, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

