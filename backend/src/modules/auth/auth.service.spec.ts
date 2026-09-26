import { createHash } from 'node:crypto';
import { AuthAuditService } from './auth-audit.service';
import { AuthException } from './auth.errors';
import { AuthService } from './auth.service';
import { AuthSessionService } from './session/auth-session.service';
import { ProfileProvisioningService } from './session/profile-provisioning.service';
import { fakeConfig } from './testing/fake-config';
import { createFakePrisma, seedProfile } from './testing/fake-prisma';
import { createFakeSupabase, fakeSession, fakeSupabaseUser } from './testing/fake-supabase';

const CTX = { ipAddress: '203.0.113.7', userAgent: 'jest' };
const supabaseError = (status: number, code?: string, name = 'AuthApiError') => ({ name, status, code, message: code ?? name });

function setup(env: Record<string, string> = {}) {
  const prisma = createFakePrisma();
  const supabase = createFakeSupabase();
  const service = new AuthService(
    prisma as any,
    supabase as any,
    new AuthSessionService(prisma as any, supabase as any),
    new ProfileProvisioningService(prisma as any),
    new AuthAuditService(prisma as any),
    fakeConfig({ WEB_APP_URL: 'http://localhost:3000/', API_PREFIX: 'api/v1', ...env }),
  );
  return { prisma, supabase, service };
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 'no-error';
  } catch (err) {
    return err instanceof AuthException ? err.code : `unexpected:${(err as Error).message}`;
  }
};

const signInAs = (supabase: ReturnType<typeof createFakeSupabase>, email = 'a@example.com') => {
  const user = fakeSupabaseUser({ email });
  const session = fakeSession(user);
  supabase.signInWithPassword.mockResolvedValue({ data: { session, user }, error: null });
  return { user, session };
};

