import { AuthException } from '../auth/auth.errors';
import { AuthSessionService } from '../auth/session/auth-session.service';
import { RoleIdService } from '../auth/session/role-ids.service';
import { createFakePrisma, seedProfile } from '../auth/testing/fake-prisma';
import { createSessionTokens } from '../auth/testing/fake-session-token';
import { PhoneService } from '../auth/phone/phone.service';
import { fakeConfig } from '../auth/testing/fake-config';
import { FieldHostsService } from './field-hosts.service';

const ADMIN = { id: 'admin-1', email: 'a@x.vn', fullName: 'Admin', role: 'ops_admin', portal: 'admin' as const, isPhoneVerified: true, isHostVerified: false, hostRoles: [] };
const CTX = { ipAddress: '203.0.113.7', userAgent: 'jest' };

function setup() {
  const prisma = createFakePrisma();
  prisma.building.rows.push({ id: 'b1', zoneName: 'The Sapphire 1' }, { id: 'b2', zoneName: 'The Zenpark' });
  const sessions = new AuthSessionService(prisma as any, createSessionTokens());
  const invalidate = jest.spyOn(sessions, 'invalidate');
  const phones = new PhoneService(fakeConfig({ AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!' }));
  const service = new FieldHostsService(prisma as any, phones, sessions, new RoleIdService(prisma as any));
  return { prisma, service, invalidate, phones };
}

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'no-error';
  } catch (err) {
    return err instanceof AuthException ? err.code : `unexpected:${(err as Error).message}`;
  }
};

const input = (over: Record<string, unknown> = {}) => ({
  email: 'Host@Example.com',
  fullName: ' Nam ',
  assignedZone: 'The Sapphire 1',
  roles: ['inspector', 'sale'] as any,
  ...over,
});

describe('FieldHostsService', () => {
  describe('create', () => {
    it('tạo Profile field_host + FieldHost, vai đúng thứ tự, mật khẩu băm, AuditLog HOST_CREATE không chứa mật khẩu/băm', async () => {
      const { prisma, service, invalidate } = setup();
      const view = await service.create(input({ password: 'Matkhau-123' }) as any, ADMIN, CTX);

      expect(view).toMatchObject({ email: 'host@example.com', fullName: 'Nam', roles: ['sale', 'inspector'], hasPassword: true, isActive: true });
      const profile = prisma.profile.rows[0];
      expect(profile.passwordHash).toMatch(/^scrypt\$/);
      expect(prisma.role.rows.find((r: any) => r.id === profile.roleId).code).toBe('field_host');
      expect(prisma.fieldHost.rows[0]).toMatchObject({ profileId: profile.id, roles: ['SALE', 'INSPECTOR'], dutyStatus: 'OFF_DUTY' });

      const log = prisma.auditLog.rows[0];
      expect(log).toMatchObject({ actorId: 'admin-1', actionType: 'HOST_CREATE', entityName: 'field_hosts', entityId: view.id });
      expect(log.newValue).toMatchObject({ passwordSet: true, adoptedProfile: false });
      expect(JSON.stringify(log)).not.toMatch(/Matkhau-123|scrypt\$/);
      expect(invalidate).toHaveBeenCalledWith(profile.id);
    });

    it('không gửi mật khẩu ⇒ passwordHash null (chỉ đăng nhập Google)', async () => {
      const { prisma, service } = setup();
      expect(await service.create(input() as any, ADMIN, CTX)).toMatchObject({ hasPassword: false });
      expect(prisma.profile.rows[0].passwordHash).toBeNull();
    });

    it('nhận Profile field_host mồ côi: giữ nguyên id, không tạo Profile thứ hai, kích hoạt lại', async () => {
      const { prisma, service } = setup();
      const orphan = seedProfile(prisma, { email: 'host@example.com', roleCode: 'field_host', isActive: false });
      const view = await service.create(input() as any, ADMIN, CTX);

      expect(view.profileId).toBe(orphan.id);
      expect(prisma.profile.rows).toHaveLength(1);
      expect(prisma.profile.rows[0]).toMatchObject({ isActive: true, fullName: 'Nam' });
      expect(prisma.auditLog.rows[0].newValue).toMatchObject({ adoptedProfile: true });
    });

    it('email là tenant ⇒ account_conflict; đã là Host ⇒ host_already_exists; không tạo gì thêm', async () => {
      const { prisma, service } = setup();
      seedProfile(prisma, { email: 'host@example.com', roleCode: 'tenant' });
      expect(await codeOf(service.create(input() as any, ADMIN, CTX))).toBe('account_conflict');

      seedProfile(prisma, { email: 'h2@example.com', roleCode: 'field_host', withFieldHost: true });
      expect(await codeOf(service.create(input({ email: 'H2@example.com' }) as any, ADMIN, CTX))).toBe('host_already_exists');
      expect(prisma.fieldHost.rows).toHaveLength(1);
      expect(prisma.auditLog.rows).toHaveLength(0);
    });

    it('phân khu không có trong buildings ⇒ invalid_zone, không tạo gì', async () => {
      const { prisma, service } = setup();
      expect(await codeOf(service.create(input({ assignedZone: 'Không có' }) as any, ADMIN, CTX))).toBe('invalid_zone');
      expect(prisma.profile.rows).toHaveLength(0);
    });
  });

  describe('đọc', () => {
    async function seedThree() {
      const ctx = setup();
      const a = await ctx.service.create(input({ email: 'sale@x.vn', fullName: 'Sale An', roles: ['sale'] }) as any, ADMIN, CTX);
      const b = await ctx.service.create(input({ email: 'insp@x.vn', fullName: 'Insp Binh', roles: ['inspector'], assignedZone: 'The Zenpark' }) as any, ADMIN, CTX);
      const c = await ctx.service.create(input({ email: 'both@x.vn', fullName: 'Both Chi', roles: ['sale', 'inspector'] }) as any, ADMIN, CTX);
      return { ...ctx, a, b, c };
    }

    it('lọc theo vai: sale (có Sale, gồm cả hai vai), inspector, both', async () => {
      const { service } = await seedThree();
      const emails = async (role: any) => (await service.list({ role })).map((h) => h.email).sort();
      expect(await emails('sale')).toEqual(['both@x.vn', 'sale@x.vn']);
      expect(await emails('inspector')).toEqual(['both@x.vn', 'insp@x.vn']);
      expect(await emails('both')).toEqual(['both@x.vn']);
    });

    it('lọc theo phân khu, trạng thái khoá và tìm theo tên/email/SĐT đã giải mã', async () => {
      const { service, prisma, phones, a } = await seedThree();
      expect((await service.list({ zone: 'The Zenpark' })).map((h) => h.email)).toEqual(['insp@x.vn']);
      expect((await service.list({ q: 'binh' })).map((h) => h.email)).toEqual(['insp@x.vn']);

      prisma.profile.rows.find((p: any) => p.id === a.profileId).phoneEnc = phones.encrypt('+84912345678');
      expect((await service.list({ q: '0912 345 678' })).map((h) => h.email)).toEqual(['sale@x.vn']);
      expect((await service.list({ q: '0912345678' }))[0].phone).toBe('0912345678');

      await service.update(a.id, { isActive: false }, ADMIN, CTX);
      expect((await service.list({ active: 'false' })).map((h) => h.email)).toEqual(['sale@x.vn']);
      expect(await service.list({ active: 'true' })).toHaveLength(2);
    });

    it('list/detail không bao giờ có passwordHash; detail có đủ 7 khoá ticketStats; id lạ ⇒ host_not_found', async () => {
      const { service, prisma, a } = await seedThree();
      prisma.profile.rows[0].passwordHash = 'scrypt$aa$bb';
      prisma.dispatchTicket.rows.push({ id: 't1', hostId: a.id, status: 'COMPLETED' }, { id: 't2', hostId: a.id, status: 'COMPLETED' }, { id: 't3', hostId: a.id, status: 'EXPIRED' });
      const detail = await service.detail(a.id);
      expect(detail.ticketStats).toEqual({ OFFERED: 0, ACCEPTED: 0, CHECKED: 0, COMPLETED: 2, EXPIRED: 1, ESCALATED: 0, CANCELLED: 0 });
      expect(JSON.stringify([detail, await service.list({})])).not.toMatch(/scrypt\$|passwordHash/);
      expect(await codeOf(service.detail('00000000-0000-4000-8000-000000000000'))).toBe('host_not_found');
    });

    it('zones: phân khu không trùng, sắp chữ cái', async () => {
      const { service, prisma } = setup();
      prisma.building.rows.push({ id: 'b3', zoneName: 'The Sapphire 1' });
      expect(await service.zones()).toEqual(['The Sapphire 1', 'The Zenpark']);
    });
  });

  describe('update / deactivate', () => {
    async function oneHost() {
      const ctx = setup();
      const host = await ctx.service.create(input({ roles: ['sale'] }) as any, ADMIN, CTX);
      ctx.prisma.auditLog.rows.length = 0;
      ctx.invalidate.mockClear();
      return { ...ctx, host };
    }

    it('đổi vai ⇒ AuditLog HOST_ROLES_UPDATE (cũ/mới) + invalidate phiên', async () => {
      const { service, prisma, host, invalidate } = await oneHost();
      const view = await service.update(host.id, { roles: ['inspector', 'sale'] as any }, ADMIN, CTX);
      expect(view.roles).toEqual(['sale', 'inspector']);
      expect(prisma.auditLog.rows).toHaveLength(1);
      expect(prisma.auditLog.rows[0]).toMatchObject({
        actionType: 'HOST_ROLES_UPDATE',
        oldValue: { roles: ['sale'] },
        newValue: { roles: ['sale', 'inspector'] },
      });
      expect(invalidate).toHaveBeenCalledWith(host.profileId);
    });

    it('gửi lại đúng dữ liệu hiện có ⇒ không ghi log, không invalidate; body rỗng ⇒ invalid_request', async () => {
      const { service, prisma, host, invalidate } = await oneHost();
      await service.update(host.id, { roles: ['sale'] as any, fullName: 'Nam', assignedZone: 'The Sapphire 1' }, ADMIN, CTX);
      expect(prisma.auditLog.rows).toHaveLength(0);
      expect(invalidate).not.toHaveBeenCalled();
      expect(await codeOf(service.update(host.id, {}, ADMIN, CTX))).toBe('invalid_request');
    });

    it('đặt lại mật khẩu: lưu băm mới, log chỉ ghi "<changed>"; đổi tên/phân khu ⇒ HOST_UPDATE old/new', async () => {
      const { service, prisma, host } = await oneHost();
      await service.update(host.id, { password: 'Matkhau-moi-1', fullName: 'Nam Mới', assignedZone: 'The Zenpark' }, ADMIN, CTX);
      expect(prisma.profile.rows[0].passwordHash).toMatch(/^scrypt\$/);
      const log = prisma.auditLog.rows.find((r: any) => r.actionType === 'HOST_UPDATE');
      expect(log.oldValue).toEqual({ fullName: 'Nam', assignedZone: 'The Sapphire 1' });
      expect(log.newValue).toEqual({ fullName: 'Nam Mới', assignedZone: 'The Zenpark', password: '<changed>' });
      expect(JSON.stringify(prisma.auditLog.rows)).not.toMatch(/Matkhau-moi-1|scrypt\$/);
    });

    it('phân khu không hợp lệ ⇒ invalid_zone, dữ liệu giữ nguyên', async () => {
      const { service, prisma, host } = await oneHost();
      expect(await codeOf(service.update(host.id, { assignedZone: 'Nowhere' }, ADMIN, CTX))).toBe('invalid_zone');
      expect(prisma.fieldHost.rows[0].assignedZone).toBe('The Sapphire 1');
    });

    it('khoá: ticket đang chạy ⇒ host_has_active_tickets (không đổi gì); hết ticket ⇒ khoá, OFF_DUTY, log HOST_DEACTIVATE; gọi lại ⇒ không log thêm', async () => {
      const { service, prisma, host } = await oneHost();
      prisma.dispatchTicket.rows.push({ id: 't1', hostId: host.id, status: 'ACCEPTED' });
      expect(await codeOf(service.deactivate(host.id, ADMIN, CTX))).toBe('host_has_active_tickets');
      expect(prisma.profile.rows[0].isActive).toBe(true);
      expect(prisma.auditLog.rows).toHaveLength(0);

      prisma.dispatchTicket.rows[0].status = 'COMPLETED';
      prisma.fieldHost.rows[0].dutyStatus = 'ONLINE_AVAILABLE';
      const view = await service.deactivate(host.id, ADMIN, CTX);
      expect(view).toMatchObject({ isActive: false, dutyStatus: 'OFF_DUTY' });
      expect(prisma.auditLog.rows.map((r: any) => r.actionType)).toEqual(['HOST_DEACTIVATE']);

      await service.deactivate(host.id, ADMIN, CTX);
      expect(prisma.auditLog.rows).toHaveLength(1);
    });

    it('mở khoá ⇒ HOST_REACTIVATE; id lạ ⇒ host_not_found', async () => {
      const { service, prisma, host } = await oneHost();
      await service.deactivate(host.id, ADMIN, CTX);
      await service.update(host.id, { isActive: true }, ADMIN, CTX);
      expect(prisma.profile.rows[0].isActive).toBe(true);
      expect(prisma.auditLog.rows.map((r: any) => r.actionType)).toEqual(['HOST_DEACTIVATE', 'HOST_REACTIVATE']);
      expect(await codeOf(service.update('00000000-0000-4000-8000-000000000000', { fullName: 'X' }, ADMIN, CTX))).toBe('host_not_found');
    });
  });
});
