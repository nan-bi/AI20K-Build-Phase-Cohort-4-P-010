import { User } from '@supabase/supabase-js';
import { createFakePrisma, seedProfile } from '../testing/fake-prisma';
import { fakeSupabaseUser } from '../testing/fake-supabase';
import { ProfileProvisioningService } from './profile-provisioning.service';

const setup = () => {
  const prisma = createFakePrisma();
  return { prisma, service: new ProfileProvisioningService(prisma as any) };
};

const user = (overrides: Partial<User> = {}) => fakeSupabaseUser({ email: 'New.User@Example.com', ...overrides });

describe('ProfileProvisioningService.ensureProfile', () => {
  it('từ chối khi email chưa được xác nhận (chặn chiếm email của Host được mời)', async () => {
    const { service } = setup();
    expect(await service.ensureProfile(user({ email_confirmed_at: undefined }), 'landlord')).toEqual({
      ok: false,
      error: 'email_not_verified',
    });
  });

  it.each([
    ['tenant', 'tenant'],
    ['landlord', 'landlord'],
  ] as const)('tự tạo Profile %s ở lần đăng nhập đầu (email chuẩn hóa chữ thường)', async (portal, roleCode) => {
    const { prisma, service } = setup();
    const result = await service.ensureProfile(user({ user_metadata: { full_name: 'Nguyễn Văn An' } }), portal);

    expect(result).toMatchObject({ ok: true, created: true, needsRfidVerification: false });
    const profile = prisma.profile.rows[0];
    expect(profile).toMatchObject({ email: 'new.user@example.com', fullName: 'Nguyễn Văn An' });
    expect(prisma.role.rows.find((r: any) => r.id === profile.roleId).code).toBe(roleCode);
  });

  it('lần đăng nhập sau: không tạo trùng, cập nhật lastLoginAt', async () => {
    const { prisma, service } = setup();
    const first = await service.ensureProfile(user(), 'tenant');
    const second = await service.ensureProfile(user(), 'tenant');

    expect(first).toMatchObject({ created: true });
    expect(second).toMatchObject({ ok: true, created: false });
    expect(prisma.profile.rows).toHaveLength(1);
    expect(prisma.profile.rows[0].lastLoginAt).toBeInstanceOf(Date);
  });

  it('không cho đăng nhập chéo cổng (tenant ↔ landlord)', async () => {
    const { service } = setup();
    await service.ensureProfile(user(), 'tenant');
    expect(await service.ensureProfile(user(), 'landlord')).toEqual({ ok: false, error: 'wrong_portal' });
  });

  it('tài khoản bị khoá không đăng nhập được', async () => {
    const { prisma, service } = setup();
    const supa = user();
    seedProfile(prisma, { id: supa.id, email: 'new.user@example.com', roleCode: 'tenant', isActive: false });
    expect(await service.ensureProfile(supa, 'tenant')).toEqual({ ok: false, error: 'account_suspended' });
  });

  it('admin không bao giờ được tự tạo ở đây', async () => {
    const { prisma, service } = setup();
    expect(await service.ensureProfile(user(), 'admin')).toEqual({ ok: false, error: 'not_authorized' });
    expect(prisma.profile.rows).toHaveLength(0);
  });

  it('admin đã được cấp (script) đăng nhập được qua cổng admin, không qua cổng khác', async () => {
    const { prisma, service } = setup();
    const supa = user();
    seedProfile(prisma, { id: supa.id, email: 'new.user@example.com', roleCode: 'ops_admin' });
    expect(await service.ensureProfile(supa, 'admin')).toMatchObject({ ok: true });
    expect(await service.ensureProfile(supa, 'landlord')).toEqual({ ok: false, error: 'wrong_portal' });
  });

  describe('host', () => {
    it('email không có lời mời → not_authorized và không tạo Profile', async () => {
      const { prisma, service } = setup();
      expect(await service.ensureProfile(user(), 'host')).toEqual({ ok: false, error: 'not_authorized' });
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('có lời mời → tạo Profile field_host và yêu cầu RFID (chưa có FieldHost)', async () => {
      const { prisma, service } = setup();
      const invite = await prisma.hostInvite.create({ data: { email: 'new.user@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });

      const result = await service.ensureProfile(user(), 'host');
      expect(result).toMatchObject({ ok: true, created: true, needsRfidVerification: true, hostId: invite.id });
      expect(prisma.fieldHost.rows).toHaveLength(0);
    });

    it('đăng nhập lại khi chưa nhập RFID vẫn bị giữ ở bước RFID', async () => {
      const { prisma, service } = setup();
      const invite = await prisma.hostInvite.create({ data: { email: 'new.user@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      await service.ensureProfile(user(), 'host');

      expect(await service.ensureProfile(user(), 'host')).toMatchObject({
        ok: true,
        created: false,
        needsRfidVerification: true,
        hostId: invite.id,
      });
    });

    it('lời mời đã được nhận thì người khác không dùng lại được', async () => {
      const { prisma, service } = setup();
      await prisma.hostInvite.create({ data: { email: 'new.user@example.com', rfidCardNumber: 'R1', assignedZone: 'Z', claimedAt: new Date() } });
      expect(await service.ensureProfile(user(), 'host')).toEqual({ ok: false, error: 'not_authorized' });
    });

    it('Host đã xác nhận RFID (có FieldHost) vào thẳng', async () => {
      const { prisma, service } = setup();
      const supa = user();
      seedProfile(prisma, { id: supa.id, email: 'new.user@example.com', roleCode: 'field_host', withFieldHost: true });
      expect(await service.ensureProfile(supa, 'host')).toMatchObject({ ok: true, needsRfidVerification: false });
    });
  });

  it('email đã thuộc Profile khác → account_conflict (không 500)', async () => {
    const { prisma, service } = setup();
    seedProfile(prisma, { email: 'new.user@example.com', roleCode: 'tenant' });
    expect(await service.ensureProfile(user(), 'tenant')).toEqual({ ok: false, error: 'account_conflict' });
  });

  it('hai lần đăng nhập đầu song song không tạo trùng và không lỗi', async () => {
    const { prisma, service } = setup();
    const supa = user();
    const [a, b] = await Promise.all([service.ensureProfile(supa, 'tenant'), service.ensureProfile(supa, 'tenant')]);
    expect(a).toMatchObject({ ok: true });
    expect(b).toMatchObject({ ok: true });
    expect(prisma.profile.rows).toHaveLength(1);
  });
});
