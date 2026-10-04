import { Prisma } from '@prisma/client';
import { roundVnd } from './money.util';

describe('roundVnd (nguyên đồng, half-up, Decimal)', () => {
  it.each([
    ['0.5', '1'],
    ['1.5', '2'],
    ['2.5', '3'],
    ['2.4999', '2'],
    ['57511.5', '57512'],
    ['57501.15', '57501'],
    ['0', '0'],
  ])('%s → %s', (input, expected) => {
    expect(roundVnd(new Prisma.Decimal(input)).toString()).toBe(expected);
  });

  it('không sai số nhị phân khi nhân hệ số: 50010 × 1.15 → 57512', () => {
    const v = new Prisma.Decimal(50010).mul(new Prisma.Decimal('1.15'));
    expect(roundVnd(v).toString()).toBe('57512');
  });
});
