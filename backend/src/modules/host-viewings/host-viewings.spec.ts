import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HostViewingsController } from './host-viewings.controller';
import { buildWorld, codeOf, min, NOW, PIN, sec } from './testing/world';

beforeEach(() => jest.useFakeTimers({ now: NOW }));
afterEach(() => jest.useRealTimers());

describe('Bảng /host/board (SPEC-P01 §6 ca 3, 4, 9)', () => {
  it('Sale B không thấy ticket ASSIGNED của Sale A; sau 3′ B cùng phân khu thấy (claim), C khác phân khu chưa; sau 6′ C thấy', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const b = w.addHost('b');
    const c = w.addHost('c', { zone: 'Zen Park' });
    const v = w.addViewing(w.addUnit('U1'));
    w.addTicket(v, { hostId: a.id });

    const view = async (h: any, at: Date) => (await w.board.board(await w.actor(h), at)).requests;
    expect((await view(a, NOW))[0]).toMatchObject({ tier: 'ASSIGNED', canAccept: true, canClaim: false });
    expect(await view(b, NOW)).toHaveLength(0);

    expect((await view(b, sec(200)))[0]).toMatchObject({ tier: 'ZONE_POOL', canAccept: false, canClaim: true });
    expect(await view(c, sec(200))).toHaveLength(0);
    expect((await view(c, sec(400)))[0]).toMatchObject({ tier: 'WIDE_POOL', canClaim: true });
  });

  it('phoneMasked không chứa SĐT đầy đủ; schedule chỉ gồm ca tôi là chủ; ASSIGNED có slaEndsAt', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const b = w.addHost('b');
    const unit = w.addUnit('U1');
    const open = w.addViewing(unit, { slot: min(300) });
    w.addTicket(open, { hostId: a.id });
    const mine = w.addViewing(unit, { slot: min(240), status: 'CONFIRMED' });
    w.addTicket(mine, { hostId: a.id, status: 'ACCEPTED', acceptedAt: NOW });
    const others = w.addViewing(unit, { slot: min(500), status: 'CONFIRMED' });
    w.addTicket(others, { hostId: b.id, status: 'ACCEPTED', acceptedAt: NOW });

    const board = await w.board.board(await w.actor(a), NOW);
    const card = board.requests[0];
    expect(card.tenant.phoneMasked).toBe('09•• ••• 678');
    expect(JSON.stringify(board)).not.toContain('0912345678');
    expect(JSON.stringify(board)).not.toContain('912345678');
    expect(card.slaEndsAt).toBe(sec(180).toISOString());
    expect(board.schedule.map((s) => s.ref)).toEqual([mine.bookingRefCode]);
    expect(board.kpis).toMatchObject({ pending: 1, today: 1, avgAcceptSeconds: 0 });
    expect(board.serverTime).toBe(NOW.toISOString());
  });

  it('ca khách đã huỷ (A9) không còn trong requests; accept ⇒ ticket_taken', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const v = w.addViewing(w.addUnit('U1'));
    const t = w.addTicket(v, { hostId: a.id });
    // đúng như BookingService.cancelBooking: viewing CANCELLED + ticket CANCELLED
    v.status = 'CANCELLED';
    t.status = 'CANCELLED';

    expect((await w.board.board(await w.actor(a), NOW)).requests).toHaveLength(0);
    expect(await codeOf(w.flow.accept(t.id, await w.actor(a)))).toBe('ticket_taken');
  });

  it('ca tôi đã từ chối không quay lại bảng của tôi khi sang pool', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    w.addHost('b');
    const v = w.addViewing(w.addUnit('U1'));
    const t = w.addTicket(v, { hostId: a.id });
    await w.flow.reject(t.id, await w.actor(a), 'Bận việc riêng');
    expect((await w.board.board(await w.actor(a), sec(400))).requests).toHaveLength(0);
  });

  it('history: ca kết thúc xếp mới nhất trước, tối đa 30', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const unit = w.addUnit('U1');
    for (let i = 0; i < 35; i++) {
      const v = w.addViewing(unit, { slot: min(-1000 - i * 60), status: 'COMPLETED' });
      w.addTicket(v, { hostId: a.id, status: 'COMPLETED', acceptedAt: min(-1000) });
    }
    const { history } = await w.board.board(await w.actor(a), NOW);
    expect(history).toHaveLength(30);
    expect(history[0].slot > history[29].slot).toBe(true);
  });
});

