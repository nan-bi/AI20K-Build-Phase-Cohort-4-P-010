/**
 * Chuẩn hoá mã cửa điện tử về `aes:<AES-256-GCM>` (hồ sơ 15, SPEC-P02 §3).
 *
 *   npm run rekey:door-codes             # CHẠY KHÔ: chỉ đếm theo định dạng, KHÔNG ghi
 *   npm run rekey:door-codes -- --apply  # ghi thật (đổi `door_access_keys.vault_secret_ref`)
 *
 * Căn ELECTRONIC_PIN mà mã chưa phải `aes:` đọc được:
 *   - PIN để trần (`vault:*:pin:<số>`) ⇒ mã hoá lại, GIỮ NGUYÊN số;
 *   - chuỗi giữ chỗ seed / thiếu / hỏng ⇒ PIN ngẫu nhiên 6 số (căn seed chưa từng có PIN thật).
 * Căn ELECTRONIC_PIN chưa có dòng khoá ⇒ tạo mới. KHÔNG bao giờ in PIN ra màn hình. Idempotent. Chặn production.
 * Dùng cùng AES_SECRET_KEY với backend (đọc từ backend/.env) — khoá khác ⇒ mã không giải được.
 */
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { DoorLockType, PrismaClient } from '@prisma/client';
import { PhoneService } from '../src/modules/auth/phone/phone.service';
import { classifyDoorRef, planRekey, stripAesPrefix, withAesPrefix } from '../src/modules/door/door-code.util';

const prisma = new PrismaClient();
const phones = new PhoneService({ get: (k: string) => process.env[k] } as any);

function readable(ref: string | null): boolean {
  if (classifyDoorRef(ref) !== 'aes') return false;
  try {
    return /^\d{4,10}$/.test(phones.decrypt(stripAesPrefix(ref as string)));
  } catch {
    return false;
  }
}

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Không chạy rekey-door-codes ở production.');
  const apply = process.argv.includes('--apply');

  const keys = await prisma.doorAccessKey.findMany({ where: { keyType: DoorLockType.ELECTRONIC_PIN } });
  const missing = await prisma.unit.findMany({
    where: { doorLockType: DoorLockType.ELECTRONIC_PIN, doorKey: null },
    select: { id: true, unitCode: true },
  });

  const counts = { aes_ok: 0, placeholder: 0, plain_pin: 0, missing_ref: 0, no_key_row: missing.length };
  let changed = 0;
  for (const k of keys) {
    const kind = classifyDoorRef(k.vaultSecretRef);
    const decision = planRekey(k.vaultSecretRef, readable(k.vaultSecretRef), () => String(randomInt(100000, 1000000)));
    if (decision.action === 'keep') {
      counts.aes_ok += 1;
      continue;
    }
    if (kind === 'placeholder') counts.placeholder += 1;
    else if (kind === 'plain_pin') counts.plain_pin += 1;
    else counts.missing_ref += 1;
    if (apply) {
      await prisma.doorAccessKey.update({
        where: { id: k.id },
        data: { vaultSecretRef: withAesPrefix(phones.encrypt(decision.pin)), lastRotatedAt: new Date() },
      });
    }
    changed += 1;
  }
  for (const u of missing) {
    if (apply) {
      await prisma.doorAccessKey.create({
        data: {
          unitId: u.id,
          keyType: DoorLockType.ELECTRONIC_PIN,
          vaultSecretRef: withAesPrefix(phones.encrypt(String(randomInt(100000, 1000000)))),
          lastRotatedAt: new Date(),
        },
      });
    }
    changed += 1;
  }

  console.log(`${apply ? 'ĐÃ GHI' : 'CHẠY KHÔ (thêm --apply để ghi)'} — ${keys.length + missing.length} căn khoá điện tử`);
  console.log(JSON.stringify(counts));
  console.log(`${apply ? 'Đã đổi' : 'Sẽ đổi'} ${changed} dòng`);
})()
  .catch((e) => {
    console.error('LỖI:', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
