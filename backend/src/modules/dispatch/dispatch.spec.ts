import { ticketTierAt, inZone } from './ticket-tier';
import { vnDayRange } from './dispatch-assigner.service';
import { DispatchModule } from './dispatch.module';
import { buildWorld, min, NOW, sec } from '../host-viewings/testing/world';

describe('Điều phối — tầng hiển thị (SPEC-P01 §6 ca 2)', () => {
  const at = (offeredAt: Date, hostId: string | null, now: Date) => ticketTierAt({ hostId, offeredAt }, now);

  it('offeredAt cách 0′ / 3′01″ / 6′01″ ⇒ ASSIGNED / ZONE_POOL / WIDE_POOL', () => {
    expect(at(NOW, 'h1', NOW)).toBe('ASSIGNED');
    expect(at(NOW, 'h1', sec(179))).toBe('ASSIGNED');
    expect(at(NOW, 'h1', sec(181))).toBe('ZONE_POOL');
    expect(at(NOW, 'h1', sec(361))).toBe('WIDE_POOL');
  });

  it('hostId null ⇒ ZONE_POOL ngay từ giây đầu, 6′ sau thành WIDE_POOL', () => {
    expect(at(NOW, null, NOW)).toBe('ZONE_POOL');
    expect(at(NOW, null, sec(361))).toBe('WIDE_POOL');
  });

  it('cùng phân khu = phân khu Host CHỨA tên phân khu của tòa', () => {
    expect(inZone('The Sapphire 1, The Sapphire 2', 'The Sapphire 1')).toBe(true);
    expect(inZone('Zen Park', 'The Sapphire 1')).toBe(false);
  });

  it('vnDayRange: 23:30 UTC ngày 5 đã là ngày 6 giờ VN', () => {
    const r = vnDayRange(new Date('2026-10-05T23:30:00Z'));
    expect(r.from.toISOString()).toBe('2026-10-05T17:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-10-06T17:00:00.000Z');
  });
});

describe('DispatchAssignerService.pickHost (SPEC-P01 §6 ca 1)', () => {
  it('bỏ Host không có SALE / bị khoá / OFF_DUTY / khác phân khu / có ca trong ±45′; chọn người ít ca trong ngày hơn', async () => {
    const w = buildWorld();
    w.addHost('khong-sale', { roles: ['INSPECTOR'] });
    w.addHost('bi-khoa', { active: false });
    w.addHost('nghi', { duty: 'OFF_DUTY' });
    w.addHost('khac-khu', { zone: 'Zen Park' });
    const ban = w.addHost('ban-ca-gan');
    const nhieu = w.addHost('nhieu-ca', { rating: 5 });
    const it = w.addHost('it-ca', { rating: 4 });

    const unit = w.addUnit('U1');
    const slot = min(180);
    // ban-ca-gan: ca ACCEPTED lệch 30′ ⇒ loại
    const near = w.addViewing(unit, { slot: min(210), status: 'CONFIRMED' });
    w.addTicket(near, { hostId: ban.id, status: 'ACCEPTED', acceptedAt: NOW });
    // nhieu-ca: 2 ca trong ngày nhưng cách xa ⇒ không loại, chỉ xếp sau
    for (const off of [-300, 400]) {
      const v = w.addViewing(unit, { slot: min(180 + off), status: 'CONFIRMED' });
      w.addTicket(v, { hostId: nhieu.id, status: 'ACCEPTED', acceptedAt: NOW });
    }

    const picked = await w.assigner.pickHost(w.prisma, { zoneName: 'The Sapphire 1', slot });
    expect(picked?.id).toBe(it.id);
  });

  it('hoà số ca ⇒ rating cao hơn thắng; không ai đạt ⇒ null, offer() tạo ticket hostId null tier 2', async () => {
    const w = buildWorld();
    w.addHost('thap', { rating: 4.1 });
    const cao = w.addHost('cao', { rating: 4.9 });
    const unit = w.addUnit('U1');
    expect((await w.assigner.pickHost(w.prisma, { zoneName: 'The Sapphire 1', slot: min(60) }))?.id).toBe(cao.id);

    const v = w.addViewing(unit);
    const t = await w.assigner.offer(w.prisma, { viewingId: v.id, zoneName: 'Zen Park', slot: min(60) });
    expect(t).toMatchObject({ hostId: null, tier: 2, slaSeconds: 180, status: 'OFFERED' });
  });

  it('excludeHostIds loại người đã từ chối', async () => {
    const w = buildWorld();
    const a = w.addHost('a');
    const b = w.addHost('b');
    const picked = await w.assigner.pickHost(w.prisma, { zoneName: 'The Sapphire 1', slot: min(60), excludeHostIds: [a.id] });
    expect(picked?.id).toBe(b.id);
  });
});

describe('Route giả /dispatch/* đã xoá (SPEC-P01 §6 ca 10)', () => {
  it('DispatchModule không còn controller nào', () => {
    expect(Reflect.getMetadata('controllers', DispatchModule)).toBeUndefined();
  });
});
