/**
 * Dùng chung cho các script tạo tài khoản (create-admin, seed-auth). Chạy ngoài Nest nên tự dựng
 * PrismaClient. Tài khoản nằm hoàn toàn trong bảng `profiles` (mật khẩu băm scrypt) — không cần Supabase Auth.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ROLE_NAMES } from '../src/modules/auth/auth.constants';
import { hashPassword } from '../src/modules/auth/password-hasher';

export const prisma = new PrismaClient();

export async function ensureRole(code: string) {
  return prisma.role.upsert({ where: { code }, update: {}, create: { code, name: ROLE_NAMES[code] ?? code } });
}

/**
 * Tạo (nếu chưa có) Profile với vai trò + mật khẩu cho trước. Idempotent theo email.
 * Trả về id Profile và `created`. Profile đã có thì KHÔNG đổi mật khẩu.
 */
export async function ensureAccount(params: {
  email: string;
  password: string;
  fullName: string;
  roleCode: string;
}): Promise<{ id: string; created: boolean }> {
  const email = params.email.toLowerCase();
  const existing = await prisma.profile.findUnique({ where: { email }, include: { role: true } });
  if (existing) {
    if (existing.role.code !== params.roleCode) {
      throw new Error(`${email} đã tồn tại với vai trò ${existing.role.code}, không phải ${params.roleCode}`);
    }
    return { id: existing.id, created: false };
  }

  const role = await ensureRole(params.roleCode);
  const profile = await prisma.profile.create({
    data: {
      id: randomUUID(),
      email,
      fullName: params.fullName,
      roleId: role.id,
      isActive: true,
      passwordHash: await hashPassword(params.password),
    },
  });
  return { id: profile.id, created: true };
}

export function refuseInProduction(script: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${script} không được chạy khi NODE_ENV=production.`);
  }
}

export async function run(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
