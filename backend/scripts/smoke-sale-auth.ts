/**
 * Smoke đăng nhập Field Host + Admin CRUD Host (17 bước) — hồ sơ planning/14_2026-10-04_Sale-Auth, OPERATIONS §3.
 *
 * Cần backend đang chạy với AUTH_DEMO_MODE=true và `npm run seed:auth -- --demo` đã chạy (Admin demo).
 *   npm run smoke:sale-auth            # chạy rồi tự dọn dữ liệu `sale.smoke+...`
 *   npm run smoke:sale-auth -- --keep  # không dọn
 *
 * Ghi vào DB mà backend đang trỏ tới (Supabase dev). Dọn chỉ xoá dữ liệu có tiền tố email `sale.smoke+`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS } from '../src/modules/auth/demo-accounts';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
const PREFIX = 'sale.smoke+';
const PASSWORD = 'Smoke-Matkhau-1';

class Client {
  private cookies = new Map<string, string>();
  raw = '';

  async call(method: string, path: string, body?: unknown): Promise<{ status: number; data: any; code?: string }> {
    const headers: Record<string, string> = {};
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const part = c.split(';')[0];
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!value || /max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    this.raw = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(this.raw);
    } catch {
      /* body không phải JSON */
    }
    return { status: res.status, data: parsed?.success === true ? parsed.data : parsed, code: parsed?.code };
  }
}

