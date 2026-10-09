import { Prisma } from '@prisma/client';
import { HostService } from './host.service';

const D = (v: number) => new Prisma.Decimal(v);
const payout = (transRef: string, amount: number) => ({
  id: transRef,
  amount: D(amount),
  period: '2026-W41',
  status: 'PENDING',
  transRef,
  createdAt: new Date('2026-10-05T03:00:00Z'),
});

function build(roles: string[], payouts: any[]) {
  const prisma: any = {
    fieldHost: {
      findUnique: jest.fn(async () => ({
        id: 'h1',
        rating: D(4.9),
        roles,
        walletBalance: D(0),
        profile: { fullName: 'An' },
        payouts,
      })),
    },
  };
  return new HostService(prisma, {} as any);
}

describe('HostService.getEarnings — tách khoản thu nhập', () => {
  const rows = [
    payout('viewing:v1', 50000),
    payout('deposit:d1', 400000),
    payout('deposit:d1:rating', 80000),
    payout('deposit:d1:campaign', 200000),
    payout('inspection:m1', 150000),
    payout('inspection:m2', 150000),
  ];

  it('Sale + Thẩm định: có thêm khoản thù lao thẩm định, không lẫn vào hoa hồng/lượt dẫn', async () => {
    const r: any = await build(['SALE', 'INSPECTOR'], rows).getEarnings('p1');
    expect(r.roles).toEqual(['sale', 'inspector']);
    expect(r.stats).toEqual(
      expect.objectContaining({
        totalViewings: 1,
        totalDeals: 1,
        dealCommissionTotal: 400000,
        viewingFeeTotal: 50000,
        ratingBonus: 80000,
        campaignBonus: 200000,
        totalInspections: 2,
        inspectionFeeTotal: 300000,
        totalEarnings: 1030000,
      }),
    );
  });

  it('Sale thường: không có khoản thẩm định', async () => {
    const r: any = await build(['SALE'], rows.slice(0, 4)).getEarnings('p1');
    expect(r.roles).toEqual(['sale']);
    expect(r.stats).toEqual(expect.objectContaining({ totalInspections: 0, inspectionFeeTotal: 0 }));
  });
});
