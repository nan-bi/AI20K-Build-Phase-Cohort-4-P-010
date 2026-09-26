import { JwtService } from '@nestjs/jwt';
import { AuthAuditService } from './auth-audit.service';
import { AuthException } from './auth.errors';
import { AuthService } from './auth.service';
import { AuthSessionService } from './session/auth-session.service';
import { ProfileProvisioningService } from './session/profile-provisioning.service';
import { GoogleIdentity } from './google/google.strategy';
import { fakeConfig } from './testing/fake-config';
import { createSessionTokens } from './testing/fake-session-token';
import { createFakePrisma, seedProfile } from './testing/fake-prisma';
import { createFakeSupabase, fakeSession, fakeSupabaseUser } from './testing/fake-supabase';

const CTX = { ipAddress: '203.0.113.7', userAgent: 'jest' };
const supabaseError = (status: number, code?: string, name = 'AuthApiError') => ({ name, status, code, message: code ?? name });

function setup(env: Record<string, string> = {}) {
  const prisma = createFakePrisma();
  const supabase = createFakeSupabase();
  const sessionTokens = createSessionTokens();
  const sessions = new AuthSessionService(prisma as any, supabase as any, sessionTokens);
  const service = new AuthService(
    prisma as any,
    supabase as any,
    sessions,
    new ProfileProvisioningService(prisma as any),
    new AuthAuditService(prisma as any),
    sessionTokens,
    fakeConfig({ WEB_APP_URL: 'http://localhost:3000/', API_PREFIX: 'api/v1', ...env }),
  );
  return { prisma, supabase, service, sessions, sessionTokens };
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

  describe('Google (Passport)', () => {
    const google = (overrides: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
      googleId: 'g-1',
      email: 'g@example.com',
      emailVerified: true,
      fullName: 'Nguyễn Văn An',
      ...overrides,
    });
    /** Mô phỏng vòng đi–về: nonce nằm trong cookie, state đi qua Google rồi quay lại query. */
    const roundTrip = (service: AuthService, portal: 'tenant' | 'landlord' | 'host' = 'tenant') => {
      const { state, nonce } = service.beginGoogle(portal);
      return { state, nonce };
    };

    it('state = <portal>.<nonce>, mỗi lần bắt đầu dùng nonce khác nhau', () => {
      const { service } = setup();
      const a = service.beginGoogle('host');
      expect(a.state).toBe(`host.${a.nonce}`);
      expect(service.beginGoogle('host').nonce).not.toBe(a.nonce);
    });

    it('portal không hợp lệ → invalid_request; admin không đăng nhập được bằng Google', () => {
      const { service } = setup();
      expect(() => service.beginGoogle('root')).toThrow(expect.objectContaining({ code: 'invalid_request' }));
      expect(() => service.beginGoogle(undefined)).toThrow(expect.objectContaining({ code: 'invalid_request' }));
      expect(() => service.beginGoogle('admin')).toThrow(expect.objectContaining({ code: 'signup_not_allowed' }));
    });

    it('thiếu/sai state hoặc nonce không khớp cookie → về màn đăng nhập tenant với oauth_failed', async () => {
      const { service } = setup();
      const { state, nonce } = roundTrip(service, 'host');
      const tenantFailure = { ok: false, redirectUrl: 'http://localhost:3000/login?error=oauth_failed&tab=tenant' };

      expect(await service.completeGoogle({ identity: google(), state: undefined, nonce }, CTX)).toEqual(tenantFailure);
      expect(await service.completeGoogle({ identity: google(), state, nonce: undefined }, CTX)).toEqual(tenantFailure);
      expect(await service.completeGoogle({ identity: google(), state: 'garbage', nonce }, CTX)).toEqual(tenantFailure);
      expect(await service.completeGoogle({ identity: google(), state, nonce: 'khac-nonce-hoan-toan' }, CTX)).toEqual(tenantFailure);
    });

    it('state mang cổng admin (dù nonce đúng) → bị từ chối, không tạo Profile', async () => {
      const { service, prisma } = setup();
      const nonce = 'nonce-hop-le-nhung-portal-admin';
      expect(await service.completeGoogle({ identity: google(), state: `admin.${nonce}`, nonce }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/admin/login?error=oauth_failed&tab=admin',
      });
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('Google không trả hồ sơ (người dùng từ chối / code sai) → oauth_failed đúng màn của cổng', async () => {
      const { service } = setup();
      const { state, nonce } = roundTrip(service, 'host');
      expect(await service.completeGoogle({ identity: null, state, nonce }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/admin/login?error=oauth_failed&tab=host',
      });
    });

    it('email Google chưa xác minh → email_not_verified, không tạo Profile', async () => {
      const { service, prisma } = setup();
      const { state, nonce } = roundTrip(service);
      expect(await service.completeGoogle({ identity: google({ emailVerified: false }), state, nonce }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/login?error=email_not_verified&tab=tenant',
      });
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('lần đầu: tạo Profile, ký JWT phiên (không có refresh token), redirect trang chủ cổng', async () => {
      const { service, prisma, supabase, sessionTokens } = setup();
      const { state, nonce } = roundTrip(service, 'landlord');

      const result = await service.completeGoogle({ identity: google(), state, nonce }, CTX);

      expect(result).toMatchObject({ ok: true, redirectUrl: 'http://localhost:3000/landlord/dashboard' });
      if (!result.ok) return;
      const profile = prisma.profile.rows[0];
      expect(profile).toMatchObject({ email: 'g@example.com', fullName: 'Nguyễn Văn An' });
      expect(result.outcome.user).toMatchObject({ id: profile.id, role: 'landlord', portal: 'landlord' });
      expect(result.outcome.tokens.refreshToken).toBeUndefined();
      expect(result.outcome.tokens.expiresIn).toBe(24 * 60 * 60);
      expect(sessionTokens.verify(result.outcome.tokens.accessToken)).toMatchObject({ sub: profile.id, email: 'g@example.com' });
      expect(supabase.signInWithPassword).not.toHaveBeenCalled();
      expect(prisma.authAuditLog.rows.find((r: any) => r.event === 'login_succeeded').metadata).toMatchObject({ method: 'google' });
    });

    it('email đã có Profile (vd. đăng ký mật khẩu trước) → dùng chung Profile, không tạo bản thứ hai', async () => {
      const { service, prisma, sessionTokens } = setup();
      const existing = seedProfile(prisma, { id: '00000000-0000-4000-8000-0000000000aa', email: 'g@example.com', roleCode: 'tenant' });
      const { state, nonce } = roundTrip(service);

      const result = await service.completeGoogle({ identity: google({ email: 'G@Example.com' }), state, nonce }, CTX);

      expect(result).toMatchObject({ ok: true, redirectUrl: 'http://localhost:3000/' });
      if (!result.ok) return;
      expect(prisma.profile.rows).toHaveLength(1);
      expect(sessionTokens.verify(result.outcome.tokens.accessToken)?.sub).toBe(existing.id);
    });

    it('Host chưa nhập RFID → redirect kèm rfidPending', async () => {
      const { service, prisma } = setup();
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      const { state, nonce } = roundTrip(service, 'host');

      const result = await service.completeGoogle({ identity: google({ email: 'h@example.com' }), state, nonce }, CTX);
      expect(result).toMatchObject({ ok: true, redirectUrl: `http://localhost:3000/admin/login?tab=host&rfidPending=${invite.id}` });
    });

    it('Host chưa được Admin mời → not_authorized, không có phiên', async () => {
      const { service, prisma } = setup();
      const { state, nonce } = roundTrip(service, 'host');
      expect(await service.completeGoogle({ identity: google(), state, nonce }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/admin/login?error=not_authorized&tab=host',
      });
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('sai cổng → redirect lỗi wrong_portal, không có phiên (và không đụng Supabase)', async () => {
      const { service, prisma, supabase } = setup();
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'landlord' });
      const { state, nonce } = roundTrip(service, 'tenant');

      expect(await service.completeGoogle({ identity: google(), state, nonce }, CTX)).toEqual({
        ok: false,
        redirectUrl: 'http://localhost:3000/login?error=wrong_portal&tab=tenant',
      });
      expect(supabase.signOut).not.toHaveBeenCalled();
      expect(prisma.authAuditLog.rows.find((r: any) => r.event === 'login_rejected').metadata).toMatchObject({ reason: 'wrong_portal' });
    });

    it('tài khoản bị khoá → account_suspended', async () => {
      const { service, prisma } = setup();
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'tenant', isActive: false });
      const { state, nonce } = roundTrip(service);
      expect(await service.completeGoogle({ identity: google(), state, nonce }, CTX)).toMatchObject({
        ok: false,
        redirectUrl: 'http://localhost:3000/login?error=account_suspended&tab=tenant',
      });
    });
  });

  describe('phiên do backend ký (Google)', () => {
    const signedInGoogleUser = async (setupResult: ReturnType<typeof setup>, roleCode = 'tenant') => {
      const profile = seedProfile(setupResult.prisma, { email: 'g@example.com', roleCode });
      return { profile, token: setupResult.sessionTokens.sign(profile.id, 'g@example.com').accessToken };
    };

    it('authenticate: token backend hợp lệ → user lấy vai trò từ DB, không hỏi Supabase', async () => {
      const ctx = setup();
      const { profile, token } = await signedInGoogleUser(ctx, 'landlord');
      expect(await ctx.sessions.authenticate(token)).toMatchObject({ id: profile.id, role: 'landlord', portal: 'landlord' });
      expect(ctx.supabase.verifyJwtToken).not.toHaveBeenCalled();
    });

    it('authenticate: Profile bị xoá hoặc khoá → phiên vô hiệu', async () => {
      const ctx = setup();
      const { profile, token } = await signedInGoogleUser(ctx);
      ctx.prisma.profile.rows.splice(0);
      expect(await ctx.sessions.authenticate(token)).toBeNull();

      const other = setup();
      const { profile: p2, token: t2 } = await signedInGoogleUser(other);
      other.prisma.profile.rows.find((r: any) => r.id === p2.id).isActive = false;
      expect(await codeOf(other.sessions.authenticate(t2))).toBe('account_suspended');
      expect(profile.id).toBeDefined();
    });

    it('authenticate: token ký bằng khóa khác / hết hạn / thiếu issuer không được chấp nhận là token backend', async () => {
      const ctx = setup();
      const profile = seedProfile(ctx.prisma, { email: 'g@example.com', roleCode: 'tenant' });
      const forged = createSessionTokens('another-secret-of-at-least-32-characters').sign(profile.id, 'g@example.com').accessToken;
      const noIssuer = new JwtService({ secret: 'a-test-jwt-secret-of-at-least-32-chars' }).sign({ sub: profile.id });
      const expired = new JwtService({ secret: 'a-test-jwt-secret-of-at-least-32-chars' }).sign(
        { sub: profile.id },
        { issuer: 'vinstay-backend', expiresIn: -10 },
      );

      for (const token of [forged, noIssuer, expired]) {
        expect(ctx.sessionTokens.verify(token)).toBeNull();
        expect(await ctx.sessions.authenticate(token)).toBeNull(); // rơi xuống Supabase, Supabase giả từ chối
      }
      expect(ctx.supabase.verifyJwtToken).toHaveBeenCalledTimes(3);
    });

    it('token Supabase (mật khẩu) vẫn hoạt động song song', async () => {
      const ctx = setup();
      const user = fakeSupabaseUser({ email: 't@example.com' });
      seedProfile(ctx.prisma, { id: user.id, email: 't@example.com', roleCode: 'tenant' });
      ctx.supabase.verifyJwtToken.mockResolvedValue(user);
      expect(await ctx.sessions.authenticate('supabase-access-token')).toMatchObject({ id: user.id, role: 'tenant' });
    });

    it('resolveSession: token backend → user, không cần refresh', async () => {
      const ctx = setup();
      const { profile, token } = await signedInGoogleUser(ctx);
      const result = await ctx.service.resolveSession(token, undefined);
      expect(result.user).toMatchObject({ id: profile.id });
      expect(result.tokens).toBeUndefined();
    });

    it('resolveSession: token backend hết hạn, không có refresh → xoá cookie', async () => {
      const ctx = setup();
      const profile = seedProfile(ctx.prisma, { email: 'g@example.com', roleCode: 'tenant' });
      const expired = new JwtService({ secret: 'a-test-jwt-secret-of-at-least-32-chars' }).sign(
        { sub: profile.id },
        { issuer: 'vinstay-backend', expiresIn: -10 },
      );
      expect(await ctx.service.resolveSession(expired, undefined)).toEqual({ user: null, clear: true });
    });

    it('logout token backend: không gọi Supabase; token Supabase vẫn bị thu hồi', async () => {
      const ctx = setup();
      const { token } = await signedInGoogleUser(ctx);
      await ctx.service.logout(token);
      expect(ctx.supabase.signOut).not.toHaveBeenCalled();

      await ctx.service.logout('supabase-access-token');
      expect(ctx.supabase.signOut).toHaveBeenCalledWith('supabase-access-token');
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
