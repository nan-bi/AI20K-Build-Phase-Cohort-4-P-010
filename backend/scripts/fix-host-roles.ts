/**
 * Thêm vai SALE cho mọi Field Host có INSPECTOR mà thiếu SALE (hồ sơ 18, SPEC-P02 §1).
 *
 *   npx ts-node scripts/fix-host-roles.ts           # CHẠY KHÔ: chỉ đếm
 *   npx ts-node scripts/fix-host-roles.ts --apply   # ghi thật + AuditLog HOST_ROLES_UPDATE
 *
 * Idempotent. In `fixed=<n>`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { fixHostRoles } from '../src/modules/auth/fix-host-roles';

if (require.main === module) {
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  fixHostRoles(prisma, apply)
    .then(({ fixed }) => console.log(`${apply ? 'APPLY' : 'DRY-RUN'} fixed=${fixed}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
