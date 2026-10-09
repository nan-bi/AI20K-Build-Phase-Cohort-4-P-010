// TC-03 phần tiếp (3.2 → 5) cho lịch đã tạo ở tc03.js; không tạo lịch mới.
const { Client, prisma, short } = require('./lib');
const REF = 'VS-WUKVH', UNIT = 'VHOP-S1.01-0412', SLOT = '2026-10-12T02:30:00.000Z', PHONE = '0900000101';
const T0 = new Date(process.env.T0);
(async () => {
  const db = prisma();
  for (const [email, portal] of [['host.oceanpark@vinstay.vn', 'host'], ['chunha.oceanpark@vinstay.vn', 'landlord']]) {
    const c = new Client(portal);
    const r = await c.post('/auth/login', { email, password: process.env.QA_PASSWORD, portal });
    console.log(`3.2 login ${email} portal=${portal} | ${short(r, 220)}`);
    if (r.status === 200 && portal === 'host') { const b = await c.get('/host/board'); console.log(`3.2a GET /host/board | thấy ${REF}: ${b.text.includes(REF) || b.text.includes(UNIT)} | ${short(b, 300)}`); }
    if (r.status === 200 && portal === 'landlord') { const u = await c.get('/landlord/units'); console.log(`3.2b GET /landlord/units | ${short(u, 200)}`); }
  }
  const tenant = new Client('tenant');
  await tenant.login('khachthue.demo@vinstay.vn', 'tenant');
  const payload = { unitCode: UNIT, slot: SLOT, contactName: 'QA TC03 Rerun', phone: PHONE, partySize: 2, note: 'TC-03 QA rerun' };
  const neg = [['4a', 'thiếu contactName', { ...payload, contactName: undefined }], ['4b', 'slot quá khứ 2026-10-03T02:30Z', { ...payload, slot: '2026-10-03T02:30:00.000Z' }], ['4c', 'unitCode VHOP-ZZ.99-9999', { ...payload, unitCode: 'VHOP-ZZ.99-9999' }], ['4d', 'gửi lại payload 1.4 (không actionToken)', payload]];
  for (const [id, label, body] of neg) { const r = await tenant.post('/bookings', body); console.log(`${id} | ${label} | ${short(r, 330)} | ${r.status >= 400 && r.status < 500 ? 'PASS' : 'FAIL'}`); }
  const counts = { viewings: await db.viewing.count(), dispatchTickets: await db.dispatchTicket.count(), otpCodes: await db.otpCode.count() };
  const vs = await db.viewing.findMany({ where: { createdAt: { gte: T0 } }, select: { id: true, bookingRefCode: true } });
  const otps = await db.otpCode.findMany({ where: { createdAt: { gte: T0 } }, select: { id: true, status: true } });
  const tks = await db.dispatchTicket.findMany({ where: { offeredAt: { gte: T0 } }, select: { id: true, status: true, hostId: true } });
  const unit = await db.unit.findUnique({ where: { unitCode: UNIT }, select: { status: true } });
  console.log(`5 | AFTER ${JSON.stringify(counts)} · viewings mới ${JSON.stringify(vs)} · tickets mới ${JSON.stringify(tks)} · otp mới ${JSON.stringify(otps)} · căn ${unit.status}`);
  const audits = await db.authAuditLog.findMany({ where: { createdAt: { gte: T0 } }, select: { id: true, event: true }, orderBy: { createdAt: 'asc' } }).catch((e) => 'ERR ' + e.message.slice(0, 120));
  console.log('auth_audit_log mới:', JSON.stringify(audits));
  await db.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
