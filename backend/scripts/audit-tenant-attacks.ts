/**
 * Thẩm định đối kháng cổng Khách thuê (WP7 · TESTING-ACCEPTANCE G5).
 * Mỗi vector là một cách PHÁ; PASS nghĩa là hệ thống chặn đúng. Thoát 0 chỉ khi mọi vector PASS.
 *
 * Chạy (backend đã chạy với DEMO_TOOLS=true, OTP_ECHO_DEV_CODE=true, VIETQR_WEBHOOK_SECRET đặt sẵn, DB cục bộ):
 *   VIETQR_WEBHOOK_SECRET=... DATABASE_URL=postgresql://postgres@localhost:55432/vinstay_dev \
 *     npm run audit:tenant
 * Dọn dữ liệu: npm run smoke:tenant -- --cleanup --prefix=audit+
 * CHỈ DB cục bộ: script kiểm DB trực tiếp nên từ chối DATABASE_URL không phải localhost.
 */
import { PrismaClient } from '@prisma/client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api/v1';
const SECRET = process.env.VIETQR_WEBHOOK_SECRET || '';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:55432/vinstay_dev';
if (!/^postgres(ql)?:\/\/[^/]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DB_URL) || process.env.NODE_ENV === 'production') {
  throw new Error('audit:tenant chỉ chạy với DATABASE_URL trỏ localhost và NODE_ENV khác production.');
}
const prisma = new PrismaClient({ datasourceUrl: DB_URL });