describe('accept / claim / reject (SPEC-P01 §6 ca 5–8)', () => {
  it('accept thành công ⇒ viewing CONFIRMED + ticket ACCEPTED + AuditLog; lần 2 ⇒ ticket_taken', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const v = w.addViewing(w.addUnit('U1'));
    const t = w.addTicket(v, { hostId: a.id });

    const d = await w.flow.accept(t.id, await w.actor(a));
    expect(d).toMatchObject({ ref: v.bookingRefCode, status: 'confirmed' });
    expect(d.tenant.phone).toBe('0912345678'); // B4: chủ ca thấy SĐT đầy đủ
    expect(w.db.tickets[0]).toMatchObject({ status: 'ACCEPTED', hostId: a.id });
    expect(w.viewing(v.id)).toMatchObject({ status: 'CONFIRMED' });
    expect(w.audits('VIEWING_ACCEPT')).toHaveLength(1);
    expect(await codeOf(w.flow.accept(t.id, await w.actor(a)))).toBe('ticket_taken');
  });

  it('accept: quá 3′ ⇒ ticket_expired; ticket của Sale khác ⇒ ticket_not_found; OFF_DUTY ⇒ host_off_duty', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const b = w.addHost('b');
    const off = w.addHost('off', { duty: 'OFF_DUTY' });
    const unit = w.addUnit('U1');
    const t1 = w.addTicket(w.addViewing(unit), { hostId: a.id, offeredAt: NOW });
    jest.setSystemTime(sec(200));
    expect(await codeOf(w.flow.accept(t1.id, await w.actor(a)))).toBe('ticket_expired');
    jest.setSystemTime(NOW);
    expect(await codeOf(w.flow.accept(t1.id, await w.actor(b)))).toBe('ticket_not_found');
    const t2 = w.addTicket(w.addViewing(unit), { hostId: off.id });
    expect(await codeOf(w.flow.accept(t2.id, await w.actor(off)))).toBe('host_off_duty');
    expect(await codeOf(w.flow.accept('khong-phai-uuid', await w.actor(a)))).toBe('ticket_not_found');
  });

  it('accept: trùng ca ACCEPTED trong ±45′ ⇒ host_schedule_conflict; ticket OFFERED khác không chặn', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const unit = w.addUnit('U1');
    const first = w.addViewing(unit, { slot: min(180) });
    const second = w.addViewing(unit, { slot: min(210) }); // lệch 30′
    const far = w.addViewing(unit, { slot: min(300) }); // lệch 120′
    const t1 = w.addTicket(first, { hostId: a.id });
    const t2 = w.addTicket(second, { hostId: a.id });
    const t3 = w.addTicket(far, { hostId: a.id });

    await w.flow.accept(t1.id, await w.actor(a)); // t2 đang OFFERED không chặn t1
    expect(await codeOf(w.flow.accept(t2.id, await w.actor(a)))).toBe('host_schedule_conflict');
    expect(await codeOf(w.flow.accept(t3.id, await w.actor(a)))).toBe('ok');
  });

  it('claim đua: 2 Sale cùng gọi ⇒ đúng 1 thành công, 1 ticket_taken; chỉ 1 ticket có acceptedAt', async () => {
    const w = buildWorld();
    const b = w.addHost('b');
    const c = w.addHost('c');
    const v = w.addViewing(w.addUnit('U1'));
    const t = w.addTicket(v, { hostId: null });

    const results = await Promise.all([
      codeOf(w.flow.claim(t.id, await w.actor(b))),
      codeOf(w.flow.claim(t.id, await w.actor(c))),
    ]);
    expect(results.sort()).toEqual(['ok', 'ticket_taken']);
    expect(w.db.tickets.filter((x) => x.acceptedAt)).toHaveLength(1);
    expect(w.db.tickets.filter((x) => x.viewingId === v.id && x.status === 'ACCEPTED')).toHaveLength(1);
  });

  it('claim: ZONE_POOL khác phân khu ⇒ zone_mismatch; ASSIGNED của người khác ⇒ ticket_not_open; WIDE_POOL ai cũng nhận', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const c = w.addHost('c', { zone: 'Zen Park' });
    const unit = w.addUnit('U1');
    const t = w.addTicket(w.addViewing(unit), { hostId: a.id });

    expect(await codeOf(w.flow.claim(t.id, await w.actor(c)))).toBe('ticket_not_open'); // còn ASSIGNED cho A
    jest.setSystemTime(sec(200));
    expect(await codeOf(w.flow.claim(t.id, await w.actor(c)))).toBe('zone_mismatch');
    jest.setSystemTime(sec(400));
    expect(await codeOf(w.flow.claim(t.id, await w.actor(c)))).toBe('ok');
  });

  it('reject: ticket cũ ESCALATED + rejectReason; ticket mới giao Sale khác; hết người ⇒ hostId null', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const b = w.addHost('b');
    const unit = w.addUnit('U1');
    const v = w.addViewing(unit);
    const t = w.addTicket(v, { hostId: a.id });

    await w.flow.reject(t.id, await w.actor(a), 'Đang có ca khác');
    expect(w.db.tickets.find((x) => x.id === t.id)).toMatchObject({ status: 'ESCALATED', rejectReason: 'Đang có ca khác' });
    expect(w.db.tickets.find((x) => x.id === t.id)!.closedAt).toBeInstanceOf(Date);
    const next = w.db.tickets.find((x) => x.id !== t.id && x.viewingId === v.id)!;
    expect(next).toMatchObject({ hostId: b.id, status: 'OFFERED', tier: 1 });
    expect(w.viewing(v.id).status).toBe('PENDING_CONFIRMATION');
    expect(w.audits('VIEWING_REJECT')).toHaveLength(1);

    // B cũng từ chối ⇒ không còn ai ⇒ hostId null, tier 2 (không giao lại A hay B)
    await w.flow.reject(next.id, await w.actor(b), 'Không tiện');
    const last = w.db.tickets[w.db.tickets.length - 1];
    expect(last).toMatchObject({ hostId: null, tier: 2, status: 'OFFERED' });
    // A đã từ chối nên cũng không nhận lại qua pool
    expect(await codeOf(w.flow.claim(last.id, await w.actor(a)))).toBe('ticket_not_open');
  });

  it('reject sau 3′ ⇒ ticket_expired (đã sang pool, không còn gì để từ chối)', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const t = w.addTicket(w.addViewing(w.addUnit('U1')), { hostId: a.id });
    jest.setSystemTime(sec(200));
    expect(await codeOf(w.flow.reject(t.id, await w.actor(a), 'Quá trễ'))).toBe('ticket_expired');
  });
});

