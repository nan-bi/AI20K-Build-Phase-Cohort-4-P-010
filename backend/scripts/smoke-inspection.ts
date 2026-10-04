/**
 * Smoke luồng Ký gửi → Thẩm định → Tự niêm yết (11 bước) — hồ sơ planning/16_2026-10-04_Consign-Inspection-API, OPERATIONS §4.
 *
 * Cần backend đang chạy (`npm run start:dev`, :4000) với `.env` trỏ Supabase dev (Postgres + Storage bucket `consignment-photos`)
 * và OTP ở chế độ dev (trả `devCode`).
 *   npm run smoke:inspection               # chạy rồi tự dọn
 *   npm run smoke:inspection -- --cleanup  # chỉ dọn (dữ liệu tiền tố `inspect.smoke+`)
 *   npm run smoke:inspection -- --keep     # chạy, không dọn
 *
 * GHI vào DB + Storage mà backend đang trỏ tới, CHỈ dữ liệu tiền tố `inspect.smoke+` — KHÔNG sửa Host/hồ sơ thật nào.
 * Nếu có Inspector thật ít việc hơn nên được giao ca, script gán lại ca của CHÍNH hồ sơ smoke cho Inspector smoke.
 * Ảnh sinh trong script chỉ có HEADER JPEG hợp lệ (800×600): server kiểm theo header (B7), không giải mã ảnh.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { HostRole, PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { ensureAccount } from './auth-helpers';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
const PREFIX = 'inspect.smoke+';
const BUCKET = 'consignment-photos';
const PASSWORD = `Sm0ke-${randomBytes(6).toString('hex')}`;
const ZONE_BUILDING = 'S1.02';
const prisma = new PrismaClient();

class Client {
  private cookies = new Map<string, string>();
  raw = '';

  async call(method: string, path: string, body?: unknown | FormData): Promise<{ status: number; data: any; code?: string; headers: Headers; bytes: Buffer }> {
    const headers: Record<string, string> = {};
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
    const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const part = c.split(';')[0];
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!value || /max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    this.raw = bytes.toString('utf8');
    let parsed: any = null;
    if ((res.headers.get('content-type') ?? '').includes('json')) {
      try {
        parsed = JSON.parse(this.raw);
      } catch {
        /* không phải JSON */
      }
    }
    return { status: res.status, data: parsed?.success === true ? parsed.data : parsed, code: parsed?.code, headers: res.headers, bytes };
  }
}

