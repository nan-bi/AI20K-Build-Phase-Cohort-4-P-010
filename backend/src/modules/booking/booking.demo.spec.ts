import { BookingService } from './booking.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { toTenantBooking } from '../tenant/tenant.mappers';
import { buildWorld, codeOf, NOW, PIN, min } from '../host-viewings/testing/world';

beforeEach(() => jest.useFakeTimers({ now: NOW }));
afterEach(() => jest.useRealTimers());

function demoWorld() {
  const w = buildWorld();
  const booking = new BookingService(
    w.prisma,
    new BookingAccessService(w.prisma),
    w.phones,
    {} as any,
    w.assigner,
    w.flow,
  );
  return { w, booking };
}

describe('Công cụ demo A21 đi qua ViewingFlowService (SPEC-P02 §6 ca 11)', () => {
  it('host-accept → reminder → host-receive → host-view → host-start-deposit gọi đúng ViewingFlowService; khách không thấy PIN', async () => {
    const { w, booking } = demoWorld();
    const a = w.addHost('a');
    const unit = w.addUnit('U1');
    const v = w.addViewing(unit, { slot: min(120) });
    w.addTicket(v, { hostId: a.id });
    const user = { id: 'tenant-1' };
    const spies = {
      claim: jest.spyOn(w.flow, 'claim'),
      remind: jest.spyOn(w.flow, 'remind'),
      receive: jest.spyOn(w.flow, 'receive'),
      openDoor: jest.spyOn(w.flow, 'openDoor'),
      startDeposit: jest.spyOn(w.flow, 'startDeposit'),
    };

    const bodies: unknown[] = [];
    bodies.push(await booking.executeDemoStep(v.bookingRefCode, 'host-accept', user));
    bodies.push(await booking.executeDemoStep(v.bookingRefCode, 'reminder', user)); // slot còn 120′: demo bỏ ràng buộc giờ
    bodies.push(await booking.executeDemoStep(v.bookingRefCode, 'host-receive', user));
    bodies.push(await booking.executeDemoStep(v.bookingRefCode, 'host-view', user));
    const last: any = await booking.executeDemoStep(v.bookingRefCode, 'host-start-deposit', user);
    bodies.push(last);

    for (const s of Object.values(spies)) expect(s).toHaveBeenCalledTimes(1);
    expect(last.status).toBe('closing');
    expect(JSON.stringify(bodies)).not.toContain(PIN);
    // audit đánh dấu thao tác demo
    expect(w.audits('DOOR_KEY_REVEAL')[0].newValue).toMatchObject({ via: 'demo' });
  });

  it('ticket chưa có Host (hostId null) ⇒ chọn Sale phù hợp; không có ai ⇒ 409 no_host_available', async () => {
    const withHost = demoWorld();
    const sale = withHost.w.addHost('sale');
    const v1 = withHost.w.addViewing(withHost.w.addUnit('U1'));
    withHost.w.addTicket(v1, { hostId: null });
    const res: any = await withHost.booking.executeDemoStep(v1.bookingRefCode, 'host-accept', { id: 'tenant-1' });
    expect(res.status).toBe('confirmed');
    expect(withHost.w.db.tickets[0]).toMatchObject({ hostId: sale.id, status: 'ACCEPTED' });

    const none = demoWorld();
    const v2 = none.w.addViewing(none.w.addUnit('U1'));
    none.w.addTicket(v2, { hostId: null });
    expect(await codeOf(none.booking.executeDemoStep(v2.bookingRefCode, 'host-accept', { id: 'tenant-1' }))).toBe('no_host_available');
  });

  it('khách khác không tua được lịch của người khác (booking_not_found); bước lạ ⇒ invalid_request', async () => {
    const { w, booking } = demoWorld();
    w.addHost('a');
    const v = w.addViewing(w.addUnit('U1'));
    w.addTicket(v, { hostId: 'host-a' });
    expect(await codeOf(booking.executeDemoStep(v.bookingRefCode, 'host-accept', { id: 'tenant-2' }))).toBe('booking_not_found');
    expect(await codeOf(booking.executeDemoStep(v.bookingRefCode, 'abc', { id: 'tenant-1' }))).toBe('invalid_request');
  });
});

describe('tenant.mappers — Host hiển thị cho khách (SPEC-P02 §6 ca 12)', () => {
  const base = (tickets: any[]) => ({
    bookingRefCode: 'VS-ABCDE',
    status: 'COMPLETED',
    viewingSlot: min(-120),
    unit: { unitCode: 'U1', layoutType: 'STUDIO', baseRentPrice: 1, marketAvgPrice: 1, managementFee: 0, parkingFeeEstimate: 0, utilityCostEstimate: 0, carpetAreaM2: 30, floorNumber: 3, media: [] },
    tickets,
  });
  const host = (name: string) => ({ profile: { fullName: name }, rating: 4.8 });

  it('ca COMPLETED vẫn trả host.name của chủ ca (ticket COMPLETED có acceptedAt)', () => {
    const b = toTenantBooking(base([{ status: 'COMPLETED', acceptedAt: NOW, tier: 1, host: host('Sale Nam') }]));
    expect(b.host).toEqual({ name: 'Sale Nam', rating: 4.8 });
  });

  it('chủ ca được ưu tiên hơn ticket ESCALATED/OFFERED cũ; chưa ai nhận thì giữ hành vi cũ (ticket tier 1 cuối cùng)', () => {
    const b = toTenantBooking(
      base([
        { status: 'ESCALATED', acceptedAt: null, tier: 1, host: host('Người từ chối') },
        { status: 'ACCEPTED', acceptedAt: NOW, tier: 1, host: host('Chủ ca') },
      ]),
    );
    expect(b.host?.name).toBe('Chủ ca');
    const waiting = toTenantBooking(base([{ status: 'OFFERED', acceptedAt: null, tier: 1, host: host('Được giao') }]));
    expect(waiting.host?.name).toBe('Được giao');
    expect(toTenantBooking(base([{ status: 'OFFERED', acceptedAt: null, tier: 2, host: null }])).host).toBeNull();
  });
});
