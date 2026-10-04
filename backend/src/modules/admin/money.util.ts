import { Prisma } from '@prisma/client';

/** VND: làm tròn nguyên đồng, half-up, hoàn toàn bằng Decimal. */
export function roundVnd(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}
