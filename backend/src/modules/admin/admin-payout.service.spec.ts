import { Prisma } from '@prisma/client';
import { AdminPayoutService } from './admin-payout.service';

const HOST = '22222222-2222-2222-2222-222222222222';
const D = (v: number | string) => new Prisma.Decimal(v);

interface Opts {
  fees?: Record<string, number>;
  viewing?: any;
  deposit?: any;
  /** Điểm khách đã chấm cho Host (mỗi phần tử một lịch xem). */
  ratings?: number[];
  /** Hồ sơ Host theo profileId (cho thù lao thẩm định). */
  hostByProfile?: Record<string, any>;
  /** Dòng AuditLog INSPECTION_SUBMITTED mà lượt quét sẽ thấy. */
  inspectionLogs?: any[];
  viewings?: any[];
  deposits?: any[];
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
    viewing: { findUnique: jest.fn(async () => opts.viewing ?? null), findMany: jest.fn(async () => opts.viewings ?? []) },
    holdingDeposit: { findUnique: jest.fn(async () => opts.deposit ?? null), findMany: jest.fn(async () => opts.deposits ?? []) },
    auditLog: { findMany: jest.fn(async () => opts.inspectionLogs ?? []) },
    dispatchTicket: {
      findMany: jest.fn(async () =>
        (opts.ratings ?? []).map((r, i) => ({ viewingId: `rv${i}`, viewing: { tenantRating: r } })),
      ),
    },
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
      findUnique: jest.fn(async ({ where }: any) => (opts.hostByProfile ?? {})[where.profileId] ?? null),
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

  it('C: Host trung bình ≥ 4,8★ ⇒ thêm round(400.000 × (1,2 − 1)) = 80.000, transRef deposit:<id>:rating', async () => {
    const { svc, payouts, wallet } = build({ deposit: deposit(), ratings: [5, 5, 5, 5, 4] }); // 4,8
    await svc.accrueDeposit('d1');
    expect(payouts.map((p) => p.transRef).sort()).toEqual(['deposit:d1', 'deposit:d1:rating']);
    expect(payouts.find((p) => p.transRef === 'deposit:d1:rating').amount.toString()).toBe('80000');
    expect(wallet.value.toString()).toBe('480000');
  });

  it('Host trung bình dưới 4,8★ (4,6) hoặc chưa có đánh giá nào ⇒ ×1, không có thưởng đánh giá', async () => {
    for (const ratings of [[5, 5, 4, 4, 5], [], undefined]) {
      const { svc, payouts } = build({ deposit: deposit(), ratings });
      await svc.accrueDeposit('d1');
      expect(payouts.map((p) => p.transRef)).toEqual(['deposit:d1']);
    }
  });

