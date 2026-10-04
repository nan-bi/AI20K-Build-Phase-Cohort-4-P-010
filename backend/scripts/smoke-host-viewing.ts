/**
 * Smoke cổng Sale "Lịch & yêu cầu" (15 bước) — hồ sơ planning/15_2026-10-04_Host-Schedule-Requests, OPERATIONS §4.
 *
 * Cần backend đang chạy với AUTH_DEMO_MODE=true, `npm run seed:auth -- --demo` đã chạy (Admin demo) và
 * `npm run rekey:door-codes -- --apply` đã chạy (căn có mã cửa `aes:`).
 *   npm run smoke:host-viewing            # chạy rồi tự dọn dữ liệu `host.smoke+...`
 *   npm run smoke:host-viewing -- --keep  # không dọn
 *
 * Ghi vào DB mà backend đang trỏ tới (Supabase dev). Tạm đặt OFF_DUTY các Sale THẬT cùng phân khu để ticket chắc chắn
 * giao Sale A, rồi trả lại đúng trạng thái cũ ở bước dọn. KHÔNG đụng trạng thái căn (không tạo cọc).
 */
import 'dotenv/config';
import { DoorLockType, HostDutyStatus, PrismaClient, UnitStatus } from '@prisma/client';
import { PhoneService } from '../src/modules/auth/phone/phone.service';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
const PREFIX = 'host.smoke+';
const PASSWORD = 'Smoke-Matkhau-1';
const prisma = new PrismaClient();
const phones = new PhoneService({ get: (k: string) => process.env[k] } as any);

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

/** Trạng thái duty của Sale thật đã tạm tắt — trả lại ở bước dọn. */
const parked: { id: string; duty: HostDutyStatus }[] = [];
let smokePhoneHash: string | null = null;

async function pickUnit() {
  const rows = await prisma.unit.findMany({
    where: {
      status: UnitStatus.AVAILABLE,
      isVerified: true,
      doorLockType: DoorLockType.ELECTRONIC_PIN,
      media: { some: {} },
      doorKey: { is: { vaultSecretRef: { startsWith: 'aes:' } } },
    },
    include: { building: true },
    orderBy: { unitCode: 'asc' },
    take: 30,
  });
  return rows[0] ?? null;
}

async function freeSlot(tenant: Client, unitCode: string): Promise<string> {
  const busyRes = await tenant.call('GET', `/properties/units/${unitCode}/busy-slots`);
  const busy: string[] = Array.isArray(busyRes.data) ? busyRes.data : busyRes.data?.slots ?? [];
  for (let d = 2; d <= 10; d++) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + d);
    for (const [h, m] of [[1, 30], [2, 30], [3, 30], [7, 30], [8, 30]]) {
      const iso = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m)).toISOString();
      if (!busy.includes(iso)) return iso;
    }
  }
  throw new Error('Không tìm được khung giờ trống');
}

