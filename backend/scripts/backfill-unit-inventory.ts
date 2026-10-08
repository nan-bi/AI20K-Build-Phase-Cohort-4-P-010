/**
 * Backfill `unit_inventory_items` từ `meta.report.inventory` của mandate ACTIVE (hồ sơ 18, SPEC-P01 §3).
 *
 *   npm run backfill:unit-inventory            # CHẠY KHÔ: chỉ đếm
 *   npm run backfill:unit-inventory -- --apply # ghi thật (upsert theo unitId+code)
 *
 * Idempotent: chạy lại cho cùng số dòng. Căn không có report ⇒ 0 dòng. Chỉ ghi dòng `present`. In `units=<n> rows=<n>`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { backfillUnitInventory } from '../src/modules/property/unit-inventory-backfill';

if (require.main === module) {
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  backfillUnitInventory(prisma, apply)
    .then(({ units, rows }) => console.log(`${apply ? 'APPLY' : 'DRY-RUN'} units=${units} rows=${rows}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
