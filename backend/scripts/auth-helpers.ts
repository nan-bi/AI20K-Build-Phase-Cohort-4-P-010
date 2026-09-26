/**
 * Dùng chung cho các script tạo tài khoản (create-admin, seed-auth). Chạy ngoài Nest nên tự dựng
 * PrismaClient + Supabase admin client. Cần SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY thật trong .env.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ROLE_NAMES } from '../src/modules/auth/auth.constants';

export const prisma = new PrismaClient();

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-project-ref')) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY thật trong backend/.env');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function ensureRole(code: string) {
  return prisma.role.upsert({ where: { code }, update: {}, create: { code, name: ROLE_NAMES[code] ?? code } });
}

/**
 * Tạo (nếu chưa có) tài khoản Supabase đã xác nhận email + Profile với vai trò cho trước.
 * Idempotent theo email của Profile. Trả về id Profile và `created`.
 */
export async function ensureAccount(
  supabase: SupabaseClient,
  params: { email: string; password: string; fullName: string; roleCode: string },
): Promise<{ id: string; created: boolean }> {
  const email = params.email.toLowerCase();
  const existing = await prisma.profile.findUnique({ where: { email }, include: { role: true } });
  if (existing) {
    if (existing.role.code !== params.roleCode) {
      throw new Error(`${email} đã tồn tại với vai trò ${existing.role.code}, không phải ${params.roleCode}`);
    }
    return { id: existing.id, created: false };
  }

  const role = await ensureRole(params.roleCode);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
  });
  let userId = data?.user?.id;
  let createdUser = Boolean(userId);
  if (!userId) {
    // User Supabase đã có (vd. Profile cũ bị xoá khi đổi schema): dùng lại và đặt mật khẩu mới.
    const existingUser = await findAuthUserByEmail(supabase, email);
    if (!existingUser) {
      throw new Error(`Không tạo được user Supabase cho ${email}: ${error?.message ?? 'unknown error'}`);
    }
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: params.password,
      email_confirm: true,
    });
    if (updateError) throw new Error(`Không đặt lại mật khẩu cho ${email}: ${updateError.message}`);
    userId = existingUser.id;
    createdUser = false;
  }

  try {
    await prisma.profile.create({
      data: { id: userId, email, fullName: params.fullName, roleId: role.id, isActive: true },
    });
  } catch (err) {
    // Không để lại user Supabase mồ côi không đăng nhập được (chỉ xoá user do chính lần chạy này tạo).
    if (createdUser) await supabase.auth.admin.deleteUser(userId);
    throw err;
  }
  return { id: userId, created: true };
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
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