  it('một lịch xem có nhiều ticket của cùng Host chỉ tính một đánh giá', async () => {
    const { svc, prisma, payouts } = build({ deposit: deposit() });
    // Gộp theo lịch xem: v1=4, v2..v5=5 ⇒ 24/5 = 4,8 ⇒ có thưởng. Nếu đếm trùng v1: 28/6 = 4,67 ⇒ không thưởng.
    prisma.dispatchTicket.findMany.mockResolvedValue([
      { viewingId: 'v1', viewing: { tenantRating: 4 } },
      { viewingId: 'v1', viewing: { tenantRating: 4 } },
      ...['v2', 'v3', 'v4', 'v5'].map((id) => ({ viewingId: id, viewing: { tenantRating: 5 } })),
    ]);
    await svc.accrueDeposit('d1');
    expect(payouts.map((p) => p.transRef).sort()).toEqual(['deposit:d1', 'deposit:d1:rating']);
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
    const { svc, payouts, wallet } = build({ deposit: deposit(), ratings: [5, 5] });
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

describe('AdminPayoutService — D: thưởng nóng theo chiến dịch', () => {
  const deposit = () => ({ id: 'd9', paymentStatus: 'PAID_HOLDING', attributedHostId: HOST, viewing: { id: 'v9' } });
  const dealOf = (id: string) => ({ hostId: HOST, transRef: `deposit:${id}`, amount: D(400000) });

  it('đang bật chiến dịch: mỗi deal cộng thêm host_campaign_bonus, transRef deposit:<id>:campaign', async () => {
    const { svc, payouts, wallet } = build({ deposit: deposit(), fees: { host_campaign_bonus: 200000 } });
    await svc.accrueDeposit('d9');
    expect(payouts.map((p) => p.transRef).sort()).toEqual(['deposit:d9', 'deposit:d9:campaign']);
    expect(payouts.find((p) => p.transRef === 'deposit:d9:campaign').amount.toString()).toBe('200000');
    expect(wallet.value.toString()).toBe('600000');
  });

  it('tối đa 3 deal/tuần: deal thứ 3 còn được thưởng, deal thứ 4 thì không', async () => {
    const third = build({ deposit: deposit(), fees: { host_campaign_bonus: 200000 } });
    third.payouts.push(dealOf('a'), dealOf('b'));
    await third.svc.accrueDeposit('d9');
    expect(third.payouts.map((p) => p.transRef)).toContain('deposit:d9:campaign');

    const fourth = build({ deposit: deposit(), fees: { host_campaign_bonus: 200000 } });
    fourth.payouts.push(dealOf('a'), dealOf('b'), dealOf('c'));
    await fourth.svc.accrueDeposit('d9');
    expect(fourth.payouts.map((p) => p.transRef)).toContain('deposit:d9');
    expect(fourth.payouts.map((p) => p.transRef)).not.toContain('deposit:d9:campaign');
  });

  it('khoản thưởng đánh giá / thưởng nóng / thù lao lượt không bị tính vào số deal trong tuần', async () => {
    const { svc, payouts } = build({ deposit: deposit(), fees: { host_campaign_bonus: 200000 } });
    payouts.push(
      dealOf('a'),
      { hostId: HOST, transRef: 'deposit:a:rating', amount: D(80000) },
      { hostId: HOST, transRef: 'deposit:a:campaign', amount: D(200000) },
      { hostId: HOST, transRef: 'viewing:v1', amount: D(50000) },
      { hostId: HOST, transRef: 'viewing:v2', amount: D(50000) },
    );
    await svc.accrueDeposit('d9'); // chỉ 2 deal (a + d9) ⇒ còn trong hạn mức
    expect(payouts.map((p) => p.transRef)).toContain('deposit:d9:campaign');
  });

  it('thiếu cấu hình hoặc bằng 0 ⇒ chiến dịch tắt, không ghi thưởng nóng', async () => {
    for (const fees of [undefined, { host_campaign_bonus: 0 }]) {
      const { svc, payouts } = build({ deposit: deposit(), fees });
      await svc.accrueDeposit('d9');
      expect(payouts.map((p) => p.transRef)).toEqual(['deposit:d9']);
    }
  });

  it('webhook gửi trùng: thưởng nóng cũng chỉ ghi một lần', async () => {
    const { svc, payouts } = build({ deposit: deposit(), fees: { host_campaign_bonus: 200000 } });
    await svc.accrueDeposit('d9');
    await svc.accrueDeposit('d9');
    expect(payouts.filter((p) => p.transRef === 'deposit:d9:campaign')).toHaveLength(1);
  });
});

describe('AdminPayoutService — E: thù lao thẩm định ký gửi', () => {
  const PROFILE = 'p-insp';
  const hostByProfile = { [PROFILE]: { id: HOST, roles: ['SALE', 'INSPECTOR'] } };

  it('Host đã nộp phiếu ⇒ ghi một khoản host_inspection_fee, transRef inspection:<mandateId>, cộng ví', async () => {
    const { svc, payouts, wallet } = build({ hostByProfile, fees: { host_inspection_fee: 150000 } });
    expect(await svc.accrueInspection('m1', PROFILE, new Date('2026-10-05T03:00:00Z'))).toBe(1);
    expect(payouts).toEqual([expect.objectContaining({ hostId: HOST, transRef: 'inspection:m1' })]);
    expect(payouts[0].amount.toString()).toBe('150000');
    expect(payouts[0].period).toBe('2026-W41');
    expect(wallet.value.toString()).toBe('150000');
  });

  it('gọi lại không ghi trùng (idempotent)', async () => {
    const { svc, payouts } = build({ hostByProfile, fees: { host_inspection_fee: 150000 } });
    await svc.accrueInspection('m1', PROFILE);
    expect(await svc.accrueInspection('m1', PROFILE)).toBe(0);
    expect(payouts).toHaveLength(1);
  });

  it('chưa cấu hình / bằng 0 hoặc người nộp không phải Host ⇒ không ghi', async () => {
    for (const o of [{ hostByProfile }, { hostByProfile, fees: { host_inspection_fee: 0 } }, { fees: { host_inspection_fee: 150000 } }]) {
      const { svc, payouts } = build(o as any);
      expect(await svc.accrueInspection('m1', PROFILE)).toBe(0);
      expect(payouts).toHaveLength(0);
    }
  });

  it('sweep quét cả phiếu thẩm định; thiếu cấu hình ở một khoản chỉ bị đếm skipped, không làm hỏng cả lượt', async () => {
    const { svc, payouts } = build({
      hostByProfile,
      fees: { host_inspection_fee: 150000 },
      viewings: [{ id: 'v-x' }],
      inspectionLogs: [{ entityId: 'm1', actorId: PROFILE, createdAt: new Date('2026-10-05T03:00:00Z') }],
    });
    // viewing 'v-x' không tồn tại trong mock ⇒ accrueViewing trả 0; fees thiếu host_base_viewing_fee không được làm sập lượt quét
    const r = await svc.sweep({ id: 'a', role: 'ops_admin' });
    expect(r).toEqual(expect.objectContaining({ inspectionsScanned: 1, created: 1, skipped: 0 }));
    expect(payouts.map((p) => p.transRef)).toEqual(['inspection:m1']);
  });

  it('bảng kê tách khoản thẩm định + vai Host (Sale+Thẩm định có thêm một khoản so với Sale thường)', async () => {
    const { svc, prisma } = build();
    prisma.hostPayout.findMany.mockResolvedValue([
      { hostId: HOST, amount: D(57500), transRef: 'viewing:v1', host: { rating: D(5), roles: ['SALE', 'INSPECTOR'], profile: { fullName: 'An' } } },
      { hostId: HOST, amount: D(150000), transRef: 'inspection:m1' },
      { hostId: HOST, amount: D(150000), transRef: 'inspection:m2' },
      { hostId: 'h-sale', amount: D(57500), transRef: 'viewing:v2', host: { rating: D(5), roles: ['SALE'], profile: { fullName: 'Bình' } } },
    ]);
    const { hosts }: any = await svc.getWeeklyStatement('2026-W41');
    const an = hosts.find((h: any) => h.hostId === HOST);
    const binh = hosts.find((h: any) => h.hostId === 'h-sale');
    expect(an).toEqual(expect.objectContaining({ roles: ['sale', 'inspector'], inspections: 2, inspectionFee: 300000, viewings: 1, total: 357500 }));
    expect(binh).toEqual(expect.objectContaining({ roles: ['sale'], inspections: 0, inspectionFee: 0 }));
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

  it('getWeeklyStatement tách khoản theo transRef: thù lao dẫn / hoa hồng / thưởng 5 sao', async () => {
    const { svc, prisma } = build();
    prisma.hostPayout.findMany.mockResolvedValue([
      { hostId: HOST, amount: D(57500), transRef: 'viewing:v1', host: { rating: D(4.9), profile: { fullName: 'An' } } },
      { hostId: HOST, amount: D(50000), transRef: 'viewing:v2' },
      { hostId: HOST, amount: D(400000), transRef: 'deposit:d1' },
      { hostId: HOST, amount: D(80000), transRef: 'deposit:d1:rating' },
      { hostId: HOST, amount: D(200000), transRef: 'deposit:d1:campaign' },
    ]);
    const [row]: any[] = (await svc.getWeeklyStatement('2026-W41')).hosts;
    expect(row).toEqual(
      expect.objectContaining({
        fullName: 'An',
        rating: 4.9,
        viewings: 2,
        viewingFee: 107500,
        deals: 1,
        commission: 400000,
        ratingBonus: 80000,
        campaignBonus: 200000,
        total: 787500,
        count: 5,
      }),
    );
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
