import { AdminBiService } from './admin-bi.service';

function build(over: { viewings?: any[]; deposits?: any[]; contracts?: any[]; units?: any[] } = {}) {
  const viewings = over.viewings ?? [];
  const deposits = over.deposits ?? [];
  const contracts = over.contracts ?? [];
  const units = over.units ?? [];

  const inSet = (v: any, f: any) => (f && f.in ? f.in.includes(v) : f === v);
  const prisma: any = {
    viewing: {
      count: jest.fn(async ({ where = {} }: any = {}) =>
        viewings.filter((v) => {
          if (where.status?.not) return v.status !== where.status.not;
          if (where.status) return inSet(v.status, where.status);
          if (where.lobbyCheckInAt?.not === null) return v.lobbyCheckInAt != null;
          return true;
        }).length,
      ),
      findMany: jest.fn(async ({ where = {} }: any = {}) =>
        viewings.filter(
          (v) => v.createdAt && v.createdAt >= where.createdAt.gte && v.status !== where.status?.not,
        ),
      ),
    },
    holdingDeposit: {
      count: jest.fn(
        async ({ where = {} }: any = {}) => deposits.filter((d) => inSet(d.paymentStatus, where.paymentStatus)).length,
      ),
    },
    contract: {
      count: jest.fn(
        async ({ where = {} }: any = {}) => contracts.filter((c) => inSet(c.status, where.status)).length,
      ),
    },
    unit: { findMany: jest.fn(async () => units) },
  };
  return { svc: new AdminBiService(prisma), prisma };
}

const unit = (code: string, status: string, b = 'S1.01', zone = 'The Sapphire 1') => ({
  status,
  building: { buildingCode: b, zoneName: zone },
  unitCode: code,
});

describe('AdminBiService — phễu BI', () => {
  it('giữ cấu trúc cũ và đếm các giai đoạn có dữ liệu thật từ bảng', async () => {
    const { svc } = build({
      viewings: [
        { status: 'CONFIRMED', lobbyCheckInAt: new Date() },
        { status: 'COMPLETED', lobbyCheckInAt: new Date() },
        { status: 'NO_SHOW', lobbyCheckInAt: null },
        { status: 'CANCELLED', lobbyCheckInAt: null },
      ],
      deposits: [{ paymentStatus: 'PAID_HOLDING' }, { paymentStatus: 'CONVERTED_TO_CONTRACT' }, { paymentStatus: 'REFUNDED' }],
      contracts: [{ status: 'ACTIVE' }, { status: 'DRAFT' }],
    });
    const r: any = await svc.getBiFunnelAndHeatmap();
    expect(r).toEqual(
      expect.objectContaining({
        funnel: expect.any(Object),
        occupancyHeatmap: expect.any(Array),
        portfolioStatus: expect.any(Object),
      }),
    );
    const stages = r.funnel.stages;
    expect(stages).toHaveLength(6);
    const counts = stages.map((s: any) => s.count);
    expect(counts).toEqual([null, null, 3, 2, 2, 1]);
    expect(stages.map((s: any) => s.available)).toEqual([false, false, true, true, true, true]);
  });

  it('dropRate chỉ tính giữa giai đoạn liền kề đều có dữ liệu, còn lại là null', async () => {
    const { svc } = build({
      viewings: [
        { status: 'CONFIRMED', lobbyCheckInAt: new Date() },
        { status: 'COMPLETED', lobbyCheckInAt: new Date() },
        { status: 'CONFIRMED', lobbyCheckInAt: null },
        { status: 'CONFIRMED', lobbyCheckInAt: null },
      ],
      deposits: [{ paymentStatus: 'PAID_HOLDING' }],
      contracts: [],
    });
    const stages = (await svc.getBiFunnelAndHeatmap()).funnel.stages as any[];
    expect(stages[0].dropRate).toBeNull();
    expect(stages[1].dropRate).toBeNull();
    expect(stages[2].dropRate).toBeNull();
    expect(stages[3].dropRate).toBe(50);
    expect(stages[4].dropRate).toBe(50);
    expect(stages[5].dropRate).toBe(100);
  });

  it('noShowRate = NO_SHOW / (COMPLETED + NO_SHOW); mẫu số 0 thì null; avgDecisionTime không có nguồn', async () => {
    const a = await build({
      viewings: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'NO_SHOW' }],
    }).svc.getBiFunnelAndHeatmap();
    expect(a.funnel.noShowRate).toBe(25);
    expect(a.funnel.avgDecisionTimeMinutes).toBeNull();
    expect(a.funnel.avgDecisionTimeAvailable).toBe(false);

    const b = await build({ viewings: [{ status: 'CONFIRMED' }] }).svc.getBiFunnelAndHeatmap();
    expect(b.funnel.noShowRate).toBeNull();
  });

  it('heatmap theo tòa từ Unit thật; cảnh báo ATTENTION_NEEDED khi lấp đầy dưới 80%', async () => {
    const { svc } = build({
      units: [
        unit('a', 'RENTED', 'S1.01'),
        unit('b', 'RENTED', 'S1.01'),
        unit('c', 'RENTED', 'S1.01'),
        unit('d', 'RENTED', 'S1.01'),
        unit('e', 'AVAILABLE', 'S1.01'),
        unit('f', 'RENTED', 'S1.02'),
        unit('g', 'AVAILABLE', 'S1.02'),
        unit('h', 'HOLDING', 'S1.02'),
      ],
    });
    const r: any = await svc.getBiFunnelAndHeatmap();
    const byB = Object.fromEntries(r.occupancyHeatmap.map((h: any) => [h.buildingCode, h]));
    expect(byB['S1.01']).toEqual(
      expect.objectContaining({ total: 5, rented: 4, occupancyRate: 80, alert: 'NORMAL' }),
    );
    expect(byB['S1.02']).toEqual(
      expect.objectContaining({ total: 3, rented: 1, alert: 'ATTENTION_NEEDED' }),
    );
    expect(r.portfolioStatus).toEqual({ totalUnits: 8, rentedUnits: 5, holdingUnits: 1, availableUnits: 2 });
  });

  it('dailyBookings: 14 ngày theo giờ VN, đủ ngày 0 lịch, bỏ lịch đã hủy', async () => {
    const now = new Date('2026-10-08T10:00:00+07:00');
    const { svc } = build({
      viewings: [
        { status: 'CONFIRMED', createdAt: new Date('2026-10-08T00:30:00+07:00') },
        { status: 'COMPLETED', createdAt: new Date('2026-10-07T23:59:00+07:00') },
        { status: 'CONFIRMED', createdAt: new Date('2026-10-07T08:00:00+07:00') },
        { status: 'CANCELLED', createdAt: new Date('2026-10-08T09:00:00+07:00') },
        { status: 'CONFIRMED', createdAt: new Date('2026-09-20T09:00:00+07:00') },
      ],
    });
    const r: any = await svc.getBiFunnelAndHeatmap(now);
    expect(r.dailyBookings).toHaveLength(14);
    expect(r.dailyBookings[0].date).toBe('2026-09-25');
    expect(r.dailyBookings.at(-1)).toEqual({ date: '2026-10-08', count: 1 });
    expect(r.dailyBookings.at(-2)).toEqual({ date: '2026-10-07', count: 2 });
    expect(r.dailyBookings.reduce((s: number, d: any) => s + d.count, 0)).toBe(3);
  });

  it('lỗi DB thành lỗi, không trả số giả', async () => {
    const { svc, prisma } = build();
    prisma.viewing.count.mockRejectedValue(new Error('db down'));
    await expect(svc.getBiFunnelAndHeatmap()).rejects.toBeDefined();
  });
});
