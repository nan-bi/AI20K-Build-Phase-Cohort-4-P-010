import { ConflictException } from '@nestjs/common';
import { AdminDispatchService } from './admin-dispatch.service';
import { AdminFeeService } from './admin-fee.service';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminKeyService } from './admin-key.service';
import { AdminPayoutService } from './admin-payout.service';
import { BookingService } from '../booking/booking.service';
import { LandlordMandateService } from '../landlord/landlord-mandate.service';

// Kịch bản xuyên vai trò (Bước 6): service thật chạy trên một "DB" giả dùng chung trong bộ nhớ.
const ADMIN = { id: 'admin-1', role: 'ops_admin' };
const DAY = 86_400_000;

function makeDb() {
  const db: any = {
    building: { id: 'b1', buildingCode: 'S1', zoneName: 'Sapphire', lobbyLatitude: 21.0, lobbyLongitude: 105.9 },
    units: [] as any[],
    mandates: [] as any[],
    viewings: [] as any[],
    tickets: [] as any[],
    hosts: [{ id: 'h1', walletBalance: 0, rating: 4.8, dutyStatus: 'ONLINE_AVAILABLE', profile: { fullName: 'Host Một' } }],
    fees: [] as any[],
    payouts: [] as any[],
    keys: [] as any[],
    seq: 0,
  };
  const joinUnit = (u: any) => ({ ...u, building: db.building, landlord: { fullName: 'Chủ nhà A' } });
  const prisma: any = {
    unit: {
      findFirst: async () => joinUnit(db.units[0]),
      findMany: async () =>
        db.units.map((u: any) => ({
          ...joinUnit(u),
          mandates: db.mandates.filter((m: any) => m.unitId === u.id),
        })),
      findUnique: async ({ where }: any) => db.units.find((u: any) => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => Object.assign(db.units.find((u: any) => u.id === where.id), data),
    },
    role: { findUnique: async () => ({ id: 'r1', code: 'tenant' }) },
    profile: { findUnique: async () => null, create: async ({ data }: any) => ({ ...data }) },
    viewing: {
      create: async ({ data }: any) => {
        const v = { id: `v${++db.seq}`, ...data };
        db.viewings.push(v);
        return v;
      },
      findUnique: async ({ where }: any) => {
        const v = db.viewings.find((x: any) => x.id === where.id);
        return v ? { ...v, tickets: db.tickets.filter((t: any) => t.viewingId === v.id) } : null;
      },
    },
    fieldHost: {
      findFirst: async () => db.hosts[0],
      update: async ({ where, data }: any) => {
        const h = db.hosts.find((x: any) => x.id === where.id);
        h.walletBalance += Number(data.walletBalance.increment);
        return h;
      },
    },
    dispatchTicket: {
      create: async ({ data }: any) => {
        const t = { id: `t${++db.seq}`, offeredAt: new Date(), ...data };
        db.tickets.push(t);
        return t;
      },
      findMany: async () =>
        db.tickets.map((t: any) => {
          const v = db.viewings.find((x: any) => x.id === t.viewingId);
          return {
            ...t,
            host: db.hosts.find((h: any) => h.id === t.hostId) ?? null,
            viewing: { ...v, unit: joinUnit(db.units.find((u: any) => u.id === v.unitId)) },
          };
        }),
    },
    exclusiveMandate: {
      update: async ({ where, data }: any) => Object.assign(db.mandates.find((m: any) => m.id === where.id), data),
      findUnique: async ({ where }: any) => db.mandates.find((m: any) => m.id === where.id) ?? null,
    },
    contract: { count: async () => 0 },
    feeConfig: {
      findMany: async () => db.fees,
      findUnique: async ({ where }: any) => db.fees.find((f: any) => f.configKey === where.configKey) ?? null,
      upsert: async ({ where, update, create }: any) => {
        const cur = db.fees.find((f: any) => f.configKey === where.configKey);
        if (cur) return Object.assign(cur, update, { updatedAt: new Date() });
        const row = { id: `f${++db.seq}`, updatedAt: new Date(), ...create };
        db.fees.push(row);
        return row;
      },
    },
    hostPayout: {
      findFirst: async ({ where }: any) => db.payouts.find((p: any) => p.transRef === where.transRef) ?? null,
      create: async ({ data }: any) => {
        db.payouts.push({ ...data, amount: Number(data.amount) });
      },
    },
    doorAccessKey: {
      findUnique: async ({ where }: any) => db.keys.find((k: any) => k.id === where.id) ?? null,
      findMany: async () => db.keys.map((k: any) => ({ ...k, unit: db.units[0] })),
      update: async ({ where, data }: any) => Object.assign(db.keys.find((k: any) => k.id === where.id), data),
    },
  };
  prisma.$transaction = async (cb: any) => cb(prisma);
  return { db, prisma };
}

const audit = () => ({ log: jest.fn().mockResolvedValue(undefined) }) as any;
const seedUnit = (db: any, status = 'AVAILABLE') =>
  db.units.push({ id: 'u1', unitCode: 'S1-1201', status, layoutType: '2PN', carpetAreaM2: 60, baseRentPrice: 12_000_000 });

describe('Luồng xuyên vai trò (mock Prisma)', () => {
  it('1. Tenant đặt lịch → ticket tới Host → Admin thấy trong bảng SLA', async () => {
    const { db, prisma } = makeDb();
    seedUnit(db);
    const booking = new BookingService(prisma);
    const res: any = await booking.createBooking({ unitId: 'u1', slot: '2026-10-06T02:00:00Z', name: 'Khách', phone: '0900000001', persons: 2 } as any);

    expect(res.success).toBe(true);
    expect(db.tickets).toHaveLength(1);
    expect(db.tickets[0]).toMatchObject({ hostId: 'h1', tier: 1, status: 'OFFERED', viewingId: res.bookingId });

    const sla = await new AdminDispatchService(prisma, audit()).getSlaMonitoring(
      new Date(db.tickets[0].offeredAt.getTime() + 400_000),
    );
    expect(sla).toHaveLength(1);
    expect(sla[0]).toMatchObject({ unitCode: 'S1-1201', hostName: 'Host Một', status: 'OFFERED', isBreached: true, secondsOverdue: 100 });
  });

  describe('3. Landlord yêu cầu thoát → Admin thấy countdown → bị từ chối khi HOLDING', () => {
    const now = new Date('2026-10-05T03:00:00Z');
    const setup = (unitStatus: string) => {
      const { db, prisma } = makeDb();
      seedUnit(db, unitStatus);
      db.mandates.push({ id: 'm1', unitId: 'u1', status: 'ACTIVE', createdAt: now, exitEffectiveAt: null });
      const access: any = {
        ownedMandate: async () => ({ ...db.mandates[0], unit: { ...db.units[0], building: db.building } }),
      };
      return { db, prisma, landlord: new LandlordMandateService(prisma, access, audit()), inv: new AdminInventoryService(prisma, audit()) };
    };

    it('Admin thấy đếm ngược 15 ngày và chưa được chấm dứt', async () => {
      const { landlord, inv } = setup('AVAILABLE');
      await landlord.requestExit('l1', { mandateId: 'm1', reason: 'Bán nhà' } as any, now);
      const [row] = await inv.getExclusiveInventory(now);
      expect(row).toMatchObject({ mandateStatus: 'EXIT_REQUESTED', exitCountdownDays: 15, canTerminate: false, terminateBlockedReason: 'EXIT_NOTICE_NOT_ELAPSED' });
    });

    it('Căn chuyển HOLDING sau khi hết 15 ngày: Admin bị từ chối chấm dứt, mandate giữ nguyên', async () => {
      const { db, landlord, inv } = setup('AVAILABLE');
      await landlord.requestExit('l1', { mandateId: 'm1', reason: 'Bán nhà' } as any, now);
      db.units[0].status = 'HOLDING';
      const later = new Date(now.getTime() + 16 * DAY);
      const [row] = await inv.getExclusiveInventory(later);
      expect(row).toMatchObject({ canTerminate: false, terminateBlockedReason: 'UNIT_HOLDING' });
      await expect(inv.terminateMandate('m1', 'hết hạn', ADMIN, later)).rejects.toBeInstanceOf(ConflictException);
      expect(db.mandates[0].status).toBe('EXIT_REQUESTED');
      expect(db.units[0].status).toBe('HOLDING');
    });

    it('Landlord không thể yêu cầu thoát khi căn đang HOLDING', async () => {
      const { db, landlord } = setup('HOLDING');
      await expect(landlord.requestExit('l1', { mandateId: 'm1', reason: 'x' } as any, now)).rejects.toBeInstanceOf(ConflictException);
      expect(db.mandates[0].status).toBe('ACTIVE');
    });
  });

  it('4. Admin đổi biến phí → khoản mới dùng cấu hình mới, khoản cũ giữ nguyên', async () => {
    const { db, prisma } = makeDb();
    seedUnit(db);
    db.hosts[0].walletBalance = 0;
    const fee = new AdminFeeService(prisma, audit());
    const payout = new AdminPayoutService(prisma, audit());
    for (const id of ['v1', 'v2']) {
      db.viewings.push({ id, unitId: 'u1', status: 'COMPLETED', viewingSlot: new Date('2026-10-06T02:00:00Z'), completedAt: new Date('2026-10-06T03:00:00Z') });
      db.tickets.push({ id: `t-${id}`, viewingId: id, hostId: 'h1', status: 'COMPLETED', offeredAt: new Date() });
    }

    await fee.updateCommissionParam({ configKey: 'host_base_viewing_fee', paramValue: 50_000, reason: 'khởi tạo' } as any, ADMIN);
    expect(await payout.accrueViewing('v1')).toBe(1);

    await fee.updateCommissionParam({ configKey: 'host_base_viewing_fee', paramValue: 80_000, reason: 'mùa cao điểm' } as any, ADMIN);
    expect(await payout.accrueViewing('v2')).toBe(1);
    expect(await payout.accrueViewing('v1')).toBe(0);

    expect(db.payouts.find((p: any) => p.transRef === 'viewing:v1').amount).toBe(50_000);
    expect(db.payouts.find((p: any) => p.transRef === 'viewing:v2').amount).toBe(80_000);
    expect(db.hosts[0].walletBalance).toBe(130_000);
  });

  describe('6. Admin xoay mã khóa (phần không phụ thuộc module hợp đồng)', () => {
    it('không response nào chứa plaintext; chỉ lưu bản mã hóa', async () => {
      const { db, prisma } = makeDb();
      seedUnit(db);
      db.keys.push({ id: 'k1', unitId: 'u1', keyType: 'ELECTRONIC_PIN', status: 'ACTIVE', vaultSecretRef: 'enc:000000', issuedAt: new Date() });
      let plain = '';
      const svc = new AdminKeyService(prisma, audit(), {
        encrypt: (p: string) => {
          plain = p;
          return `enc:${p}`;
        },
      });

      const rotated = await svc.rotateKey('k1', { reason: 'khách cũ trả phòng' }, ADMIN);
      const listed = await svc.listKeys();

      expect(plain).toMatch(/^\d{6}$/);
      expect(JSON.stringify(rotated)).not.toContain(plain);
      expect(JSON.stringify(listed)).not.toContain(plain);
      expect(JSON.stringify(listed)).not.toContain('vaultSecretRef');
      expect(db.keys[0].vaultSecretRef).toBe(`enc:${plain}`);
      expect(db.keys[0].vaultSecretRef).not.toBe('enc:000000');
    });

    it('thu hồi xóa bí mật khỏi kho và không trả plaintext', async () => {
      const { db, prisma } = makeDb();
      seedUnit(db);
      db.keys.push({ id: 'k1', unitId: 'u1', keyType: 'ELECTRONIC_PIN', status: 'ACTIVE', vaultSecretRef: 'enc:123456', issuedAt: new Date() });
      const svc = new AdminKeyService(prisma, audit(), { encrypt: (p) => `enc:${p}` });
      const res = await svc.revokeKey('k1', { reason: 'mất quyền' }, ADMIN);
      expect(JSON.stringify(res)).not.toContain('123456');
      expect(db.keys[0]).toMatchObject({ status: 'REVOKED', vaultSecretRef: null });
    });
  });
});