/** Dựng một ca đã nhận, ở trạng thái `status`, chủ ca = a. */
function ownedCase(status: string, opts: { lock?: 'ELECTRONIC_PIN' | 'PHYSICAL_KEY'; ref?: string | null; slot?: Date; hostDuty?: string } = {}) {
  const w = buildWorld();
  const a = w.addHost('a', { duty: opts.hostDuty });
  const unit = w.addUnit('U1', { lock: opts.lock, ref: opts.ref });
  const v = w.addViewing(unit, { status, slot: opts.slot ?? min(30) });
  const t = w.addTicket(v, { hostId: a.id, status: 'ACCEPTED', acceptedAt: NOW });
  return { w, a, unit, v, t };
}

describe('Chủ ca & máy trạng thái (SPEC-P02 §6 ca 1–5, 9)', () => {
  it('Sale khác / Sale đã từ chối gọi V1–V9 ⇒ viewing_not_found', async () => {
    const { w, v } = ownedCase('CONFIRMED');
    const other = w.addHost('other');
    const o = await w.actor(other);
    const ref = v.bookingRefCode;
    const calls = [
      () => w.flow.detail(ref, o),
      () => w.flow.remind(ref, o),
      () => w.flow.receive(ref, o),
      () => w.flow.openDoor(ref, o),
      () => w.flow.revealDoorCode(ref, o),
      () => w.flow.noShow(ref, o),
      () => w.flow.startDeposit(ref, o),
      () => w.flow.notInterested(ref, o, 'Không hợp'),
      () => w.flow.emergency(ref, o, 'smart_lock', undefined),
    ];
    for (const c of calls) expect(await codeOf(c())).toBe('viewing_not_found');

    // Sale đã từ chối (ticket ESCALATED, không có acceptedAt) cũng không vào được ca
    const rejected = w.addHost('rejected');
    w.addTicket(v, { hostId: rejected.id, status: 'ESCALATED' });
    expect(await codeOf(w.flow.detail(ref, await w.actor(rejected)))).toBe('viewing_not_found');
  });

  it('mỗi thao tác từ trạng thái sai ⇒ bad_status kèm errors.expected/actual', async () => {
    const cases: [string, (w: any, ref: string, a: any) => Promise<unknown>, string[]][] = [
      ['PENDING_CONFIRMATION', (w, r, a) => w.flow.remind(r, a, {}, { demo: true }), ['confirmed']],
      ['VIEWING', (w, r, a) => w.flow.receive(r, a), ['confirmed', 'lobby']],
      ['CONFIRMED', (w, r, a) => w.flow.openDoor(r, a), ['receiving']],
      ['CONFIRMED', (w, r, a) => w.flow.revealDoorCode(r, a), ['viewing']],
      ['VIEWING', (w, r, a) => w.flow.noShow(r, a, {}, { demo: true }), ['confirmed', 'lobby']],
      ['RECEIVING', (w, r, a) => w.flow.startDeposit(r, a), ['viewing']],
      ['RECEIVING', (w, r, a) => w.flow.notInterested(r, a, 'Không hợp'), ['viewing', 'closing']],
      ['CONFIRMED', (w, r, a) => w.flow.emergency(r, a, 'smart_lock', undefined), ['receiving', 'viewing']],
    ];
    for (const [status, call, expected] of cases) {
      const { w, a, v } = ownedCase(status);
      let err: any;
      try {
        await call(w, v.bookingRefCode, await w.actor(a));
      } catch (e) {
        err = e;
      }
      expect(err?.response?.code).toBe('bad_status');
      expect(err.response.errors).toEqual({ expected, actual: expect.any(String) });
    }
  });

  it('2 lời gọi receive đồng thời ⇒ đúng 1 thành công', async () => {
    const { w, a, v } = ownedCase('CONFIRMED');
    const actor = await w.actor(a);
    const results = await Promise.all([codeOf(w.flow.receive(v.bookingRefCode, actor)), codeOf(w.flow.receive(v.bookingRefCode, actor))]);
    expect(results.sort()).toEqual(['bad_status', 'ok']);
    expect(w.viewing(v.id).status).toBe('RECEIVING');
  });

  it('receive từ CONFIRMED đặt lobbyCheckInAt; Host BUSY_VIEWING; startDeposit ⇒ ONLINE', async () => {
    const { w, a, v } = ownedCase('CONFIRMED');
    const d = await w.flow.receive(v.bookingRefCode, await w.actor(a));
    expect(d.status).toBe('receiving');
    expect(d.timeline.lobbyCheckInAt).not.toBeNull();
    expect(w.db.hosts[0].dutyStatus).toBe('BUSY_VIEWING');

    await w.flow.openDoor(v.bookingRefCode, await w.actor(a));
    const closing = await w.flow.startDeposit(v.bookingRefCode, await w.actor(a));
    expect(closing.status).toBe('closing');
    expect(w.db.hosts[0].dutyStatus).toBe('ONLINE_AVAILABLE');
    // ticket vẫn ACCEPTED: Sale còn theo dõi cọc
    expect(w.db.tickets[0].status).toBe('ACCEPTED');
  });

  it('Host đã OFF_DUTY thì receive/startDeposit giữ nguyên OFF_DUTY', async () => {
    const { w, a, v } = ownedCase('LOBBY', { hostDuty: 'OFF_DUTY' });
    await w.flow.receive(v.bookingRefCode, await w.actor(a));
    expect(w.db.hosts[0].dutyStatus).toBe('OFF_DUTY');
    await w.flow.openDoor(v.bookingRefCode, await w.actor(a));
    await w.flow.startDeposit(v.bookingRefCode, await w.actor(a));
    expect(w.db.hosts[0].dutyStatus).toBe('OFF_DUTY');
  });

  it('remind: trước 10′ ⇒ too_early_reminder; trong 10′ ⇒ đặt mốc, gọi lại không đổi mốc', async () => {
    const early = ownedCase('CONFIRMED', { slot: min(60) });
    expect(await codeOf(early.w.flow.remind(early.v.bookingRefCode, await early.w.actor(early.a)))).toBe('too_early_reminder');

    const { w, a, v } = ownedCase('CONFIRMED', { slot: min(8) });
    const first = await w.flow.remind(v.bookingRefCode, await w.actor(a));
    expect(first.timeline.reminderSentAt).toBe(NOW.toISOString());
    jest.setSystemTime(min(3));
    const again = await w.flow.remind(v.bookingRefCode, await w.actor(a));
    expect(again.timeline.reminderSentAt).toBe(NOW.toISOString());
  });

  it('noShow: trước slot+15′ ⇒ too_early_no_show; sau ⇒ NO_SHOW, ticket COMPLETED, Host ONLINE', async () => {
    const { w, a, v, t } = ownedCase('LOBBY', { slot: min(-10) });
    expect(await codeOf(w.flow.noShow(v.bookingRefCode, await w.actor(a)))).toBe('too_early_no_show');
    jest.setSystemTime(min(6)); // slot+16′
    const d = await w.flow.noShow(v.bookingRefCode, await w.actor(a));
    expect(d).toMatchObject({ status: 'no_show', closedReason: 'no_show', canNoShow: false });
    expect(w.db.tickets.find((x) => x.id === t.id)).toMatchObject({ status: 'COMPLETED' });
    expect(w.db.tickets[0].closedAt).toBeInstanceOf(Date);
  });

  it('notInterested: VIEWING ⇒ COMPLETED + ticket COMPLETED; CLOSING có cọc PAID_HOLDING ⇒ bad_status', async () => {
    const ok = ownedCase('VIEWING');
    const d = await ok.w.flow.notInterested(ok.v.bookingRefCode, await ok.w.actor(ok.a), 'Giá cao hơn ngân sách');
    expect(d).toMatchObject({ status: 'completed', closedReason: 'not_interested: Giá cao hơn ngân sách' });
    expect(ok.w.db.tickets[0].status).toBe('COMPLETED');

    const held = ownedCase('CLOSING');
    held.w.db.deposits.push({ id: 'dep-1', viewingId: held.v.id, paymentStatus: 'PAID_HOLDING', expiresAt: min(2000) });
    expect(await codeOf(held.w.flow.notInterested(held.v.bookingRefCode, await held.w.actor(held.a), 'Đổi ý'))).toBe('bad_status');
    expect(held.w.viewing(held.v.id).status).toBe('CLOSING');

    // CLOSING không cọc ⇒ đóng được
    const free = ownedCase('CLOSING');
    expect((await free.w.flow.notInterested(free.v.bookingRefCode, await free.w.actor(free.a), 'Đổi ý')).status).toBe('completed');
  });

  it('detail của ca đang giữ chỗ chỉ ĐỌC deposit & hợp đồng', async () => {
    const { w, a, v } = ownedCase('HOLDING');
    w.db.deposits.push({ id: 'dep-1', viewingId: v.id, paymentStatus: 'PAID_HOLDING', expiresAt: min(2000), contract: { status: 'DRAFT' } });
    const d = await w.flow.detail(v.bookingRefCode, await w.actor(a));
    expect(d.deposit).toEqual({ status: 'PAID_HOLDING', holdExpiresAt: min(2000).toISOString() });
    expect(d.contract).toEqual({ status: 'DRAFT' });
  });
});