async function main() {
  const stamp = Date.now();
  const admin = new Client();
  const saleA = new Client();
  const saleB = new Client();
  const tenant = new Client();
  const emailA = `${PREFIX}${stamp}-a@vinstay.test`;
  const emailB = `${PREFIX}${stamp}-b@vinstay.test`;
  const emailT = `${PREFIX}${stamp}-t@vinstay.test`;
  const phone = `09${String(stamp).slice(-8)}`;
  smokePhoneHash = phones.hash(phones.normalize(phone) as string);

  const unit = await pickUnit();
  if (!unit) throw new Error('Không có căn AVAILABLE nào có mã cửa `aes:` — chạy `npm run rekey:door-codes -- --apply` trước');
  const zone = unit.building.zoneName;
  console.log(`Căn thử: ${unit.unitCode} · phân khu ${zone}`);

  let r = await admin.call('POST', '/auth/demo-login', { portal: 'admin' });
  if (r.status !== 200) throw new Error(`Không đăng nhập được Admin demo (status ${r.status}) — cần AUTH_DEMO_MODE=true và seed:auth --demo`);

  // Tạm tắt các Sale thật cùng phân khu để ticket chắc chắn giao Sale A.
  const existing = await prisma.fieldHost.findMany({
    where: { assignedZone: { contains: zone }, dutyStatus: { not: HostDutyStatus.OFF_DUTY } },
    select: { id: true, dutyStatus: true },
  });
  for (const h of existing) parked.push({ id: h.id, duty: h.dutyStatus });
  if (parked.length) await prisma.fieldHost.updateMany({ where: { id: { in: parked.map((p) => p.id) } }, data: { dutyStatus: HostDutyStatus.OFF_DUTY } });

  // Tạo Sale A trước B: hoà số ca & rating ⇒ A (vào hệ thống sớm hơn) thắng tie-break.
  for (const [email, name] of [[emailA, 'Sale Smoke A'], [emailB, 'Sale Smoke B']]) {
    r = await admin.call('POST', '/admin/field-hosts', { email, fullName: name, assignedZone: zone, roles: ['sale'], password: PASSWORD });
    if (r.status !== 200) throw new Error(`Không tạo được ${email}: ${r.status} ${r.code ?? ''}`);
  }
  for (const [c, email] of [[saleA, emailA], [saleB, emailB]] as const) {
    r = await c.call('POST', '/auth/login', { email, password: PASSWORD, portal: 'host' });
    if (r.status !== 200) throw new Error(`Sale ${email} không đăng nhập được: ${r.status} ${r.code ?? ''}`);
    r = await c.call('PATCH', '/host/me/duty', { status: 'ONLINE_AVAILABLE' });
    if (r.status !== 200) throw new Error(`Không bật trực: ${r.status} ${r.code ?? ''}`);
  }

  r = await tenant.call('POST', '/auth/signup', { email: emailT, password: PASSWORD, fullName: 'Khách Smoke', portal: 'tenant' });
  if (r.status !== 200) throw new Error(`Không đăng ký khách: ${r.status} ${r.code ?? ''}`);
  const otp = await tenant.call('POST', '/auth/otp/send', { phone, purpose: 'TENANT_VIEWING' });
  const ver = await tenant.call('POST', '/auth/otp/verify', { phone, purpose: 'TENANT_VIEWING', code: otp.data?.devCode });
  if (!ver.data?.actionToken) throw new Error('Không có actionToken — cần OTP devCode (AUTH_DEMO_MODE/dev)');

  // 1. Khách đặt lịch → ticket tier 1 → Sale A
  const slot = await freeSlot(tenant, unit.unitCode);
  r = await tenant.call('POST', '/bookings', { unitCode: unit.unitCode, slot, contactName: 'Khách Smoke', phone, partySize: 2, actionToken: ver.data.actionToken });
  const ref: string = r.data?.ref;
  const profA = await prisma.profile.findUnique({ where: { email: emailA } });
  const hostA = await prisma.fieldHost.findFirst({ where: { profileId: profA!.id } });
  const ticket1 = ref ? await prisma.dispatchTicket.findFirst({ where: { viewing: { bookingRefCode: ref } } }) : null;
  check('Khách đặt lịch → ticket tier 1 giao Sale A', r.status === 201 && ticket1?.hostId === hostA?.id && ticket1?.tier === 1, `status ${r.status} ref ${ref} tier ${ticket1?.tier}`);

  // 2–3. Bảng của B / A
  r = await saleB.call('GET', '/host/board');
  check('Sale B GET /host/board: không thấy ticket của A', r.status === 200 && !r.data?.requests?.some((q: any) => q.ref === ref), `status ${r.status}`);

  r = await saleA.call('GET', '/host/board');
  const card = r.data?.requests?.find((q: any) => q.ref === ref);
  check('Sale A board: thấy ticket ASSIGNED, SĐT che', r.status === 200 && card?.tier === 'ASSIGNED' && card?.canAccept === true && !saleA.raw.includes(phone) && card?.tenant?.phoneMasked?.includes('•'), `tier ${card?.tier} ${card?.tenant?.phoneMasked}`);

  // 4. A từ chối → ticket mới giao B
  r = await saleA.call('POST', `/host/tickets/${card?.ticketId}/reject`, { reason: 'Smoke: đang có việc khác' });
  const live = ref ? await prisma.dispatchTicket.findFirst({ where: { viewing: { bookingRefCode: ref }, status: 'OFFERED' } }) : null;
  const profB = await prisma.profile.findUnique({ where: { email: emailB } });
  const hostB = await prisma.fieldHost.findFirst({ where: { profileId: profB!.id } });
  check('Sale A reject → ticket mới giao Sale B', r.status === 200 && live?.hostId === hostB?.id, `status ${r.status} ${r.code ?? ''}`);

  // 5. B nhận
  r = await saleB.call('GET', '/host/board');
  const cardB = r.data?.requests?.find((q: any) => q.ref === ref);
  r = await saleB.call('POST', `/host/tickets/${cardB?.ticketId}/accept`);
  const tb = await tenant.call('GET', `/bookings/${ref}`);
  check('Sale B accept → confirmed; khách thấy host = Sale B', r.status === 200 && r.data?.status === 'confirmed' && tb.data?.host?.name === 'Sale Smoke B', `status ${r.status} ${r.code ?? ''} host ${tb.data?.host?.name}`);

  // 6. A không đọc được ca của B
  r = await saleA.call('GET', `/host/viewings/${ref}`);
  check('Sale A GET ca của B → 404 viewing_not_found', r.status === 404 && r.code === 'viewing_not_found', `status ${r.status} ${r.code ?? ''}`);

  // 7. Nhắc quá sớm
  r = await saleB.call('POST', `/host/viewings/${ref}/remind`);
  check('Sale B remind sớm → 409 too_early_reminder', r.status === 409 && r.code === 'too_early_reminder', `status ${r.status} ${r.code ?? ''}`);

  // 8. Khách check-in sảnh → lobbyNow
  const lobby = await tenant.call('POST', `/bookings/${ref}/lobby-checkin`);
  r = await saleB.call('GET', '/host/board');
  check('Khách check-in sảnh → board B có lobbyNow', [200, 201].includes(lobby.status) && r.data?.lobbyNow === ref, `lobby ${lobby.status} lobbyNow ${r.data?.lobbyNow}`);

  // 9. Đón khách
  r = await saleB.call('POST', `/host/viewings/${ref}/receive`);
  const boardNow = await saleB.call('GET', '/host/board');
  check('Sale B receive → receiving, Sale bận', r.status === 200 && r.data?.status === 'receiving' && boardNow.data?.dutyStatus === 'BUSY_VIEWING', `status ${r.status} duty ${boardNow.data?.dutyStatus}`);

  // 10. Không tắt trực khi đang dẫn
  r = await saleB.call('PATCH', '/host/me/duty', { status: 'OFF_DUTY' });
  check('Sale B tắt trực khi đang dẫn → 409 host_busy', r.status === 409 && r.code === 'host_busy', `status ${r.status} ${r.code ?? ''}`);

  // 11. Mở cửa
  const before = await prisma.auditLog.count({ where: { entityName: 'Unit', entityId: unit.id, actionType: 'DOOR_KEY_REVEAL' } });
  r = await saleB.call('POST', `/host/viewings/${ref}/open-door`);
  const pin: string | undefined = r.data?.door?.pin;
  const after = await prisma.auditLog.findMany({ where: { entityName: 'Unit', entityId: unit.id, actionType: 'DOOR_KEY_REVEAL' } });
  check(
    'Sale B open-door → viewing + PIN 4–10 số; audit +1 và không chứa PIN',
    r.status === 200 && r.data?.viewing?.status === 'viewing' && /^\d{4,10}$/.test(pin ?? '') && after.length === before + 1 && !JSON.stringify(after).includes(pin ?? '~~'),
    `status ${r.status} ${r.code ?? ''} audit ${before}→${after.length}`,
  );

  // 12. Khách không thấy PIN
  const tv = await tenant.call('GET', `/bookings/${ref}`);
  check('Khách GET /bookings/:ref không chứa PIN', tv.status === 200 && !!pin && !tenant.raw.includes(pin), `status ${tv.status}`);

  // 13. Khách muốn cọc
  r = await saleB.call('POST', `/host/viewings/${ref}/start-deposit`);
  const b13 = await saleB.call('GET', '/host/board');
  check('Sale B start-deposit → closing; Sale về ONLINE', r.status === 200 && r.data?.status === 'closing' && b13.data?.dutyStatus === 'ONLINE_AVAILABLE', `status ${r.status} duty ${b13.data?.dutyStatus}`);

  // 14. Khách chưa quyết
  r = await saleB.call('POST', `/host/viewings/${ref}/not-interested`, { reason: 'Smoke: khách cần cân nhắc thêm' });
  const tk = await prisma.dispatchTicket.findFirst({ where: { viewing: { bookingRefCode: ref }, hostId: hostB?.id } });
  const tn = await tenant.call('GET', `/bookings/${ref}`);
  check('Sale B not-interested → completed; ticket COMPLETED; khách vẫn thấy host', r.status === 200 && r.data?.status === 'completed' && tk?.status === 'COMPLETED' && tn.data?.host?.name === 'Sale Smoke B', `status ${r.status} ticket ${tk?.status}`);

  // 15. Route giả đã xoá
  r = await saleB.call('POST', '/dispatch/tickets/x/reveal-key');
  check('POST /dispatch/tickets/x/reveal-key → 404', r.status === 404, `status ${r.status}`);
}