let step = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  step += 1;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${step}. ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${step}. ${name}`);
}

/** JPEG chỉ có header SOF0 đúng kích thước (đủ cho kiểm tra theo header của server). */
function jpegHeader(w: number, h: number): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.alloc(2000, 0x55), Buffer.from([0xff, 0xd9])]);
}

function photoForm(buf: Buffer, fields: Record<string, string>): FormData {
  const f = new FormData();
  f.append('file', new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }), 'smoke.jpg');
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

async function login(c: Client, email: string, portal: 'landlord' | 'host') {
  const r = await c.call('POST', '/auth/login', { email, password: PASSWORD, portal });
  if (r.status !== 200) throw new Error(`${email} không đăng nhập được: ${r.status} ${r.code ?? ''}`);
}

/** Tầng cao nhất còn trống của toà S1.02 (căn smoke dùng cửa `SM`). */
async function freeFloor(buildingId: string, totalFloors: number) {
  for (let f = totalFloors; f >= 1; f -= 1) {
    if (!(await prisma.unit.findUnique({ where: { unitCode: `VHOP-${ZONE_BUILDING}-${f}SM` } }))) return f;
  }
  throw new Error('Toà không còn tầng trống để tạo căn smoke');
}

async function main() {
  const stamp = Date.now();
  const emailL = `${PREFIX}${stamp}-landlord@vinstay.test`;
  const emailI = `${PREFIX}${stamp}-inspector@vinstay.test`;
  const phone = `09${String(stamp).slice(-8)}`;
  const landlord = new Client();
  const inspector = new Client();
  const anon = new Client();

  const building = await prisma.building.findUnique({ where: { buildingCode: ZONE_BUILDING } });
  if (!building) throw new Error(`Không có toà ${ZONE_BUILDING}`);
  const floor = await freeFloor(building.id, building.totalFloors);

  // 1. Tạo chủ nhà + Inspector smoke (Prisma trực tiếp) → đăng nhập 2 phiên
  const accL = await ensureAccount({ email: emailL, password: PASSWORD, fullName: 'Chủ nhà Smoke', roleCode: 'landlord' });
  const accI = await ensureAccount({ email: emailI, password: PASSWORD, fullName: 'Thẩm định Smoke', roleCode: 'field_host' });
  const hostI = await prisma.fieldHost.create({ data: { profileId: accI.id, assignedZone: building.zoneName, roles: [HostRole.INSPECTOR] } });
  await login(landlord, emailL, 'landlord');
  await login(inspector, emailI, 'host');
  check('Tạo chủ nhà + Inspector smoke, đăng nhập 2 phiên', true, `tầng ${floor}`);

  // 2. Chủ nhà tạo + ký ủy quyền ⇒ awaiting_host, hostId = Inspector smoke
  let r = await landlord.call('POST', '/landlord/consignments', {
    building: ZONE_BUILDING, floor, door: 'SM', layout: '1PN', areaM2: 47, askRent: 6_500_000, furnished: true, locks: ['smart'], note: 'Smoke hồ sơ 16',
  });
  const consignmentId: string = r.data?.id;
  if (r.status !== 201 && r.status !== 200) throw new Error(`Không tạo được hồ sơ ký gửi: ${r.status} ${r.code ?? ''}`);
  const otp = await landlord.call('POST', `/landlord/consignments/${consignmentId}/send-otp`, { phone });
  r = await landlord.call('POST', `/landlord/consignments/${consignmentId}/sign`, { ownershipWarranted: true, otp: otp.data?.devCode, phone });
  let mandate = await prisma.exclusiveMandate.findUnique({ where: { id: consignmentId }, include: { unit: true } });
  let meta = (mandate?.doorAccessConfig as any)?.consignment;
  if (meta && meta.hostId !== hostI.id) {
    // Có Inspector thật ít việc hơn nên được giao: gán lại ca của hồ sơ SMOKE (dữ liệu của chính script) cho Inspector smoke.
    const cfg = { ...(mandate!.doorAccessConfig as object), consignment: { ...meta, hostId: hostI.id, offeredAt: new Date().toISOString() } };
    mandate = await prisma.exclusiveMandate.update({ where: { id: consignmentId }, data: { doorAccessConfig: cfg }, include: { unit: true } });
    meta = (mandate.doorAccessConfig as any).consignment;
  }
  check('Chủ nhà ký ⇒ awaiting_host, hostId = Inspector smoke', r.status === 200 && r.data?.status === 'awaiting_host' && meta?.hostId === hostI.id, `status ${r.status} stage ${r.data?.status} ${r.code ?? ''}`);
  const unitCode: string = mandate!.unit.unitCode;

  // 3. Inspector thấy ca ở `mine` → accept ⇒ inspecting
  r = await inspector.call('GET', '/host/inspections');
  const seen = r.data?.mine?.some((c: any) => c.id === consignmentId);
  const acc = await inspector.call('POST', `/host/inspections/${consignmentId}/accept`);
  check('Inspector thấy ca ở mine → accept ⇒ inspecting', r.status === 200 && seen && acc.status === 200 && acc.data?.stage === 'inspecting', `board ${r.status} accept ${acc.status} ${acc.code ?? ''}`);
  const detail = acc.data;

  // 4. Mã cửa: 200 hoặc door_code_missing (ghi kết quả)
  r = await inspector.call('POST', `/host/inspections/${consignmentId}/door-code`);
  const doorOk = r.status === 200 && ['ELECTRONIC_PIN', 'PHYSICAL_KEY'].includes(r.data?.type);
  const doorMissing = r.status === 409 && r.code === 'door_code_missing';
  check('door-code ⇒ 200 hoặc door_code_missing', doorOk || doorMissing, `status ${r.status} ${r.code ?? r.data?.type}`);

  // 5. Tải 1 ảnh/dòng present + 4 ảnh niêm yết
  const jpg = jpegHeader(800, 600);
  const lines: { code: string; group: string; name: string; liability: string; photoId?: string }[] = detail.catalog.map((c: any) => ({ ...c }));
  let uploaded = 0;
  let bytes = 0;
  let upFail = '';
  const listingIds: string[] = [];
  const upload = async (fields: Record<string, string>) => {
    const u = await inspector.call('POST', `/host/inspections/${consignmentId}/photos`, photoForm(jpg, { ...fields, sharpness: '120', brightness: '120', takenAt: new Date().toISOString() }));
    if (u.status !== 200 && u.status !== 201) upFail ||= `${fields.slot}: ${u.status} ${u.code ?? ''}`;
    else {
      uploaded += 1;
      bytes += jpg.length;
    }
    return u.data?.id as string | undefined;
  };
  for (const l of lines) l.photoId = await upload({ slot: l.code });
  const rooms = ['living_room', 'bedroom', 'kitchen', 'bathroom'];
  for (const room of rooms) {
    const id = await upload({ slot: 'listing', room });
    if (id) listingIds.push(id);
  }
  check('Tải 32 ảnh hạng mục + 4 ảnh niêm yết', !upFail && uploaded === 36 && listingIds.length === 4, `${uploaded} ảnh, ${bytes} byte${upFail ? ` — lỗi đầu: ${upFail}` : ''}`);

  // 6. Ảnh 400×300 ⇒ photo_too_small
  r = await inspector.call('POST', `/host/inspections/${consignmentId}/photos`, photoForm(jpegHeader(400, 300), { slot: 'X1' }));
  check('Ảnh 400×300 ⇒ 422 photo_too_small', r.status === 422 && r.code === 'photo_too_small', `status ${r.status} ${r.code ?? ''}`);

  // 7. Nộp "đạt" (kèm doorPin nếu cần)
  const needPin = doorMissing && mandate!.unit.doorLockType === 'ELECTRONIC_PIN';
  const body = {
    declared: ['identity', 'layout', 'areaM2', 'furnishing', 'lock'].map((field) => ({ field, ok: true })),
    inventory: lines.map((l) => ({ code: l.code, group: l.group, name: l.name, present: true, qty: 1, condition: 80, liability: l.liability, photoIds: [l.photoId] })),
    functions: { ac: true, kitchen: true, waterHeater: true, drainage: true },
    netAreaM2: 44,
    furnishing: 'full',
    listingPhotoIds: listingIds,
    recommendation: 'approve',
    ...(needPin ? { doorPin: '482910' } : {}),
  };
  const t0 = Date.now();
  r = await inspector.call('POST', `/host/inspections/${consignmentId}/submit`, body);
  check('submit approve ⇒ approved', r.status === 200 && r.data?.stage === 'approved' && r.data?.unitCode === unitCode, `status ${r.status} ${r.code ?? ''} field ${r.data?.field ?? ''}`);

  // 8. Catalog công khai (không đăng nhập) có căn; ảnh đầu tiên ⇒ 200 image/jpeg
  r = await anon.call('GET', `/properties/units?q=${encodeURIComponent(unitCode)}`);
  const ms = Date.now() - t0;
  const unitRow = (Array.isArray(r.data) ? r.data : r.data?.items ?? []).find((u: any) => u.code === unitCode);
  const first = await prisma.unitMedia.findFirst({ where: { unitId: mandate!.unitId }, orderBy: { order: 'asc' } });
  const img = first ? await anon.call('GET', first.url.replace(/^\/api\/v1/, '')) : null;
  check(
    'Catalog công khai có căn (< 3s từ submit) + ảnh đầu tiên 200 image/jpeg',
    !!unitRow && ms < 3000 && img?.status === 200 && img.headers.get('content-type') === 'image/jpeg',
    `${ms}ms · ảnh ${img?.status} ${img?.headers.get('content-type')}`,
  );

  // 9. Ảnh hạng mục KHÔNG ra route công khai
  const evidence = await prisma.exclusiveMandate.findUnique({ where: { id: consignmentId } });
  const evPhoto = ((evidence?.doorAccessConfig as any)?.consignment?.inspection?.photos ?? []).find((p: any) => p.slot === '1');
  r = evPhoto ? await anon.call('GET', `/media/listing/${consignmentId}/${evPhoto.id}.jpg`) : { status: 0 } as any;
  check('GET /media/listing/<mandateId>/<ảnh hạng mục> ⇒ 404', r.status === 404, `status ${r.status}`);

  // 10. Chủ nhà thấy căn + phiếu thẩm định
  const units = await landlord.call('GET', '/landlord/units');
  const cons = await landlord.call('GET', `/landlord/consignments/${consignmentId}`);
  const inUnits = JSON.stringify(units.data).includes(unitCode);
  check('Chủ nhà: /landlord/units có căn; consignments/:id có inspection.report', units.status === 200 && inUnits && cons.status === 200 && !!cons.data?.inspection?.report, `units ${units.status} detail ${cons.status}`);
}

/** 11. Dọn: unit_media, door key, mandate, unit, ảnh Storage, audit, tài khoản — in số dòng đã xoá. */
async function cleanup() {
  try {
    const profiles = await prisma.profile.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true, phoneHash: true } });
    const ids = profiles.map((p) => p.id);
    const phoneHashes = profiles.map((p) => p.phoneHash).filter((h): h is string => !!h);
    const hosts = await prisma.fieldHost.findMany({ where: { profileId: { in: ids } }, select: { id: true } });
    const units = await prisma.unit.findMany({ where: { landlordId: { in: ids } }, select: { id: true } });
    const unitIds = units.map((u) => u.id);
    const mandates = await prisma.exclusiveMandate.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } });
    const mandateIds = mandates.map((m) => m.id);

    // Storage: ảnh thẩm định `inspections/<mandateId>/*` + ảnh tham khảo `<landlordId>/<mandateId>/*`
    let files = 0;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const bucket = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).storage.from(BUCKET);
      const dirs = [...mandateIds.map((m) => `inspections/${m}`), ...ids.flatMap((l) => mandateIds.map((m) => `${l}/${m}`))];
      for (const dir of dirs) {
        const { data } = await bucket.list(dir, { limit: 200 });
        const paths = (data ?? []).map((f) => `${dir}/${f.name}`);
        if (paths.length) {
          await bucket.remove(paths);
          files += paths.length;
        }
      }
    }
    const media = await prisma.unitMedia.deleteMany({ where: { unitId: { in: unitIds } } });
    const keys = await prisma.doorAccessKey.deleteMany({ where: { unitId: { in: unitIds } } });
    const audits = await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: [...unitIds, ...mandateIds, ...hosts.map((h) => h.id)] } }] },
    });
    const man = await prisma.exclusiveMandate.deleteMany({ where: { id: { in: mandateIds } } });
    const un = await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
    const otp = await prisma.otpCode.deleteMany({ where: { phoneHash: { in: phoneHashes } } });
    const au = await prisma.authAuditLog.deleteMany({ where: { userId: { in: ids } } });
    const fh = await prisma.fieldHost.deleteMany({ where: { id: { in: hosts.map((h) => h.id) } } });
    const pr = await prisma.profile.deleteMany({ where: { id: { in: ids } } });
    step += 1;
    console.log(
      `[INFO] ${step}. Dọn: unit_media ${media.count} · door_keys ${keys.count} · mandates ${man.count} · units ${un.count} · ảnh Storage ${files} · audit_logs ${audits.count} · otp ${otp.count} · auth_audit ${au.count} · field_hosts ${fh.count} · profiles ${pr.count}`,
    );
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
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    process.exit(process.exitCode ? 1 : 0);
  }
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
  console.log(ok ? `\nSMOKE OK — ${step - 1}/${step - 1} PASS` : `\nSMOKE FAIL — ${failures.length} bước lỗi: ${failures.join(' | ')}`);
  process.exit(ok && !process.exitCode ? 0 : 1);
})();
