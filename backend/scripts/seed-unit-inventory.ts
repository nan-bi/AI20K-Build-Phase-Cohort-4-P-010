/**
 * DỮ LIỆU DEMO sinh để minh hoạ: căn thật sẽ ghi đè bằng thẩm định thật (hồ sơ 18, fix4).
 *
 *   npm run seed:unit-inventory                  # CHẠY KHÔ: in bảng unit | furnishing | số món | độ mới TB
 *   npm run seed:unit-inventory -- --apply       # ghi thật (xoá dòng cũ của căn trong 1 transaction rồi tạo lại)
 *   npm run seed:unit-inventory -- --overwrite   # ghi đè cả căn đã có dòng (mặc định --keep-existing: bỏ qua)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedUnitInventory } from '../src/modules/property/unit-inventory-seed';

if (require.main === module) {
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');
  seedUnitInventory(prisma, { apply, overwrite })
    .then(({ units, rows, summary }) => {
      console.log('unit | furnishing | items | avg_condition');
      for (const s of summary) {
        console.log(`${s.unitCode} | ${s.furnishing} | ${s.skipped ? 'skip(có dòng thật)' : s.items} | ${s.avgCondition ?? '-'}`);
      }
      console.log(`${apply ? 'APPLY' : 'DRY-RUN'} units=${units} rows=${rows}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