async function cleanup() {
  try {
    const profiles = await prisma.profile.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } });
    const ids = profiles.map((p) => p.id);
    const hosts = await prisma.fieldHost.findMany({ where: { profileId: { in: ids } }, select: { id: true } });
    const hostIds = hosts.map((h) => h.id);
    const viewings = await prisma.viewing.findMany({ where: { tenantId: { in: ids } }, select: { id: true } });
    const viewingIds = viewings.map((v) => v.id);

    const a = await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityName: 'field_hosts', entityId: { in: hostIds } }, { entityName: 'viewings', entityId: { in: viewingIds } }] },
    });
    const t = await prisma.dispatchTicket.deleteMany({ where: { OR: [{ viewingId: { in: viewingIds } }, { hostId: { in: hostIds } }] } });
    const v = await prisma.viewing.deleteMany({ where: { id: { in: viewingIds } } });
    const o = await prisma.otpCode.deleteMany({ where: { phoneHash: smokePhoneHash ?? '-' } });
    const au = await prisma.authAuditLog.deleteMany({ where: { userId: { in: ids } } });
    const f = await prisma.fieldHost.deleteMany({ where: { id: { in: hostIds } } });
    const p = await prisma.profile.deleteMany({ where: { id: { in: ids } } });
    for (const h of parked) await prisma.fieldHost.update({ where: { id: h.id }, data: { dutyStatus: h.duty } });
    console.log(`Dọn: audit_logs ${a.count} · tickets ${t.count} · viewings ${v.count} · otp ${o.count} · auth_audit ${au.count} · field_hosts ${f.count} · profiles ${p.count} · trả duty ${parked.length} Sale thật`);
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
  else await prisma.$disconnect();
  const ok = !crashed && failures.length === 0;
  console.log(ok ? `\nSMOKE OK — ${step}/${step} PASS` : `\nSMOKE FAIL — ${failures.length} bước lỗi: ${failures.join(' | ')}`);
  process.exit(ok && !process.exitCode ? 0 : 1);
})();
