/**
 * Seed phần xác thực cho môi trường dev (thay `prisma:seed` cũ của apps/web):
 *  - Admin mặc định (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  (Field Host do Admin tạo ở /admin/hosts; seed chỉ tạo Host demo khi có `--demo`)
 *  - Với `--demo`: 4 tài khoản demo cho nút "Trải nghiệm nhanh" (khớp AUTH_DEMO_MODE=true)
 *
 *   npm run seed:auth            # chỉ admin
 *   npm run seed:auth -- --demo  # thêm tài khoản demo
 *
 * Chỉ cần DATABASE_URL (tài khoản nằm trong bảng profiles). Không chạy ở production.
 */
import { HostDutyStatus, HostRole } from '@prisma/client';
import { PORTAL_ROLE } from '../src/modules/auth/auth.constants';
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS } from '../src/modules/auth/demo-accounts';
import { ensureAccount, prisma, refuseInProduction, run } from './auth-helpers';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@vinstay.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '123456!';

run(async () => {
  refuseInProduction('seed:auth');

  const admin = await ensureAccount({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    fullName: 'Admin',
    roleCode: PORTAL_ROLE.admin,
  });
  console.log(admin.created ? `Đã tạo admin ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}` : `Bỏ qua admin đã có ${ADMIN_EMAIL}`);

  if (!process.argv.includes('--demo')) return;

  const password = process.env.DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
  for (const portal of ['tenant', 'landlord', 'admin'] as const) {
    const { email, fullName } = DEMO_ACCOUNTS[portal];
    const { created } = await ensureAccount({ email, password, fullName, roleCode: PORTAL_ROLE[portal] });
    console.log(`${created ? 'Đã tạo' : 'Bỏ qua'} tài khoản demo ${portal}: ${email}`);
  }

  // Host demo có sẵn hồ sơ Field Host với CẢ HAI vai để thấy đủ menu Sale + Thẩm định.
  const host = DEMO_ACCOUNTS.host;
  const { id, created } = await ensureAccount({
    email: host.email,
    password,
    fullName: host.fullName,
    roleCode: PORTAL_ROLE.host,
  });
  await prisma.fieldHost.upsert({
    where: { profileId: id },
    update: { roles: [HostRole.SALE, HostRole.INSPECTOR] },
    create: {
      profileId: id,
      assignedZone: 'The Sapphire 1',
      roles: [HostRole.SALE, HostRole.INSPECTOR],
      dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
    },
  });
  console.log(`${created ? 'Đã tạo' : 'Bỏ qua'} tài khoản demo host: ${host.email}`);
  console.log(`Mật khẩu demo: ${password}`);
});