type Res = { status: number; data: any; text: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Client {
  private jar = new Map<string, string>();
  async call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
    const h = new Headers(headers);
    if (this.jar.size) h.set('cookie', [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '));
    if (body !== undefined) h.set('content-type', 'application/json');
    const res = await fetch(`${BASE}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const part = c.split(';')[0];
      const i = part.indexOf('=');
      if (i > 0) this.jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
    }
    const text = res.headers.get('content-type')?.includes('pdf') ? '%PDF' : await res.text();
    let data: any = text;
    try {
      const p = JSON.parse(text);
      data = p && p.success === true && 'data' in p ? p.data : p;
    } catch {
      /* giữ text */
    }
    return { status: res.status, data, text };
  }
  /** Gọi dùng cho DỰNG tình huống: gặp 429 thì chờ rồi thử lại (throttle OTP 5 lần/phút). */
  async setup(method: string, path: string, body?: unknown): Promise<Res> {
    for (let i = 0; i < 6; i++) {
      const r = await this.call(method, path, body);
      if (r.status !== 429) return r;
      await sleep(15_000);
    }
    throw new Error(`429 kéo dài ở ${method} ${path}`);
  }
  get = (p: string) => this.call('GET', p);
  post = (p: string, b?: unknown, h?: Record<string, string>) => this.call('POST', p, b ?? {}, h);
}

let pass = 0;
let fail = 0;
const lines: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  (ok ? pass++ : fail++);
  const l = `[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? `\n       ${detail}` : ''}`;
  lines.push(l);
  console.log(l);
}
const code = (r: Res) => r.data?.code ?? '';
const brief = (r: Res) => `HTTP ${r.status}${code(r) ? ` ${code(r)}` : ''}`;
const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const stamp = Date.now();
let seq = 0;
const phone = () => '09' + String(10000000 + ((stamp + ++seq * 7919) % 89999999));

async function newTenant(label: string) {
  const c = new Client();
  const email = `audit+${label}_${stamp}@vinstay.test`;
  const s = await c.setup('POST', '/auth/signup', { email, password: 'Password123!', fullName: `Audit ${label}`, portal: 'tenant' });
  if (s.status !== 200) throw new Error(`signup ${label} ${brief(s)}`);
  return { c, email, id: s.data?.user?.id as string, phone: phone() };
}

async function otpToken(t: { c: Client; phone: string }, purpose = 'TENANT_VIEWING') {
  const s = await t.c.setup('POST', '/auth/otp/send', { phone: t.phone, purpose });
  const v = await t.c.setup('POST', '/auth/otp/verify', { phone: t.phone, purpose, code: s.data?.devCode });
  return v.data?.actionToken as string;
}

/** Slot hợp lệ chưa bận của căn, tìm theo từng ngày để mỗi lần gọi trả slot khác nhau. */
async function freeSlot(c: Client, unitCode: string, skip = 0): Promise<string> {
  const busy = (await c.get(`/properties/units/${unitCode}/busy-slots`)).data?.slots ?? [];
  const out: string[] = [];
  for (let d = 1; d <= 12; d++) {
    for (const [h, m] of [[1, 30], [2, 30], [3, 30], [7, 30], [8, 30], [9, 30], [10, 30]]) {
      const t = new Date(Date.now());
      t.setUTCDate(t.getUTCDate() + d);
      const iso = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), h, m)).toISOString();
      if (!busy.includes(iso)) out.push(iso);
    }
  }
  return out[skip];
}

async function availableUnits(c: Client, n: number): Promise<string[]> {
  const list = (await c.get('/properties/units')).data;
  const arr = Array.isArray(list) ? list : list?.data ?? [];
  const ok = arr.filter((u: any) => u.status === 'available').map((u: any) => u.code as string);
  if (ok.length < n) throw new Error(`Chỉ còn ${ok.length} căn available, cần ${n}. Chạy: npm run smoke:tenant -- --cleanup`);
  return ok.slice(-n); // lấy cuối danh sách để ít đụng căn smoke thường chọn
}

async function book(t: { c: Client; phone: string }, unitCode: string, slotIdx = 0, name = 'Audit Tenant') {
  const token = await otpToken(t);
  const slot = await freeSlot(t.c, unitCode, slotIdx);
  const r = await t.c.setup('POST', '/bookings', { unitCode, slot, contactName: name, phone: t.phone, partySize: 1, actionToken: token });
  if (r.status !== 201) throw new Error(`book ${unitCode} ${brief(r)}`);
  return { ref: r.data.ref as string, slot };
}

const demo = (c: Client, ref: string, step: string) => c.post(`/demo/bookings/${ref}/${step}`);

async function toClosing(t: { c: Client; phone: string }, unitCode: string, slotIdx = 0) {
  const { ref } = await book(t, unitCode, slotIdx);
  await demo(t.c, ref, 'host-accept');
  await t.c.post(`/bookings/${ref}/lobby-checkin`);
  for (const s of ['host-receive', 'host-view', 'host-start-deposit']) await demo(t.c, ref, s);
  return ref;
}

async function termsVersion(c: Client, ref: string): Promise<string> {
  return (await c.get(`/bookings/${ref}/deposit/terms`)).data?.version;
}

async function toHolding(t: { c: Client; phone: string }, unitCode: string) {
  const ref = await toClosing(t, unitCode);
  const dep = await t.c.post(`/bookings/${ref}/deposit`, { acceptTerms: true, termsVersion: await termsVersion(t.c, ref) });
  if (dep.status !== 201) throw new Error(`deposit ${brief(dep)}`);
  const paid = await demo(t.c, ref, 'bank-paid');
  if (paid.data?.status !== 'holding') throw new Error(`bank-paid → ${paid.data?.status}`);
  return ref;
}

async function main() {
  console.log(`Thẩm định đối kháng cổng Khách · ${BASE}\n`);
  const A = await newTenant('A');
  const B = await newTenant('B');
  const anon = new Client();
  const units = await availableUnits(A.c, 4);

  // ───────── V1. Cô lập giữa các khách (B3) ─────────
  console.log('— V1. Khách B tấn công lịch của khách A —');
  const refA = await toClosing(A, units[0]);
  const vA = await A.c.post(`/bookings/${refA}/deposit`, { acceptTerms: true, termsVersion: await termsVersion(A.c, refA) });
  check('V1.0 A tạo cọc hợp lệ (đối chứng)', vA.status === 201, brief(vA));
  const probes: [string, string, unknown?][] = [
    ['GET', `/bookings/${refA}`],
    ['POST', `/bookings/${refA}/cancel`, { reason: 'phá thử' }],
    ['POST', `/bookings/${refA}/reschedule`, { slot: new Date(Date.now() + 3 * 86400_000).toISOString() }],
    ['POST', `/bookings/${refA}/late`],
    ['POST', `/bookings/${refA}/lobby-checkin`],
    ['POST', `/bookings/${refA}/rating`, { stars: 1 }],
    ['GET', `/bookings/${refA}/deposit/terms`],
    ['POST', `/bookings/${refA}/deposit`, { acceptTerms: true, termsVersion: 'x' }],
    ['POST', `/bookings/${refA}/ekyc/scan`, { consent: true, consentVersion: 'PRIVACY-2026.10-v1' }],
    ['POST', `/bookings/${refA}/ekyc`, {}],
    ['POST', `/demo/bookings/${refA}/bank-paid`],
  ];
  for (const [m, p, b] of probes) {
    const r = await B.c.call(m, p, b ?? (m === 'POST' ? {} : undefined));
    // 404 = không lộ tồn tại; 400 do DTO sai cũng chấp nhận vì chưa chạm dữ liệu — nhưng KHÔNG được 2xx/409 (lộ trạng thái)
    check(`V1 B ${m} ${p.replace(refA, ':ref')} → không đọc/sửa được`, r.status === 404 || r.status === 400, brief(r));
  }
  const bList = JSON.stringify((await B.c.get('/me/bookings')).data);
  check('V1 /me/bookings của B không chứa lịch của A', !bList.includes(refA));
  check('V1 /me/contracts của B rỗng', ((await B.c.get('/me/contracts')).data ?? []).length === 0);
  const live = await A.c.get(`/bookings/${refA}`);
  check('V1 lịch của A vẫn nguyên sau mọi đòn của B', live.status === 200 && live.data?.status === 'closing' && live.data?.rating == null, brief(live));

  // ───────── V2. Không đăng nhập / sai vai ─────────
  console.log('— V2. Không phiên / sai vai —');
  for (const [m, p] of [['GET', '/me/bookings'], ['GET', '/me/contracts'], ['GET', `/bookings/${refA}`], ['POST', '/bookings'], ['POST', `/bookings/${refA}/deposit`], ['GET', `/me/contracts/00000000-0000-4000-8000-000000000000/pdf`]] as const) {
    const r = await anon.call(m, p, m === 'POST' ? {} : undefined);
    check(`V2 ẩn danh ${m} ${p.replace(refA, ':ref')} → 401`, r.status === 401, brief(r));
  }
  const demoAnon = await anon.post(`/demo/bookings/${refA}/bank-paid`);
  check('V2 ẩn danh gọi demo bank-paid → bị chặn', demoAnon.status === 401 || demoAnon.status === 404, brief(demoAnon));
  const L = new Client();
  const ls = await L.setup('POST', '/auth/signup', { email: `audit+landlord_${stamp}@vinstay.test`, password: 'Password123!', fullName: 'Audit Landlord', portal: 'landlord' });
  if (ls.status === 200) {
    const lr = await L.post('/bookings', { unitCode: units[1], slot: await freeSlot(L, units[1]), contactName: 'Audit Khach', phone: phone(), partySize: 1 });
    check('V2 vai Chủ nhà không đặt lịch khách được (403)', lr.status === 403, brief(lr));
    const lm = await L.get(`/bookings/${refA}`);
    check('V2 vai Chủ nhà không đọc lịch khách (403/404)', lm.status === 403 || lm.status === 404, brief(lm));
  } else check('V2 dựng tài khoản Chủ nhà', false, brief(ls));
  const wh = await anon.post('/vietqr/webhook', { transferContent: vA.data?.deposit?.transferContent, amount: 2000000, bankRefNumber: 'ATTACK-1' }, { 'x-vietqr-secret': 'sai-secret' });
  check('V2 webhook VietQR sai secret → 401/503', wh.status === 401 || wh.status === 503, brief(wh));
  const wh0 = await anon.post('/vietqr/webhook', { transferContent: vA.data?.deposit?.transferContent, amount: 2000000, bankRefNumber: 'ATTACK-2' });
  check('V2 webhook VietQR không secret → 401/503', wh0.status === 401 || wh0.status === 503, brief(wh0));
  const stillPending = await prisma.holdingDeposit.findFirst({ where: { depositCode: `DEP-${refA}` } });
  check('V2 webhook giả KHÔNG làm cọc của A thành đã trả', stillPending?.paymentStatus === 'PENDING_PAYMENT', String(stillPending?.paymentStatus));

  // ───────── V3. Giả mạo cọc & OTP ─────────
  console.log('— V3. Giả mạo điều khoản cọc / OTP / khung giờ —');
  const refB = await toClosing(B, units[1]);
  const tv = await termsVersion(B.c, refB);
  const noTick = await B.c.post(`/bookings/${refB}/deposit`, { termsVersion: tv });
  check('V3 cọc thiếu acceptTerms → 400', noTick.status === 400, brief(noTick));
  const falseTick = await B.c.post(`/bookings/${refB}/deposit`, { acceptTerms: false, termsVersion: tv });
  check('V3 cọc acceptTerms=false → 400', falseTick.status === 400, brief(falseTick));
  const oldVer = await B.c.post(`/bookings/${refB}/deposit`, { acceptTerms: true, termsVersion: 'HOLD-2020.01-v0' });
  check('V3 cọc termsVersion cũ → 409 terms_version_stale', oldVer.status === 409 && code(oldVer) === 'terms_version_stale', brief(oldVer));
  const rows0 = await prisma.holdingDeposit.count({ where: { depositCode: `DEP-${refB}` } });
  check('V3 các lần bị từ chối không tạo bản ghi cọc', rows0 === 0, `số cọc=${rows0}`);
  const amt = await B.c.post(`/bookings/${refB}/deposit`, { acceptTerms: true, termsVersion: tv, amount: 1, holdHours: 1, paymentStatus: 'PAID_HOLDING' });
  const dB = await prisma.holdingDeposit.findFirst({ where: { depositCode: `DEP-${refB}` } });
  check('V3 body gài amount/holdHours/paymentStatus: không ảnh hưởng (amount luôn 2.000.000, chưa trả)',
    (amt.status === 400) || (Number(dB?.amount) === 2000000 && dB?.paymentStatus === 'PENDING_PAYMENT'),
    `${brief(amt)} amount=${dB?.amount} status=${dB?.paymentStatus}`);
  const early = await (async () => { const t = await newTenant('E'); const { ref } = await book(t, units[2], 2); return t.c.post(`/bookings/${ref}/deposit`, { acceptTerms: true, termsVersion: tv }); })();
  check('V3 cọc khi lịch chưa tới bước chốt (pending) → 409 bad_status', early.status === 409 && code(early) === 'bad_status', brief(early));

  const T = await newTenant('T');
  const sl = await freeSlot(T.c, units[2], 3);
  const tok = await otpToken(T);
  const noTok = await T.c.post('/bookings', { unitCode: units[2], slot: sl, contactName: 'Audit Khach', phone: T.phone, partySize: 1 });
  check('V3 đặt lịch không OTP/actionToken → 403 otp_required', noTok.status === 403 && code(noTok) === 'otp_required', brief(noTok));
  const otherPhone = await T.c.post('/bookings', { unitCode: units[2], slot: sl, contactName: 'Audit Khach', phone: phone(), partySize: 1, actionToken: tok });
  check('V3 actionToken của SĐT khác → 401', otherPhone.status === 401, brief(otherPhone));
  const tok2 = await otpToken(T);
  const ok1 = await T.c.post('/bookings', { unitCode: units[2], slot: sl, contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tok2 });
  const reuse = await T.c.post('/bookings', { unitCode: units[3], slot: await freeSlot(T.c, units[3]), contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tok2 });
  check('V3 actionToken dùng một lần: lần 1 → 201, lần 2 (tái dùng) → bị từ chối', ok1.status === 201 && reuse.status === 401, `${brief(ok1)} / ${brief(reuse)}`);
  const forged = await T.c.post('/bookings', { unitCode: units[3], slot: await freeSlot(T.c, units[3]), contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tok2.slice(0, -4) + 'AAAA' });
  check('V3 actionToken bị sửa chữ ký → 401', forged.status === 401, brief(forged));
  const wrongOtp = await T.c.setup('POST', '/auth/otp/send', { phone: T.phone, purpose: 'TENANT_VIEWING' });
  const wv = await T.c.post('/auth/otp/verify', { phone: T.phone, purpose: 'TENANT_VIEWING', code: String((Number(wrongOtp.data?.devCode) + 1) % 10000).padStart(4, '0') });
  check('V3 OTP sai → 400/401 (không cấp token)', (wv.status === 400 || wv.status === 401) && !wv.data?.actionToken, brief(wv));
  for (const [name, slot] of [
    ['quá khứ', new Date(Date.now() - 86400_000).toISOString()],
    ['xa hơn 14 ngày', new Date(Date.now() + 30 * 86400_000).toISOString()],
    ['ngoài khung giờ ca trực (03:00 sáng)', (() => { const d = new Date(Date.now() + 2 * 86400_000); d.setUTCHours(20, 0, 0, 0); return d.toISOString(); })()],
  ] as const) {
    const tk = await otpToken(T);
    const r = await T.c.post('/bookings', { unitCode: units[3], slot, contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tk });
    check(`V3 slot ${name} → 422 slot_invalid`, r.status === 422 && code(r) === 'slot_invalid', brief(r));
  }
  const tk = await otpToken(T);
  const dup = await T.c.post('/bookings', { unitCode: units[2], slot: sl, contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tk });
  check('V3 đặt trùng slot đã có lịch sống → 409 slot_taken', dup.status === 409 && code(dup) === 'slot_taken', brief(dup));
  const tk3 = await otpToken(T);
  const badUnit = await T.c.post('/bookings', { unitCode: 'VHOP-KHONG-CO', slot: sl, contactName: 'Audit Khach', phone: T.phone, partySize: 1, actionToken: tk3 });
  check('V3 căn không tồn tại → 404 unit_not_found', badUnit.status === 404, brief(badUnit));

  // ───────── V4. First-to-Pay Wins: hai bên báo có cùng lúc ─────────
  console.log('— V4. Hai khách cùng chuyển cọc một căn, cùng lúc —');
  const C = await newTenant('C');
  const D = await newTenant('D');
  const raceUnit = units[3];
  const refC = await toClosing(C, raceUnit, 0);
  const refD = await toClosing(D, raceUnit, 1);
  const dC = await C.c.post(`/bookings/${refC}/deposit`, { acceptTerms: true, termsVersion: await termsVersion(C.c, refC) });
  const dD = await D.c.post(`/bookings/${refD}/deposit`, { acceptTerms: true, termsVersion: await termsVersion(D.c, refD) });
  check('V4.0 cả hai tạo được QR cọc (chưa ai trả)', dC.status === 201 && dD.status === 201, `${brief(dC)} / ${brief(dD)}`);
  let results: Res[] = [];
  if (SECRET) {
    results = await Promise.all([
      anon.post('/vietqr/webhook', { transferContent: dC.data?.deposit?.transferContent, amount: 2000000, bankRefNumber: `RACE-C-${stamp}` }, { 'x-vietqr-secret': SECRET }),
      anon.post('/vietqr/webhook', { transferContent: dD.data?.deposit?.transferContent, amount: 2000000, bankRefNumber: `RACE-D-${stamp}` }, { 'x-vietqr-secret': SECRET }),
    ]);
  } else {
    results = await Promise.all([demo(C.c, refC, 'bank-paid'), demo(D.c, refD, 'bank-paid')]);
  }
  const outcomes = results.map((r) => r.data?.outcome ?? r.data?.result ?? r.data?.deposit?.outcome ?? brief(r));
  const paidRows = await prisma.holdingDeposit.findMany({ where: { unitId: (await prisma.unit.findFirst({ where: { unitCode: raceUnit } }))!.id, paymentStatus: 'PAID_HOLDING' } });
  const unitRow = await prisma.unit.findFirst({ where: { unitCode: raceUnit } });
  check('V4 đúng MỘT cọc PAID_HOLDING cho căn', paidRows.length === 1, `PAID_HOLDING=${paidRows.length} · kết quả=${JSON.stringify(outcomes)}`);
  check('V4 căn ở HOLDING', unitRow?.status === 'HOLDING', String(unitRow?.status));
  const esc = await prisma.escrowTransaction.findMany({ where: { deposit: { depositCode: { in: [`DEP-${refC}`, `DEP-${refD}`] } } } });
  const inbound = esc.filter((e) => e.transType === 'INBOUND_DEPOSIT').length;
  const refund = esc.filter((e) => e.transType === 'REFUND').length;
  check('V4 bên thua được hoàn tiền (INBOUND = REFUND + 1)', inbound === refund + 1 || inbound === 1, `inbound=${inbound} refund=${refund}`);
  const replay = SECRET ? await anon.post('/vietqr/webhook', { transferContent: dC.data?.deposit?.transferContent, amount: 2000000, bankRefNumber: `RACE-C-${stamp}` }, { 'x-vietqr-secret': SECRET }) : null;
  if (replay) check('V4 phát lại cùng bankRefNumber → duplicate, không cộng tiền hai lần', (replay.data?.outcome ?? replay.data?.result) === 'duplicate', brief(replay));
  const after = (await prisma.escrowTransaction.count({ where: { deposit: { depositCode: { in: [`DEP-${refC}`, `DEP-${refD}`] } } } }));
  check('V4 sổ escrow không đổi sau khi phát lại', after === esc.length, `${esc.length} → ${after}`);

  // ───────── V5. eKYC giả mạo + hợp đồng ─────────
  console.log('— V5. Giả mạo eKYC / điều khoản thuê —');
  const holder = refC && outcomes.length ? ((await prisma.holdingDeposit.findFirst({ where: { depositCode: `DEP-${refC}` } }))?.paymentStatus === 'PAID_HOLDING' ? { t: C, ref: refC } : { t: D, ref: refD }) : { t: C, ref: refC };
  const loser = holder.t === C ? { t: D, ref: refD } : { t: C, ref: refC };
  const lsc = await loser.t.c.post(`/bookings/${loser.ref}/ekyc/scan`, { consent: true, consentVersion: 'PRIVACY-2026.10-v1' });
  check('V5 bên thua cọc không quét eKYC được (không ở trạng thái giữ căn)', lsc.status === 409, brief(lsc));
  const noConsent = await holder.t.c.post(`/bookings/${holder.ref}/ekyc/scan`, { consent: false, consentVersion: 'PRIVACY-2026.10-v1' });
  check('V5 scan không đồng ý quyền riêng tư → bị từ chối', noConsent.status >= 400, brief(noConsent));
  const scan = await holder.t.c.post(`/bookings/${holder.ref}/ekyc/scan`, { consent: true, consentVersion: 'PRIVACY-2026.10-v1' });
  check('V5.0 chủ lịch giữ căn quét eKYC được (đối chứng)', scan.status === 201 && Boolean(scan.data?.scanId), brief(scan));
  const good = { startDate: vnToday(), months: 12, paymentCycle: 1 };
  const submit = (body: any) => holder.t.c.post(`/bookings/${holder.ref}/ekyc`, body);
  const fields = scan.data.fields;
  const base = { scanId: scan.data.scanId, consentVersion: 'PRIVACY-2026.10-v1', fields, confirmedLowConfidence: true, lease: good };
  const tryCases: [string, any, number, string?][] = [
    ['scanId rác', { ...base, scanId: 'khong.phai.token' }, 422, 'scan_expired'],
    ['scanId bị sửa 1 ký tự', { ...base, scanId: scan.data.scanId.slice(0, -2) + (scan.data.scanId.endsWith('A') ? 'B' : 'A') + 'x' }, 422, 'scan_expired'],
    ['CCCD 11 số', { ...base, fields: { ...fields, idNumber: '00123456789' } }, 422, 'kyc_fields_invalid'],
    ['CCCD có chữ', { ...base, fields: { ...fields, idNumber: '00123456789A' } }, 422, 'kyc_fields_invalid'],
    ['chưa đủ 18 tuổi', { ...base, fields: { ...fields, dob: '01/01/2015' } }, 422, 'kyc_fields_invalid'],
    ['ngày cấp ở tương lai', { ...base, fields: { ...fields, issuedDate: '01/01/2090' } }, 422, 'kyc_fields_invalid'],
    ['thiếu xác nhận độ tin cậy thấp', { ...base, confirmedLowConfidence: false }, 422, 'kyc_confirmation_required'],
    ['số tháng thuê 60 (>36)', { ...base, lease: { ...good, months: 60 } }, 422, 'lease_terms_invalid'],
    ['số tháng thuê 1 (< tối thiểu)', { ...base, lease: { ...good, months: 1 } }, 422, 'lease_terms_invalid'],
    ['ngày vào ở trong quá khứ', { ...base, lease: { ...good, startDate: '2020-01-01' } }, 422, 'lease_terms_invalid'],
    ['ngày vào ở sau 30 ngày', { ...base, lease: { ...good, startDate: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10) } }, 422, 'lease_terms_invalid'],
    ['kỳ thanh toán 2 tháng', { ...base, lease: { ...good, paymentCycle: 2 } }, 422, 'lease_terms_invalid'],
    ['sai phiên bản đồng ý riêng tư', { ...base, consentVersion: 'PRIVACY-1999' }, 409],
  ];
  for (const [name, body, st, cd] of tryCases) {
    const r = await submit(body);
    check(`V5 eKYC ${name} → ${st}${cd ? ' ' + cd : ''}`, r.status === st && (!cd || code(r) === cd), brief(r));
  }
  check('V5 các lần bị từ chối không tạo hợp đồng', (await prisma.contract.count({ where: { holdingDeposit: { depositCode: `DEP-${holder.ref}` } } })) === 0);
  const crossScan = await loser.t.c.post(`/bookings/${loser.ref}/ekyc`, { ...base });
  check('V5 dùng scanId của lịch khác nộp cho lịch của mình → bị từ chối', crossScan.status >= 400 && crossScan.status < 500, brief(crossScan));
  const okSubmit = await submit(base);
  check('V5.1 eKYC hợp lệ → 201, hợp đồng ACTIVE (đối chứng)', okSubmit.status === 201 && okSubmit.data?.contract?.id, brief(okSubmit));
  const second = await submit(base);
  check('V5 gửi eKYC lần 2 → 409 ekyc_already_done (không tạo hợp đồng thứ hai)', second.status === 409, brief(second));
  const nContracts = await prisma.contract.count({ where: { holdingDeposit: { depositCode: `DEP-${holder.ref}` } } });
  check('V5 đúng một hợp đồng cho cọc', nContracts === 1, `hợp đồng=${nContracts}`);
  const cid = okSubmit.data?.contract?.id;
  const stranger = await loser.t.c.get(`/me/contracts/${cid}/pdf`);
  check('V5 người khác tải PDF hợp đồng → 404', stranger.status === 404, brief(stranger));
  const own = await holder.t.c.get(`/me/contracts/${cid}/pdf`);
  check('V5 chủ hợp đồng tải được PDF', own.status === 200, brief(own));

  // ───────── V6. Rò rỉ dữ liệu ─────────
  console.log('— V6. Rò rỉ dữ liệu —');
  const pub = (await anon.get(`/properties/units/${units[0]}`)).text;
  check('V6 catalog công khai không lộ chủ nhà/SĐT/email/mã cửa', !/landlordId|"phone"|email|vaultSecretRef|doorCode|passwordHash/i.test(pub), '');
  const mine = (await holder.t.c.get(`/bookings/${holder.ref}`)).text;
  check('V6 TenantBooking không chứa CCCD, mã mật khẩu hay khoá mã hoá', !/\b0\d{11}\b|passwordHash|verifiedDataRef|AES|v1:/.test(mine), '');
  check('V6 SĐT liên hệ trong lịch được che', /phoneMasked/.test(mine) && !new RegExp(`"phoneMasked":"${holder.t.phone}`).test(mine), '');
  const err = await B.c.get('/bookings/VS-ZZZZZ');
  check('V6 lỗi 404 không lộ stack/đường dẫn nội bộ', !/at |node_modules|prisma|\.ts:/.test(err.text), brief(err));
  const idr = await prisma.identityVerification.findMany({ where: { tenantId: holder.t === C ? C.id : D.id } });
  check('V6 DB: verified_data_ref là ciphertext v1:, không có CCCD/tên rõ', idr.every((i) => /^v1:/.test(i.verifiedDataRef ?? '') && !/Audit|\b0\d{11}\b/.test(i.verifiedDataRef ?? '')), `bản ghi=${idr.length}`);
  const vw = await prisma.viewing.findMany({ where: { tenantId: { in: [A.id, B.id, C.id, D.id, T.id] } }, select: { contactPhoneEnc: true } });
  check('V6 DB: contact_phone_enc đều v1:, không có SĐT rõ', vw.every((v) => /^v1:/.test(v.contactPhoneEnc ?? '')), `lịch=${vw.length}`);

  // ───────── V7. Hết hạn giữ chỗ ─────────
  console.log('— V7. Giữ chỗ hết hạn —');
  const E = await newTenant('X');
  const spare = (await availableUnits(E.c, 8)).filter((u) => !units.includes(u));
  if (spare.length) {
    const refE = await toHolding(E, spare[0]);
    const sc = await E.c.post(`/bookings/${refE}/ekyc/scan`, { consent: true, consentVersion: 'PRIVACY-2026.10-v1' });
    // Thời gian trôi qua thật: lùi hạn giữ chỗ trong DB, KHÔNG gọi demo expire-hold (nó dọn ngay nên che mất đường hết hạn "lười").
    await prisma.holdingDeposit.updateMany({ where: { depositCode: `DEP-${refE}` }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const lateSubmit = await E.c.post(`/bookings/${refE}/ekyc`, { scanId: sc.data?.scanId, consentVersion: 'PRIVACY-2026.10-v1', fields: sc.data?.fields, confirmedLowConfidence: true, lease: good });
    const u = await prisma.unit.findFirst({ where: { unitCode: spare[0] } });
    check('V7 eKYC sau khi hết hạn giữ chỗ → 409 hold_expired', lateSubmit.status === 409 && code(lateSubmit) === 'hold_expired', brief(lateSubmit));
    check('V7 hết hạn trả căn về AVAILABLE và cọc FORFEITED', u?.status === 'AVAILABLE' && (await prisma.holdingDeposit.findFirst({ where: { depositCode: `DEP-${refE}` } }))?.paymentStatus === 'FORFEITED', String(u?.status));
  } else check('V7 cần thêm căn available', false, 'không đủ căn');

  console.log(`\n==== KẾT QUẢ: ${pass} PASS · ${fail} FAIL ====`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('LỖI KHI DỰNG TÌNH HUỐNG:', e);
  await prisma.$disconnect();
  process.exit(2);
});