describe('AuthService', () => {
  describe('login', () => {
    it('thành công: trả token cho controller đặt cookie, tạo Profile, KHÔNG có token trong user', async () => {
      const { supabase, service, prisma } = setup();
      const { session } = signInAs(supabase);

      const outcome = await service.login({ email: ' A@Example.com ', password: 'pw', portal: 'landlord' }, CTX);

      expect(supabase.signInWithPassword).toHaveBeenCalledWith('a@example.com', 'pw');
      expect(outcome.tokens).toEqual({ accessToken: session.access_token, refreshToken: session.refresh_token, expiresIn: 3600 });
      expect(outcome.user).toMatchObject({ role: 'landlord', portal: 'landlord', email: 'a@example.com' });
      expect(JSON.stringify(outcome.user)).not.toContain(session.access_token);
      expect(prisma.authAuditLog.rows.map((r: any) => r.event)).toContain('login_succeeded');
    });

    it.each([
      [supabaseError(400, 'invalid_credentials'), 'invalid_credentials'],
      [supabaseError(400, 'email_not_confirmed'), 'email_not_verified'],
      [supabaseError(429, 'over_request_rate_limit'), 'rate_limited'],
      [supabaseError(503), 'auth_provider_unavailable'],
      [supabaseError(0, undefined, 'AuthRetryableFetchError'), 'auth_provider_unavailable'],
    ])('lỗi Supabase %j → %s', async (error, expected) => {
      const { supabase, service, prisma } = setup();
      supabase.signInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error });
      expect(await codeOf(service.login({ email: 'a@example.com', password: 'x', portal: 'tenant' }, CTX))).toBe(expected);
      expect(prisma.authAuditLog.rows.map((r: any) => r.event)).toContain('login_failed');
    });

    it('chưa cấu hình Supabase → auth_not_configured (không gọi mạng)', async () => {
      const { supabase, service } = setup();
      supabase.isConfigured.mockReturnValue(false);
      expect(await codeOf(service.login({ email: 'a@example.com', password: 'x', portal: 'tenant' }, CTX))).toBe('auth_not_configured');
      expect(supabase.signInWithPassword).not.toHaveBeenCalled();
    });

    it('đăng nhập Supabase đúng nhưng sai cổng → từ chối và thu hồi phiên vừa tạo', async () => {
      const { supabase, service } = setup();
      const { session } = signInAs(supabase);
      await service.login({ email: 'a@example.com', password: 'pw', portal: 'tenant' }, CTX);

      expect(await codeOf(service.login({ email: 'a@example.com', password: 'pw', portal: 'landlord' }, CTX))).toBe('wrong_portal');
      expect(supabase.signOut).toHaveBeenCalledWith(session.access_token);
    });

    it('Host lần đầu: trả needsRfidVerification + hostId', async () => {
      const { supabase, service, prisma } = setup();
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      signInAs(supabase, 'h@example.com');

      const outcome = await service.login({ email: 'h@example.com', password: 'pw', portal: 'host' }, CTX);
      expect(outcome).toMatchObject({ needsRfidVerification: true, hostId: invite.id });
      expect(outcome.user.isHostVerified).toBe(false);
    });
  });

  describe('signup', () => {
    it('admin không có đăng ký', async () => {
      const { service, supabase } = setup();
      expect(await codeOf(service.signup({ email: 'a@example.com', password: '12345678', fullName: 'A', portal: 'admin' }, CTX))).toBe('signup_not_allowed');
      expect(supabase.signUp).not.toHaveBeenCalled();
    });

    it('host không có lời mời bị chặn trước khi Supabase gửi email', async () => {
      const { service, supabase } = setup();
      expect(await codeOf(service.signup({ email: 'x@example.com', password: '12345678', fullName: 'X', portal: 'host' }, CTX))).toBe('not_authorized');
      expect(supabase.signUp).not.toHaveBeenCalled();
    });

    it('cần xác nhận email: trả needsEmailConfirmation, link quay về màn đăng nhập đúng cổng', async () => {
      const { service, supabase } = setup();
      const outcome = await service.signup({ email: 'A@Example.com', password: '12345678', fullName: ' An ', portal: 'landlord' }, CTX);

      expect(outcome).toEqual({ needsEmailConfirmation: true });
      expect(supabase.signUp).toHaveBeenCalledWith('a@example.com', '12345678', {
        fullName: 'An',
        emailRedirectTo: 'http://localhost:3000/login?tab=landlord&confirmed=1',
      });
    });

    it('Host được mời quay về /admin/login', async () => {
      const { service, supabase, prisma } = setup();
      await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      await service.signup({ email: 'h@example.com', password: '12345678', fullName: 'H', portal: 'host' }, CTX);
      expect(supabase.signUp.mock.calls[0][2].emailRedirectTo).toBe('http://localhost:3000/admin/login?tab=host&confirmed=1');
    });

    it('project tắt Confirm email → có phiên ngay và đăng nhập luôn', async () => {
      const { service, supabase } = setup();
      const user = fakeSupabaseUser({ email: 'a@example.com' });
      supabase.signUp.mockResolvedValue({ data: { user, session: fakeSession(user) }, error: null });

      const outcome = await service.signup({ email: 'a@example.com', password: '12345678', fullName: 'A', portal: 'tenant' }, CTX);
      expect(outcome).toMatchObject({ needsEmailConfirmation: false, user: { portal: 'tenant' } });
      expect('tokens' in outcome).toBe(true);
    });

    it.each([
      [supabaseError(422, 'weak_password'), 'weak_password'],
      [supabaseError(422, 'user_already_exists'), 'email_already_registered'],
      [supabaseError(429, 'over_email_send_rate_limit'), 'rate_limited'],
      [supabaseError(400, 'email_address_invalid'), 'invalid_request'],
    ])('lỗi đăng ký %j → %s', async (error, expected) => {
      const { service, supabase } = setup();
      supabase.signUp.mockResolvedValue({ data: { user: null, session: null }, error });
      expect(await codeOf(service.signup({ email: 'a@example.com', password: '12345678', fullName: 'A', portal: 'tenant' }, CTX))).toBe(expected);
    });
  });

  describe('demoLogin', () => {
    it('tắt mặc định → demo_disabled', async () => {
      const { service } = setup();
      expect(await codeOf(service.demoLogin('tenant', CTX))).toBe('demo_disabled');
    });

    it('không bao giờ bật ở production dù có cờ', async () => {
      const { service } = setup({ AUTH_DEMO_MODE: 'true', NODE_ENV: 'production' });
      expect(await codeOf(service.demoLogin('tenant', CTX))).toBe('demo_disabled');
    });

    it('bật → đăng nhập thật bằng tài khoản demo', async () => {
      const { service, supabase } = setup({ AUTH_DEMO_MODE: 'true', DEMO_PASSWORD: 'demo-pw' });
      signInAs(supabase, 'khachthue.demo@vinstay.vn');
      const outcome = await service.demoLogin('tenant', CTX);
      expect(supabase.signInWithPassword).toHaveBeenCalledWith('khachthue.demo@vinstay.vn', 'demo-pw');
      expect(outcome.user.portal).toBe('tenant');
    });
  });

  describe('Google (PKCE)', () => {
    it('code_challenge trong URL là SHA-256 của verifier nằm trong state cookie', () => {
      const { service, supabase } = setup();
      const { url, state } = service.beginGoogle('host');

      const { v, p } = JSON.parse(Buffer.from(state, 'base64url').toString());
      expect(p).toBe('host');
      const challenge = createHash('sha256').update(v).digest('base64url');
      expect(new URL(url).searchParams.get('code_challenge')).toBe(challenge);
      expect(supabase.buildOAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google', redirectTo: 'http://localhost:3000/api/v1/auth/callback' }),
      );
    });

    it('admin không đăng nhập được bằng Google', async () => {
      const { service } = setup();
      expect(() => service.beginGoogle('admin')).toThrow();
      const state = Buffer.from(JSON.stringify({ v: 'x', p: 'admin' })).toString('base64url');
      expect(await service.completeGoogle({ code: 'c', state }, CTX)).toMatchObject({ ok: false });
    });

    it('mỗi lần bắt đầu dùng verifier khác nhau', () => {
      const { service } = setup();
      expect(service.beginGoogle('tenant').state).not.toBe(service.beginGoogle('tenant').state);
    });

    const start = (service: AuthService, portal: 'tenant' | 'host' = 'tenant') => service.beginGoogle(portal).state;

    it('thiếu/hỏng state hoặc thiếu code → về màn đăng nhập với oauth_failed', async () => {
      const { service } = setup();
      expect(await service.completeGoogle({ code: 'c', state: undefined }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/login?error=oauth_failed&tab=tenant',
      });
      expect(await service.completeGoogle({ code: 'c', state: 'garbage' }, CTX)).toMatchObject({ ok: false });
      expect(await service.completeGoogle({ code: undefined, state: start(service, 'host') }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/admin/login?error=oauth_failed&tab=host',
      });
    });

    it('đổi code thất bại → oauth_failed', async () => {
      const { service, supabase } = setup();
      supabase.exchangePkceCode.mockResolvedValue(null);
      expect(await service.completeGoogle({ code: 'c', state: start(service) }, CTX)).toMatchObject({ ok: false });
    });

    it('thành công → redirect trang chủ cổng; verifier từ state được dùng để đổi code', async () => {
      const { service, supabase } = setup();
      const state = start(service, 'tenant');
      const verifier = JSON.parse(Buffer.from(state, 'base64url').toString()).v;
      supabase.exchangePkceCode.mockResolvedValue(fakeSession(fakeSupabaseUser({ email: 'g@example.com' })));

      const result = await service.completeGoogle({ code: 'auth-code', state }, CTX);
      expect(supabase.exchangePkceCode).toHaveBeenCalledWith('auth-code', verifier);
      expect(result).toMatchObject({ ok: true, redirectUrl: 'http://localhost:3000/' });
    });

    it('Host chưa nhập RFID → redirect kèm rfidPending', async () => {
      const { service, supabase, prisma } = setup();
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      supabase.exchangePkceCode.mockResolvedValue(fakeSession(fakeSupabaseUser({ email: 'h@example.com' })));

      const result = await service.completeGoogle({ code: 'c', state: start(service, 'host') }, CTX);
      expect(result).toMatchObject({ ok: true, redirectUrl: `http://localhost:3000/admin/login?tab=host&rfidPending=${invite.id}` });
    });

    it('bị từ chối (sai cổng) → redirect lỗi có mã cụ thể, không có phiên', async () => {
      const { service, supabase, prisma } = setup();
      const user = fakeSupabaseUser({ email: 'g@example.com' });
      seedProfile(prisma, { id: user.id, email: 'g@example.com', roleCode: 'landlord' });
      supabase.exchangePkceCode.mockResolvedValue(fakeSession(user));

      expect(await service.completeGoogle({ code: 'c', state: start(service, 'tenant') }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/login?error=wrong_portal&tab=tenant',
      });
      expect(supabase.signOut).toHaveBeenCalled();
    });
  });

  describe('resolveSession', () => {
    it('access token hợp lệ → user, không refresh', async () => {
      const { service, supabase, prisma } = setup();
      const user = fakeSupabaseUser({ email: 't@example.com' });
      seedProfile(prisma, { id: user.id, email: 't@example.com', roleCode: 'tenant' });
      supabase.verifyJwtToken.mockResolvedValue(user);

      const result = await service.resolveSession('access', 'refresh');
      expect(result.user).toMatchObject({ portal: 'tenant' });
      expect(result.tokens).toBeUndefined();
      expect(supabase.refreshSession).not.toHaveBeenCalled();
    });

    it('access token hết hạn + refresh token → làm mới và trả token mới', async () => {
      const { service, supabase, prisma } = setup();
      const user = fakeSupabaseUser({ email: 't@example.com' });
      seedProfile(prisma, { id: user.id, email: 't@example.com', roleCode: 'tenant' });
      const fresh = fakeSession(user, { access_token: 'fresh-access', refresh_token: 'fresh-refresh' });
      supabase.verifyJwtToken.mockImplementation(async (token: string) => (token === 'fresh-access' ? user : null));
      supabase.refreshSession.mockResolvedValue({ data: { session: fresh, user }, error: null });

      const result = await service.resolveSession('expired', 'refresh');
      expect(result.user).toMatchObject({ portal: 'tenant' });
      expect(result.tokens).toEqual({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh', expiresIn: 3600 });
    });

    it('cả hai đều vô dụng → user null và báo xoá cookie', async () => {
      const { service } = setup();
      expect(await service.resolveSession('bad', 'bad')).toEqual({ user: null, clear: true });
    });

    it('không có cookie nào → user null, không cần xoá', async () => {
      const { service } = setup();
      expect(await service.resolveSession(undefined, undefined)).toEqual({ user: null, clear: false });
    });

    it('Supabase sập tạm thời: không xoá cookie của người dùng', async () => {
      const { service, supabase } = setup();
      supabase.refreshSession.mockResolvedValue({ data: { session: null }, error: supabaseError(503) });
      expect(await service.resolveSession('expired', 'refresh')).toEqual({ user: null });
    });

    it('tài khoản bị khoá → coi như không có phiên', async () => {
      const { service, supabase, prisma } = setup();
      const user = fakeSupabaseUser({ email: 't@example.com' });
      seedProfile(prisma, { id: user.id, email: 't@example.com', roleCode: 'tenant', isActive: false });
      supabase.verifyJwtToken.mockResolvedValue(user);
      expect((await service.resolveSession('access', undefined)).user).toBeNull();
    });

    it('Host chờ RFID: view có pendingHostId để FE dựng lại bước RFID', async () => {
      const { service, supabase, prisma } = setup();
      const user = fakeSupabaseUser({ email: 'h@example.com' });
      seedProfile(prisma, { id: user.id, email: 'h@example.com', roleCode: 'field_host' });
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      supabase.verifyJwtToken.mockResolvedValue(user);

      expect((await service.resolveSession('access', undefined)).user).toMatchObject({ isHostVerified: false, pendingHostId: invite.id });
    });
  });

  describe('refresh / logout', () => {
    it('refresh thất bại → unauthorized', async () => {
      const { service } = setup();
      expect(await codeOf(service.refresh('bad'))).toBe('unauthorized');
    });

    it('logout thu hồi phiên; không có token thì bỏ qua', async () => {
      const { service, supabase } = setup();
      await service.logout('access');
      await service.logout(undefined);
      expect(supabase.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyRfid', () => {
    async function pendingHost() {
      const ctx = setup();
      const user = fakeSupabaseUser({ email: 'h@example.com' });
      const profile = seedProfile(ctx.prisma, { id: user.id, email: 'h@example.com', roleCode: 'field_host' });
      const invite = await ctx.prisma.hostInvite.create({
        data: { email: 'h@example.com', rfidCardNumber: 'RFID-S1-0001', assignedZone: 'The Sapphire 1' },
      });
      const authUser = { id: profile.id, email: 'h@example.com', fullName: null, role: 'field_host', portal: 'host' as const, isPhoneVerified: false, isHostVerified: false };
      return { ...ctx, invite, authUser };
    }

    it('RFID đúng (không phân biệt hoa/thường) → tạo FieldHost và nhận lời mời', async () => {
      const { service, prisma, invite, authUser } = await pendingHost();
      await service.verifyRfid(authUser, { hostId: invite.id, rfid: ' rfid-s1-0001 ' }, CTX);

      expect(prisma.fieldHost.rows).toHaveLength(1);
      expect(prisma.fieldHost.rows[0]).toMatchObject({ profileId: authUser.id, assignedZone: 'The Sapphire 1', rfidCardNumber: 'RFID-S1-0001' });
      expect(prisma.hostInvite.rows[0]).toMatchObject({ claimedById: authUser.id });
      expect(prisma.hostInvite.rows[0].claimedAt).toBeInstanceOf(Date);
    });

    it('RFID sai → rfid_mismatch, không tạo FieldHost', async () => {
      const { service, prisma, invite, authUser } = await pendingHost();
      expect(await codeOf(service.verifyRfid(authUser, { hostId: invite.id, rfid: 'wrong' }, CTX))).toBe('rfid_mismatch');
      expect(prisma.fieldHost.rows).toHaveLength(0);
      expect(prisma.authAuditLog.rows.map((r: any) => r.event)).toContain('rfid_failed');
    });

    it('lời mời của email khác → invalid_host', async () => {
      const { service, prisma, authUser } = await pendingHost();
      const other = await prisma.hostInvite.create({ data: { email: 'other@example.com', rfidCardNumber: 'RFID-S1-0001', assignedZone: 'Z' } });
      expect(await codeOf(service.verifyRfid(authUser, { hostId: other.id, rfid: 'RFID-S1-0001' }, CTX))).toBe('invalid_host');
    });

    it('không phải Field Host hoặc đã xác nhận rồi → invalid_host', async () => {
      const { service, invite, authUser } = await pendingHost();
      expect(await codeOf(service.verifyRfid({ ...authUser, role: 'tenant' }, { hostId: invite.id, rfid: 'RFID-S1-0001' }, CTX))).toBe('invalid_host');
      expect(await codeOf(service.verifyRfid({ ...authUser, isHostVerified: true }, { hostId: invite.id, rfid: 'RFID-S1-0001' }, CTX))).toBe('invalid_host');
    });

    it('dùng lại lời mời đã nhận → invalid_host', async () => {
      const { service, invite, authUser } = await pendingHost();
      await service.verifyRfid(authUser, { hostId: invite.id, rfid: 'RFID-S1-0001' }, CTX);
      expect(await codeOf(service.verifyRfid(authUser, { hostId: invite.id, rfid: 'RFID-S1-0001' }, CTX))).toBe('invalid_host');
    });
  });
});
