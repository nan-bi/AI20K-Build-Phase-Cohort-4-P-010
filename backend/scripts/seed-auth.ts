/**
 * Seed phần xác thực cho môi trường dev (thay `prisma:seed` cũ của apps/web):
 *  - Admin mặc định (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  - 2 lời mời Field Host (host tự đăng ký ở /admin/login bằng email này)
 *  - Với `--demo`: 4 tài khoản demo cho nút "Trải nghiệm nhanh" (khớp AUTH_DEMO_MODE=true)
 *
 *   npm run seed:auth            # admin + lời mời host
 *   npm run seed:auth -- --demo  # thêm tài khoản demo
 *
 * Cần Supabase thật (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). Không chạy ở production.
 */
import { HostDutyStatus } from '@prisma/client';
import { PORTAL_ROLE } from '../src/modules/auth/auth.constants';
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS, DEMO_HOST_RFID } from '../src/modules/auth/demo-accounts';
import { ensureAccount, prisma, refuseInProduction, run, supabaseAdmin } from './auth-helpers';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@vinstay.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '123456!';

const HOST_INVITES = [
  { email: 'host1@vinstay.test', assignedZone: 'The Sapphire 1', rfidCardNumber: 'RFID-S1-0001' },
  { email: 'host2@vinstay.test', assignedZone: 'The Sapphire 2', rfidCardNumber: 'RFID-S2-0001' },
];

run(async () => {
  refuseInProduction('seed:auth');
  const supabase = supabaseAdmin();

  const admin = await ensureAccount(supabase, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    fullName: 'Admin',
    roleCode: PORTAL_ROLE.admin,
  });
  console.log(admin.created ? `Đã tạo admin ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}` : `Bỏ qua admin đã có ${ADMIN_EMAIL}`);

  for (const invite of HOST_INVITES) {
    await prisma.hostInvite.upsert({ where: { email: invite.email }, update: {}, create: invite });
    console.log(`Lời mời Field Host: ${invite.email} (RFID ${invite.rfidCardNumber})`);
  }

  if (!process.argv.includes('--demo')) return;

  const password = process.env.DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
  for (const portal of ['tenant', 'landlord', 'admin'] as const) {
    const { email, fullName } = DEMO_ACCOUNTS[portal];
    const { created } = await ensureAccount(supabase, { email, password, fullName, roleCode: PORTAL_ROLE[portal] });
    console.log(`${created ? 'Đã tạo' : 'Bỏ qua'} tài khoản demo ${portal}: ${email}`);
  }

  // Host demo đã "nhập RFID" sẵn để vào thẳng dashboard.
  const host = DEMO_ACCOUNTS.host;
  const { id, created } = await ensureAccount(supabase, {
    email: host.email,
    password,
    fullName: host.fullName,
    roleCode: PORTAL_ROLE.host,
  });
  await prisma.fieldHost.upsert({
    where: { profileId: id },
    update: {},
    create: {
      profileId: id,
      assignedZone: 'The Sapphire 1',
      rfidCardNumber: DEMO_HOST_RFID,
      dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
    },
  });
  await prisma.hostInvite.upsert({
    where: { email: host.email.toLowerCase() },
    update: {},
    create: {
      email: host.email.toLowerCase(),
      assignedZone: 'The Sapphire 1',
      rfidCardNumber: DEMO_HOST_RFID,
      claimedById: id,
      claimedAt: new Date(),
    },
  });
  console.log(`${created ? 'Đã tạo' : 'Bỏ qua'} tài khoản demo host: ${host.email}`);
  console.log(`Mật khẩu demo: ${password}`);
});