describe('Mã cửa (SPEC-P02 §6 ca 6–8; B5)', () => {
  it('openDoor căn aes: ⇒ PIN đúng, ca VIEWING, AuditLog DOOR_KEY_REVEAL entity Unit, JSON audit KHÔNG chứa PIN', async () => {
    const { w, a, v, unit } = ownedCase('RECEIVING');
    const r = await w.flow.openDoor(v.bookingRefCode, await w.actor(a));
    expect(r.door).toMatchObject({ type: 'ELECTRONIC_PIN', pin: PIN, expiresAt: min(10).toISOString() });
    expect(r.viewing.status).toBe('viewing');
    expect(r.viewing.doorRevealedAt).not.toBeNull();

    const logs = w.audits('DOOR_KEY_REVEAL');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ entityName: 'Unit', entityId: unit.id, actorRole: 'field_host', actorId: a.profileId });
    expect(JSON.stringify(w.db.audits)).not.toContain(PIN);

    // xem lại mã khi ca đang VIEWING ⇒ thêm 1 bản ghi
    const again = await w.flow.revealDoorCode(v.bookingRefCode, await w.actor(a));
    expect(again.pin).toBe(PIN);
    expect(w.audits('DOOR_KEY_REVEAL')).toHaveLength(2);
    expect(JSON.stringify(w.db.audits)).not.toContain(PIN);
  });

  it.each([
    ['chuỗi giữ chỗ seed', 'vault:aes256:door_pin:VHOP-S1.02-1208'],
    ['PIN để trần', 'vault:enc:pin:482910'],
    ['PIN để trần aes256', 'vault:aes256:pin:482910'],
    ['thiếu khoá', null],
  ])('openDoor căn %s ⇒ door_code_missing, ca VẪN RECEIVING, không audit', async (_name, ref) => {
    const { w, a, v } = ownedCase('RECEIVING', { ref });
    expect(await codeOf(w.flow.openDoor(v.bookingRefCode, await w.actor(a)))).toBe('door_code_missing');
    expect(w.viewing(v.id).status).toBe('RECEIVING');
    expect(w.audits('DOOR_KEY_REVEAL')).toHaveLength(0);
  });

  it('ciphertext hỏng / PIN không phải 4–10 chữ số ⇒ door_code_missing', async () => {
    const bad = ownedCase('RECEIVING', { ref: 'aes:v1:xxx:yyy:zzz' });
    expect(await codeOf(bad.w.flow.openDoor(bad.v.bookingRefCode, await bad.w.actor(bad.a)))).toBe('door_code_missing');
    const w = buildWorld();
    const a = w.addHost('a');
    const unit = w.addUnit('U1', { ref: `aes:${w.phones.encrypt('12ab')}` });
    const v = w.addViewing(unit, { status: 'RECEIVING' });
    w.addTicket(v, { hostId: a.id, status: 'ACCEPTED', acceptedAt: NOW });
    expect(await codeOf(w.flow.openDoor(v.bookingRefCode, await w.actor(a)))).toBe('door_code_missing');
  });

  it('revealDoorCode ngoài VIEWING ⇒ bad_status (không lấy được mã sau khi ca đã đóng)', async () => {
    for (const status of ['RECEIVING', 'CLOSING', 'COMPLETED']) {
      const { w, a, v } = ownedCase(status);
      expect(await codeOf(w.flow.revealDoorCode(v.bookingRefCode, await w.actor(a)))).toBe('bad_status');
      expect(w.audits('DOOR_KEY_REVEAL')).toHaveLength(0);
    }
  });

  it('chìa cơ: openDoor ⇒ WITH_HOST + holder; notInterested ⇒ AT_DESK + holder null; không có PIN trong response', async () => {
    const { w, a, v } = ownedCase('RECEIVING', { lock: 'PHYSICAL_KEY' });
    const r = await w.flow.openDoor(v.bookingRefCode, await w.actor(a));
    expect(r.door).toMatchObject({ type: 'PHYSICAL_KEY', pin: null });
    expect(r.door.instructions).toContain('The Sapphire 1');
    expect(w.db.doorKeys[0]).toMatchObject({ physicalKeyState: 'WITH_HOST', physicalKeyHolderId: a.id });

    await w.flow.notInterested(v.bookingRefCode, await w.actor(a), 'Không hợp');
    expect(w.db.doorKeys[0]).toMatchObject({ physicalKeyState: 'AT_DESK', physicalKeyHolderId: null });
  });

  it('emergency chỉ ghi nhật ký (HOST_EMERGENCY), không đổi trạng thái', async () => {
    const { w, a, v } = ownedCase('VIEWING');
    const r = await w.flow.emergency(v.bookingRefCode, await w.actor(a), 'smart_lock', 'Khoá hết pin');
    expect(r.recorded).toBe(true);
    expect(w.viewing(v.id).status).toBe('VIEWING');
    expect(w.audits('HOST_EMERGENCY')[0].newValue).toMatchObject({ kind: 'smart_lock', note: 'Khoá hết pin' });
  });
});

