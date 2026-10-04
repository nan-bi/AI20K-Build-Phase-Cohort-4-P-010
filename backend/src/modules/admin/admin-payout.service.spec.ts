import { Prisma } from '@prisma/client';
import { AdminPayoutService } from './admin-payout.service';

const HOST = '22222222-2222-2222-2222-222222222222';
const D = (v: number | string) => new Prisma.Decimal(v);

interface Opts {
  fees?: Record<string, number>;
  viewing?: any;
  deposit?: any;
}

function build(opts: Opts = {}) {
  const fees: Record<string, number> = {
    host_base_viewing_fee: 50000,
    host_deal_commission: 400000,
    host_rating_multiplier_5star: 1.2,
    host_peak_hour_multiplier: 1.15,
    host_peak_hour_start: 18,
    host_peak_hour_end: 21,
    ...(opts.fees ?? {}),
  };
  const payouts: any[] = [];
  const wallet = { value: D(0) };
  const prisma: any = {
    feeConfig: {
      findMany: jest.fn(async () =>
        Object.entries(fees).map(([configKey, v]) => ({ configKey, paramValue: D(v) })),
      ),
    },
    viewing: { findUnique: jest.fn(async () => opts.viewing ?? null) },
    holdingDeposit: { findUnique: jest.fn(async () => opts.deposit ?? null) },
    hostPayout: {
      findFirst: jest.fn(async ({ where }: any) => payouts.find((p) => p.transRef === where.transRef) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `p${payouts.length}`, createdAt: new Date('2026-10-05T00:00:00Z'), ...data };
        payouts.push(row);
        return row;
      }),
      findMany: jest.fn(async () => payouts),
    },
    fieldHost: {
      update: jest.fn(async ({ data }: any) => {
        wallet.value = wallet.value.add(D(data.walletBalance.increment));
        return {};
      }),
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  return { svc: new AdminPayoutService(prisma, audit as any), prisma, audit, payouts, wallet, fees };
}

const viewing = (over: any = {}) => ({
  id: 'v1',
  status: 'COMPLETED',
  viewingSlot: new Date('2026-10-05T12:00:00Z'), // 19:00 ICT — giờ vàng
  tenantRating: null,
  tickets: [{ hostId: HOST, status: 'COMPLETED' }],
  deposit: null,
  ...over,
});

describe('AdminPayoutService — A: thù lao dẫn (Viewing COMPLETED)', () => {
  it('giờ vàng: round(50.000 × 1,15) = 57.500, transRef viewing:<id>, cộng ví cùng transaction', async () => {
    const { svc, prisma, payouts, wallet } = build({ viewing: viewing() });
    await svc.accrueViewing('v1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toEqual(expect.objectContaining({ hostId: HOST, transRef: 'viewing:v1' }));
    expect(payouts[0].amount.toString()).toBe('57500');
    expect(wallet.value.toString()).toBe('57500');
  });

  it('ngoài giờ vàng nhân 1', async () => {
    const { svc, payouts } = build({ viewing: viewing({ viewingSlot: new Date('2026-10-05T02:00:00Z') }) }); // 09:00 ICT
    await svc.accrueViewing('v1');
    expect(payouts[0].amount.toString()).toBe('50000');
  });

  it('biên [start, end): 18:00 ICT có hệ số, 21:00 ICT không', async () => {
    const a = build({ viewing: viewing({ viewingSlot: new Date('2026-10-05T11:00:00Z') }) }); // 18:00
    await a.svc.accrueViewing('v1');
    expect(a.payouts[0].amount.toString()).toBe('57500');
    const b = build({ viewing: viewing({ viewingSlot: new Date('2026-10-05T14:00:00Z') }) }); // 21:00
    await b.svc.accrueViewing('v1');
    expect(b.payouts[0].amount.toString()).toBe('50000');
  });

  it('thiếu khóa host_peak_hour_start/end ⇒ KHÔNG áp hệ số dù đang 19:00', async () => {
    const { svc, payouts, prisma } = build({ viewing: viewing() });
    prisma.feeConfig.findMany.mockResolvedValueOnce([
      { configKey: 'host_base_viewing_fee', paramValue: D(50000) },
      { configKey: 'host_peak_hour_multiplier', paramValue: D(1.15) },
    ]);
    await svc.accrueViewing('v1');
    expect(payouts[0].amount.toString()).toBe('50000');
  });

  it('làm tròn half-up bằng Decimal: 50.010 × 1,15 = 57.511,5 → 57.512', async () => {
    const { svc, payouts } = build({ viewing: viewing(), fees: { host_base_viewing_fee: 50010 } });
    await svc.accrueViewing('v1');
    expect(payouts[0].amount.toString()).toBe('57512');
  });

  it('không tính khi Viewing chưa COMPLETED hoặc chưa có host', async () => {
    const a = build({ viewing: viewing({ status: 'CONFIRMED' }) });
    await a.svc.accrueViewing('v1');
    expect(a.payouts).toHaveLength(0);
    const b = build({ viewing: viewing({ tickets: [] }) });
    await b.svc.accrueViewing('v1');
    expect(b.payouts).toHaveLength(0);
  });

  it('gọi lại không tính trùng (transRef đã có) và không cộng ví lần 2', async () => {
    const { svc, payouts, wallet } = build({ viewing: viewing() });
    await svc.accrueViewing('v1');
    await svc.accrueViewing('v1');
    expect(payouts).toHaveLength(1);
    expect(wallet.value.toString()).toBe('57500');
  });

  it('ghi audit cho mỗi khoản (đầu vào cấu hình + số tiền)', async () => {
    const { svc, audit } = build({ viewing: viewing() });
    await svc.accrueViewing('v1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'HostPayout',
        newValue: expect.objectContaining({ transRef: 'viewing:v1', amount: 57500 }),
      }),
    );
  });
});

