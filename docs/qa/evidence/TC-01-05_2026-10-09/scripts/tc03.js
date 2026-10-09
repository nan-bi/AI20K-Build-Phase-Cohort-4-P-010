// TC-03 — Đặt lịch xem đầu-cuối. GHI DB: 1 viewing + ticket + OTP + audit (ghi ID để dọn).
const { Client, prisma, short } = require('./lib');
const PHONE = '0900000101';
const SLOT = process.env.SLOT || '2026-10-12T02:30:00.000Z'; // 09:30 giờ VN, thứ Hai
const T0 = new Date();

(async () => {
  const db = prisma();
  const counts = async () => ({ viewings: await db.viewing.count(), dispatchTickets: await db.dispatchTicket.count(), otpCodes: await db.otpCode.count() });
  const before = await counts();
  const unit = await db.unit.findFirst({
    where: { isVerified: true, status: 'AVAILABLE', media: { some: { url: { startsWith: '/' } } }, building: { zoneName: 'The Sapphire 1' } },
    select: { id: true, unitCode: true, status: true, landlordId: true, building: { select: { buildingCode: true, zoneName: true } } },
    orderBy: { unitCode: 'asc' },
  });
  console.log('[BEFORE] counts:', JSON.stringify(before));
  console.log('[BEFORE] unit:', JSON.stringify(unit));

  const tenant = new Client('tenant');
  const busy = await tenant.get(`/properties/units/${unit.unitCode}/busy-slots`);
  console.log('[BEFORE] busy-slots:', short(busy, 300));

  const rows = [];
  const step = (id, sent, r, pass) => { rows.push({ id, sent, actual: short(r, 700), pass }); console.log(`${id} | ${sent} | ${short(r, 700)} | ${pass ? 'PASS' : 'FAIL'}`); };

  let r = await tenant.post('/auth/login', { email: 'khachthue.demo@vinstay.vn', password: process.env.QA_PASSWORD, portal: 'tenant' });
  step('1.1', 'POST /auth/login tenant', r, r.status === 200 && r.setCookie.includes('vs_access'));
  r = await tenant.post('/auth/otp/send', { phone: PHONE, purpose: 'TENANT_VIEWING' });
  step('1.2', `POST /auth/otp/send {phone:${PHONE}}`, r, r.status === 200);
  const code = r.json?.data?.devCode;
  r = await tenant.post('/auth/otp/verify', { phone: PHONE, purpose: 'TENANT_VIEWING', code });
  step('1.3', 'POST /auth/otp/verify', r, r.status === 200 && !!r.json?.data?.actionToken);
  const actionToken = r.json?.data?.actionToken;
  const payload = { unitCode: unit.unitCode, slot: SLOT, contactName: 'QA TC03 Rerun', phone: PHONE, partySize: 2, note: 'TC-03 QA rerun 2026-10-09 - vui long bo qua', actionToken };
  r = await tenant.post('/bookings', payload);
  step('1.4', `POST /bookings ${unit.unitCode} ${SLOT}`, r, r.status === 201 && !!r.json?.data?.ref);
  const ref = r.json?.data?.ref;

  r = await tenant.get(`/bookings/${ref}`);
  step('2.1', `GET /bookings/${ref}`, r, r.status === 200 && r.json?.data?.unit?.code === unit.unitCode && r.json?.data?.slot === SLOT);
  r = await tenant.get('/me/bookings');
  step('2.2', 'GET /me/bookings', r, r.status === 200 && (r.json?.data ?? []).some((b) => b.ref === ref));
  const v = await db.viewing.findUnique({ where: { bookingRefCode: ref }, include: { tickets: true } });
  const dbOk = v && v.unitId === unit.id && v.contactName === payload.contactName && v.partySize === 2 && v.viewingSlot.toISOString() === SLOT && v.tickets.length >= 1;
  console.log(`2.3 | DB viewing | ${JSON.stringify({ id: v?.id, bookingRefCode: v?.bookingRefCode, unitId: v?.unitId, contactName: v?.contactName, partySize: v?.partySize, tenantNote: v?.tenantNote, viewingSlot: v?.viewingSlot, status: v?.status, tickets: v?.tickets.map((t) => ({ id: t.id, hostId: t.hostId, tier: t.tier, status: t.status })) })} | ${dbOk ? 'PASS' : 'FAIL'}`);

  const admin = new Client('admin');
  await admin.login('admin@vinstay.vn', 'admin');
  r = await admin.get('/admin/dispatch-sla');
  const tk = (r.json?.data ?? []).find((t) => t.unitCode === unit.unitCode && v?.tickets.some((x) => x.id === t.ticketId));
  console.log(`3.1 | Admin GET /admin/dispatch-sla | HTTP ${r.status} · ${JSON.stringify(tk ?? null)} | ${tk ? 'PASS' : 'FAIL'}`);

  const host = new Client('host');
  await host.login('host.oceanpark@vinstay.vn', 'host');
  r = await host.get('/host/board');
  const boardText = r.text;
  const onBoard = boardText.includes(ref) || boardText.includes(unit.unitCode);
  console.log(`3.2a | Host host.oceanpark GET /host/board | HTTP ${r.status} · thấy ${ref}/${unit.unitCode}: ${onBoard} · ${short(r, 500)} | ${onBoard ? 'PASS' : 'XEM GHI CHÚ'}`);
  const landlord = new Client('landlord');
  await landlord.login('chunha.oceanpark@vinstay.vn', 'landlord');
  r = await landlord.get('/landlord/units');
  console.log(`3.2b | Landlord chunha.oceanpark GET /landlord/units | ${short(r, 200)} | căn ${unit.unitCode} thuộc landlord ${unit.landlordId}`);

  r = await tenant.post('/bookings', { ...payload, contactName: undefined, actionToken: undefined });
  step('4a', 'thiếu contactName', r, r.status >= 400 && r.status < 500);
  r = await tenant.post('/bookings', { ...payload, slot: '2026-10-03T02:30:00.000Z', actionToken: undefined });
  step('4b', 'slot quá khứ 2026-10-03', r, r.status >= 400 && r.status < 500);
  r = await tenant.post('/bookings', { ...payload, unitCode: 'VHOP-ZZ.99-9999', actionToken: undefined });
  step('4c', 'unitCode không tồn tại', r, r.status >= 400 && r.status < 500);
  r = await tenant.post('/bookings', { ...payload, actionToken: undefined });
  step('4d', 'gửi lại payload 1.4 (không token mới)', r, r.status >= 400 && r.status < 500);

  const after = await counts();
  const newViewings = await db.viewing.findMany({ where: { createdAt: { gte: T0 } }, select: { id: true, bookingRefCode: true } });
  const newOtps = await db.otpCode.findMany({ where: { createdAt: { gte: T0 } }, select: { id: true, status: true } });
  const unitAfter = await db.unit.findUnique({ where: { id: unit.id }, select: { status: true } });
  console.log(`5 | AFTER counts ${JSON.stringify(after)} · viewings mới ${JSON.stringify(newViewings)} · otp mới ${JSON.stringify(newOtps)} · căn ${unitAfter.status} | ${after.viewings === before.viewings + 1 && newViewings.length === 1 ? 'PASS' : 'FAIL'}`);
  await db.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
