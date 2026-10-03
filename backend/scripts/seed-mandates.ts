/**
 * Tạo ủy quyền độc quyền ACTIVE cho các căn của một chủ nhà mà CHƯA có bản ghi ủy quyền nào
 * (căn nhập thẳng vào DB, không qua luồng ký gửi) — để màn Thoát ủy quyền và Chi tiết căn có dữ liệu thử.
 *
 *   npx ts-node --transpile-only scripts/seed-mandates.ts <email-chủ-nhà>          # chỉ xem trước
 *   npx ts-node --transpile-only scripts/seed-mandates.ts <email-chủ-nhà> --apply  # ghi thật
 *
 * Chỉ THÊM, không sửa/xóa gì; căn đã có ủy quyền (kể cả đã kết thúc) bị bỏ qua nên chạy lại là an toàn.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { MandateStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const [email, flag] = process.argv.slice(2);
  if (!email) throw new Error('Thiếu email chủ nhà. Ví dụ: seed-mandates.ts nam@example.com [--apply]');
  const apply = flag === '--apply';

  const landlord = await prisma.profile.findUnique({ where: { email }, include: { role: true } });
  if (!landlord) throw new Error(`Không có hồ sơ với email ${email}`);
  if (landlord.role.code !== 'landlord') throw new Error(`${email} có vai trò ${landlord.role.code}, không phải landlord`);

  const units = await prisma.unit.findMany({
    where: { landlordId: landlord.id, mandates: { none: {} } },
    include: { building: true },
    orderBy: { unitCode: 'asc' },
  });
  console.log(`${apply ? 'GHI THẬT' : 'XEM TRƯỚC (thêm --apply để ghi)'} — chủ nhà ${landlord.fullName} <${email}>: ${units.length} căn chưa có ủy quyền`);

  for (const u of units) {
    const contractNumber = `UQ-${new Date().getFullYear()}-${u.building.buildingCode.replace('.', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    console.log(`  ${apply ? '+' : '·'} ${u.unitCode} → ${contractNumber} ACTIVE (ký hôm nay)`);
    if (apply) {
      await prisma.exclusiveMandate.create({
        data: { unitId: u.id, contractNumber, status: MandateStatus.ACTIVE, signedAt: new Date() },
      });
    }
  }
})()
  .catch((e) => {
    console.error('LỖI:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