describe('AdminPayoutService — B/C: hoa hồng cọc và thưởng 5 sao', () => {
  const deposit = (over: any = {}) => ({
    id: 'd1',
    paymentStatus: 'PAID_HOLDING',
    attributedHostId: HOST,
    viewing: { id: 'v1', tenantRating: null },
    ...over,
  });

  it('B: round(deal_commission) = 400.000, transRef deposit:<id>', async () => {
    const { svc, payouts, wallet } = build({ deposit: deposit() });
    await svc.accrueDeposit('d1');
    expect(payouts.map((p) => p.transRef)).toEqual(['deposit:d1']);
    expect(payouts[0].amount.toString()).toBe('400000');
    expect(wallet.value.toString()).toBe('400000');
  });

  it('C: rating 5 ⇒ thêm round(400.000 × (1,2 − 1)) = 80.000, transRef deposit:<id>:rating', async () => {
    const { svc, payouts, wallet } = build({ deposit: deposit({ viewing: { id: 'v1', tenantRating: 5 } }) });
    await svc.accrueDeposit('d1');
    expect(payouts.map((p) => p.transRef).sort()).toEqual(['deposit:d1', 'deposit:d1:rating']);
    expect(payouts.find((p) => p.transRef === 'deposit:d1:rating').amount.toString()).toBe('80000');
    expect(wallet.value.toString()).toBe('480000');
  });

  it('rating 4 hoặc null ⇒ không có thưởng sao', async () => {
    const { svc, payouts } = build({ deposit: deposit({ viewing: { id: 'v1', tenantRating: 4 } }) });
    await svc.accrueDeposit('d1');
    expect(payouts).toHaveLength(1);
  });

  it('không tính khi chưa PAID_HOLDING hoặc không có attributedHostId', async () => {
    const a = build({ deposit: deposit({ paymentStatus: 'PENDING_PAYMENT' }) });
    await a.svc.accrueDeposit('d1');
    expect(a.payouts).toHaveLength(0);
    const b = build({ deposit: deposit({ attributedHostId: null }) });
    await b.svc.accrueDeposit('d1');
    expect(b.payouts).toHaveLength(0);
  });

  it('webhook gửi trùng: gọi hai lần chỉ cộng ví một lần', async () => {
    const { svc, payouts, wallet } = build({ deposit: deposit({ viewing: { id: 'v1', tenantRating: 5 } }) });
    await svc.accrueDeposit('d1');
    await svc.accrueDeposit('d1');
    expect(payouts).toHaveLength(2);
    expect(wallet.value.toString()).toBe('480000');
  });

  it('đổi cấu hình sau đó KHÔNG sửa khoản đã ghi', async () => {
    const { svc, payouts, fees } = build({ deposit: deposit() });
    await svc.accrueDeposit('d1');
    fees.host_deal_commission = 900000;
    await svc.accrueDeposit('d1');
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amount.toString()).toBe('400000');
  });

  it('lỗi giữa transaction ⇒ ném lỗi, không để ví tăng khi ghi payout thất bại', async () => {
    const { svc, prisma, wallet } = build({ deposit: deposit() });
    prisma.hostPayout.create.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.accrueDeposit('d1')).rejects.toThrow('boom');
    expect(wallet.value.toString()).toBe('0');
  });
});

describe('AdminPayoutService — bảng kê tuần và CSV', () => {
  it('getWeeklyStatement gộp theo host trong period ISO tuần, tổng bằng Decimal', async () => {
    const { svc, prisma } = build();
    prisma.hostPayout.findMany.mockResolvedValue([
      { hostId: HOST, amount: D(57500), period: '2026-W41', transRef: 'viewing:v1', status: 'PENDING' },
      { hostId: HOST, amount: D(400000), period: '2026-W41', transRef: 'deposit:d1', status: 'PENDING' },
    ]);
    const res: any = await svc.getWeeklyStatement('2026-W41');
    expect(res.period).toBe('2026-W41');
    expect(res.hosts).toHaveLength(1);
    expect(res.hosts[0]).toEqual(expect.objectContaining({ hostId: HOST, total: 457500, count: 2 }));
    expect(prisma.hostPayout.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({ period: '2026-W41' }));
  });

  it('period sai định dạng ⇒ 400', async () => {
    const { svc } = build();
    await expect(svc.getWeeklyStatement('tuan-41')).rejects.toMatchObject({ status: 400 });
  });

  it('toCsv: BOM UTF-8, header, và chống CSV-injection', async () => {
    const { svc, prisma } = build();
    prisma.hostPayout.findMany.mockResolvedValue([
      { hostId: '=cmd|x', amount: D(57500), period: '2026-W41', transRef: 'viewing:v1', status: 'PENDING' },
    ]);
    const csv = await svc.toCsv('2026-W41');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split('\n')[0]).toContain('hostId');
    expect(csv).toContain("'=cmd|x");
    expect(csv).toContain('57500');
  });
});