let step = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  step += 1;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${step}. ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${step}. ${name}`);
}

async function main() {
  const stamp = Date.now();
  const emailA = `${PREFIX}${stamp}@vinstay.test`;
  const admin = new Client();
  const hostA = new Client();

  let r = await admin.call('POST', '/auth/demo-login', { portal: 'admin' });
  check('Admin demo-login', r.status === 200, `status ${r.status}${r.status === 200 ? '' : ' — cần AUTH_DEMO_MODE=true và seed:auth --demo'}`);
  if (r.status !== 200) throw new Error('Không đăng nhập được Admin demo');

  r = await admin.call('GET', '/admin/field-hosts/zones');
  const zones: string[] = Array.isArray(r.data) ? r.data : [];
  check('GET /admin/field-hosts/zones', r.status === 200 && zones.length >= 1, `${zones.length} phân khu`);
  const zone = zones[0];

  r = await admin.call('POST', '/admin/field-hosts', { email: emailA, fullName: 'Sale Smoke', assignedZone: zone, roles: ['sale', 'inspector'], password: PASSWORD });
  const hostId: string = r.data?.id;
  check('Tạo Host A (2 vai, có mật khẩu)', r.status === 200 && r.data?.hasPassword === true && JSON.stringify(r.data?.roles) === '["sale","inspector"]', `status ${r.status} ${r.code ?? ''}`);

  r = await admin.call('POST', '/admin/field-hosts', { email: emailA.toUpperCase(), fullName: 'Trùng', assignedZone: zone, roles: ['sale'] });
  check('Tạo Host cùng email (viết hoa) → host_already_exists', r.status === 409 && r.code === 'host_already_exists', `status ${r.status} ${r.code ?? ''}`);

  r = await admin.call('POST', '/admin/field-hosts', { email: `${PREFIX}${stamp}-x@vinstay.test`, fullName: 'Rỗng vai', assignedZone: zone, roles: [] });
  check('Tạo Host roles rỗng → 400', r.status === 400, `status ${r.status}`);

  r = await admin.call('POST', '/admin/field-hosts', { email: DEMO_ACCOUNTS.tenant.email, fullName: 'Khách', assignedZone: zone, roles: ['sale'] });
  check('Tạo Host bằng email tenant → account_conflict', r.status === 409 && r.code === 'account_conflict', `status ${r.status} ${r.code ?? ''}`);

  r = await new Client().call('POST', '/auth/signup', { email: `${PREFIX}${stamp}-s@vinstay.test`, password: PASSWORD, fullName: 'Tự đăng ký', portal: 'host' });
  check('Signup cổng host → signup_not_allowed', r.status === 403 && r.code === 'signup_not_allowed', `status ${r.status} ${r.code ?? ''}`);

  r = await hostA.call('POST', '/auth/login', { email: emailA, password: PASSWORD, portal: 'host' });
  check('Host A đăng nhập', r.status === 200 && JSON.stringify(r.data?.user?.hostRoles) === '["sale","inspector"]' && !('needsRfidVerification' in (r.data ?? {})), `status ${r.status} ${r.code ?? ''}`);

  r = await hostA.call('GET', '/host/me');
  check('Host A GET /host/me', r.status === 200 && r.data?.assignedZone === zone && !/passwordHash|phoneEnc|rfid/i.test(hostA.raw), `status ${r.status}`);

  r = await hostA.call('GET', '/admin/field-hosts');
  check('Host A gọi /admin/field-hosts → 403', r.status === 403, `status ${r.status}`);

  r = await admin.call('PATCH', `/admin/field-hosts/${hostId}`, { roles: ['inspector'] });
  check('Admin đổi vai → chỉ Thẩm định', r.status === 200 && JSON.stringify(r.data?.roles) === '["inspector"]', `status ${r.status}`);

  r = await hostA.call('GET', '/auth/session');
  check('Phiên Host A đọc lại vai ngay (không đăng nhập lại)', JSON.stringify(r.data?.user?.hostRoles) === '["inspector"]', JSON.stringify(r.data?.user?.hostRoles));

  r = await admin.call('GET', `/admin/field-hosts/${hostId}`);
  const keys = Object.keys(r.data?.ticketStats ?? {});
  check('Admin xem hồ sơ Host: ticketStats đủ 7 khoá, không lộ băm', r.status === 200 && keys.length === 7 && !/passwordHash|scrypt\$/.test(admin.raw), `${keys.length} khoá`);

  r = await admin.call('DELETE', `/admin/field-hosts/${hostId}`);
  check('Admin khoá Host A', r.status === 200 && r.data?.isActive === false, `status ${r.status} ${r.code ?? ''}`);

  r = await hostA.call('GET', '/auth/session');
  const relogin = await new Client().call('POST', '/auth/login', { email: emailA, password: PASSWORD, portal: 'host' });
  check('Phiên cũ mất hiệu lực; đăng nhập lại → account_suspended', r.data?.user === null && relogin.status === 403 && relogin.code === 'account_suspended', `${relogin.status} ${relogin.code ?? ''}`);

  r = await admin.call('PATCH', `/admin/field-hosts/${hostId}`, { isActive: true });
  const back = await new Client().call('POST', '/auth/login', { email: emailA, password: PASSWORD, portal: 'host' });
  check('Mở khoá → đăng nhập lại được', r.status === 200 && back.status === 200, `${r.status}/${back.status}`);

  r = await new Client().call('POST', '/auth/verify-rfid', { hostId, rfid: 'x' });
  check('POST /auth/verify-rfid → 404 (đã xoá)', r.status === 404, `status ${r.status}`);
}

async function cleanup() {
  const prisma = new PrismaClient();
  try {
    const profiles = await prisma.profile.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } });
    const ids = profiles.map((p) => p.id);
    const hosts = await prisma.fieldHost.findMany({ where: { profileId: { in: ids } }, select: { id: true } });
    const hostIds = hosts.map((h) => h.id);
    const a = await prisma.auditLog.deleteMany({ where: { entityName: 'field_hosts', entityId: { in: hostIds } } });
    const b = await prisma.authAuditLog.deleteMany({ where: { userId: { in: ids } } });
    const c = await prisma.fieldHost.deleteMany({ where: { id: { in: hostIds } } });
    const d = await prisma.profile.deleteMany({ where: { id: { in: ids } } });
    console.log(`Dọn: audit_logs ${a.count} · auth_audit_log ${b.count} · field_hosts ${c.count} · profiles ${d.count}`);
    const left = await prisma.profile.count({ where: { email: { startsWith: PREFIX } } });
    console.log(`Còn lại profiles '${PREFIX}%': ${left}`);
    if (left !== 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Không chạy smoke ở production.');
    process.exit(2);
  }
  console.log(`Base URL: ${BASE_URL}`);
  let crashed: unknown;
  try {
    await main();
  } catch (err) {
    crashed = err;
    console.error((err as Error).message);
  }
  if (!process.argv.includes('--keep')) await cleanup();
  const ok = !crashed && failures.length === 0;
  console.log(ok ? `\nSMOKE OK — ${step}/${step} PASS` : `\nSMOKE FAIL — ${failures.length} bước lỗi: ${failures.join(' | ')}`);
  process.exit(ok && !process.exitCode ? 0 : 1);
})();
