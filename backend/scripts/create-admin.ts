/**
 * Tạo tài khoản Admin (email + mật khẩu). Admin không có đăng ký trên UI — đây là cách duy nhất.
 *
 *   npm run create:admin -- you@example.com 'mat-khau-manh' "Ten Day Du"
 */
import { PORTAL_ROLE } from '../src/modules/auth/auth.constants';
import { ensureAccount, run } from './auth-helpers';

run(async () => {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: npm run create:admin -- <email> <password> [full name]");
  }
  if (password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự.');

  const { created } = await ensureAccount({
    email,
    password,
    fullName: fullName ?? 'Admin',
    roleCode: PORTAL_ROLE.admin,
  });
  console.log(created ? `Đã tạo admin ${email}` : `Admin ${email} đã tồn tại — không thay đổi.`);
});