describe('Bất biến B1, B6, B7 (SPEC-P01 §6 ca 11; SPEC-P02 §6 ca 10, 11)', () => {
  const guardFor = (handler: (...a: any[]) => unknown, user: Record<string, unknown> | null) => {
    const ctx = {
      getHandler: () => handler,
      getClass: () => HostViewingsController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
    return () => new RolesGuard(new Reflector()).canActivate(ctx);
  };
  const host = (hostRoles: string[]) => ({ role: 'field_host', isHostVerified: true, hostRoles });

  it('mọi route của HostViewingsController: tenant / landlord / Host chỉ INSPECTOR ⇒ bị chặn; Sale ⇒ qua', () => {
    const proto = HostViewingsController.prototype as any;
    const handlers = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    expect(handlers).toHaveLength(13); // D1–D4 + V1–V9 (SPEC 01 §5)
    for (const name of handlers) {
      expect(guardFor(proto[name], { role: 'tenant' })).toThrow();
      expect(guardFor(proto[name], { role: 'landlord' })).toThrow();
      expect(guardFor(proto[name], null)).toThrow();
      expect(guardFor(proto[name], host(['inspector']))).toThrow(expect.objectContaining({ code: 'host_role_missing' }));
      expect(guardFor(proto[name], host(['sale', 'inspector']))()).toBe(true);
    }
  });

  it('B6: module host-viewings và door không ghi holding_deposits / units', () => {
    const files = ['viewing-flow.service.ts', 'host-board.service.ts', 'host-viewings.controller.ts'].map((f) => join(__dirname, f));
    files.push(join(__dirname, '../door/door-code.service.ts'));
    const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(src).not.toMatch(/holdingDeposit\.(update|create|delete|upsert)/);
    expect(src).not.toMatch(/\bunit\.(update|updateMany|create|delete|upsert)/);
  });

  it('B7: BookingService không còn bản sao thao tác Host', () => {
    const src = readFileSync(join(__dirname, '../booking/booking.service.ts'), 'utf8');
    expect(src).not.toMatch(/async (hostAccept|hostReceive|hostView|hostStartDeposit|sendReminder)\b/);
  });
});

describe('HostService.setDuty (SPEC-P01 §5; H1)', () => {
  const build = (viewingStatus: string | null) => {
    const w = buildWorld();
    const a = w.addHost('a');
    if (viewingStatus) {
      const v = w.addViewing(w.addUnit('U1'), { status: viewingStatus });
      w.addTicket(v, { hostId: a.id, status: 'ACCEPTED', acceptedAt: NOW });
    }
    const prisma: any = {
      ...w.prisma,
      fieldHost: {
        ...w.prisma.fieldHost,
        update: async ({ where, data }: any) => Object.assign(w.db.hosts.find((h) => h.id === where.id)!, data),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HostService } = require('../host/host.service');
    return { w, a, svc: new HostService(prisma, w.phones) };
  };

  it('bật/tắt trực khi rảnh', async () => {
    const { w, a, svc } = build(null);
    expect(await svc.setDuty(a.profileId, 'OFF_DUTY')).toEqual({ dutyStatus: 'OFF_DUTY' });
    expect(w.db.hosts[0].dutyStatus).toBe('OFF_DUTY');
    expect(await svc.setDuty(a.profileId, 'ONLINE_AVAILABLE')).toEqual({ dutyStatus: 'ONLINE_AVAILABLE' });
  });

  it.each(['RECEIVING', 'VIEWING'])('đang %s ⇒ tắt trực bị host_busy; bật trực giữ BUSY_VIEWING', async (status) => {
    const { w, a, svc } = build(status);
    expect(await codeOf(svc.setDuty(a.profileId, 'OFF_DUTY'))).toBe('host_busy');
    expect(await svc.setDuty(a.profileId, 'ONLINE_AVAILABLE')).toEqual({ dutyStatus: 'BUSY_VIEWING' });
    expect(w.db.hosts[0].dutyStatus).toBe('ONLINE_AVAILABLE'); // không ghi đè trạng thái do receive() quản lý
  });

  it('đang theo dõi cọc (CLOSING) thì tắt trực được', async () => {
    const { a, svc } = build('CLOSING');
    expect(await svc.setDuty(a.profileId, 'OFF_DUTY')).toEqual({ dutyStatus: 'OFF_DUTY' });
  });

  it('PATCH /host/me/duty khoá vai sale', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HostController } = require('../host/host.controller');
    const roles = Reflect.getMetadata('roles', HostController.prototype.setDuty);
    const hostRoles = Reflect.getMetadata('hostRoles', HostController.prototype.setDuty);
    expect(roles).toEqual(['field_host']);
    expect(hostRoles).toEqual(['sale']);
  });
});
