/**
 * Đặt (hoặc đặt lại) mật khẩu cho một Profile đã có — dùng cho tài khoản tạo từ trước khi có cột `password_hash`
 * (vd. đăng ký cũ qua Supabase) hoặc tài khoản Google muốn thêm đăng nhập bằng mật khẩu. Chưa có luồng "quên mật khẩu" trên UI.
 *
 *   npm run set:password -- you@example.com 'mat-khau-moi'
 */
import { hashPassword } from '../src/modules/auth/password-hasher';
import { prisma, refuseInProduction, run } from './auth-helpers';

run(async () => {
  refuseInProduction('set:password');
  const [rawEmail, password] = process.argv.slice(2);
  if (!rawEmail || !password) throw new Error('Usage: npm run set:password -- <email> <password>');
  if (password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự.');

  const email = rawEmail.trim().toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
  if (!profile) throw new Error(`Không có Profile nào với email ${email}.`);

  await prisma.profile.update({ where: { id: profile.id }, data: { passwordHash: await hashPassword(password) } });
  console.log(`Đã đặt mật khẩu cho ${email}`);
});
