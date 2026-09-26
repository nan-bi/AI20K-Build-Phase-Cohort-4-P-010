import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthModule } from './auth.module';
import { GoogleStrategy } from './google/google.strategy';
import { createFakePrisma, FakePrisma, seedProfile } from './testing/fake-prisma';
import { createFakeSupabase, FakeSupabase, fakeSession, fakeSupabaseUser } from './testing/fake-supabase';

const ENV = {
  WEB_APP_URL: 'http://localhost:3000',
  API_PREFIX: 'api/v1',
  AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
  OTP_ECHO_DEV_CODE: 'true',
  OTP_RESEND_SECONDS: '0',
  JWT_SECRET: 'a-test-jwt-secret-of-at-least-32-chars',
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
};

async function createApp(prisma: FakePrisma, supabase: FakeSupabase, env: Record<string, string | undefined> = ENV): Promise<INestApplication> {
  @Global()
  @Module({
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: SupabaseService, useValue: supabase },
    ],
    exports: [PrismaService, SupabaseService],
  })
  class FakeInfraModule {}

  @Module({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), FakeInfraModule, AuthModule],
    providers: [
      { provide: APP_GUARD, useClass: SupabaseAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
      { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    ],
  })
  class TestAppModule {}

  const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] }).compile();
  const app = moduleRef.createNestApplication();
  // HttpExceptionFilter log mọi 4xx ở mức error; test cố tình tạo nhiều lỗi 4xx nên tắt log.
  app.useLogger(false);
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('Auth HTTP (Nest thật + Prisma/Supabase giả)', () => {
  let app: INestApplication;
  let prisma: FakePrisma;
  let supabase: FakeSupabase;
  const sessions = new Map<string, ReturnType<typeof fakeSupabaseUser>>();

  beforeEach(async () => {
    prisma = createFakePrisma();
    supabase = createFakeSupabase();
    sessions.clear();
    supabase.verifyJwtToken.mockImplementation(async (token: string) => sessions.get(token) ?? null);
    app = await createApp(prisma, supabase);
  });

  afterEach(() => app.close());

  /** Đặt Supabase trả phiên hợp lệ cho email này (và nhớ access token để guard xác thực được). */
  function willSignIn(email: string) {
    const user = fakeSupabaseUser({ id: `00000000-0000-4000-8000-${String(sessions.size + 1).padStart(12, '0')}`, email });
    const session = fakeSession(user);
    sessions.set(session.access_token, user);
    supabase.signInWithPassword.mockResolvedValue({ data: { session, user }, error: null });
    return { user, session };
  }

  const cookiesOf = (res: request.Response): string[] => (res.headers['set-cookie'] as unknown as string[]) ?? [];
  const login = (agent: ReturnType<typeof request.agent>, portal: string, email = 'a@example.com') =>
    agent.post('/api/v1/auth/login').send({ email, password: 'pw', portal });

  describe('POST /auth/login', () => {
    it('đặt cookie httpOnly, KHÔNG trả token trong body, bọc envelope chuẩn', async () => {
      const { session } = willSignIn('a@example.com');
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'pw', portal: 'landlord' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, data: { needsRfidVerification: false, user: { portal: 'landlord', role: 'landlord' } } });
      expect(JSON.stringify(res.body)).not.toContain(session.access_token);
      expect(JSON.stringify(res.body)).not.toContain(session.refresh_token);

      const cookies = cookiesOf(res);
      const access = cookies.find((c) => c.startsWith('vs_access='));
      const refresh = cookies.find((c) => c.startsWith('vs_refresh='));
      expect(access).toContain(`vs_access=${session.access_token}`);
      for (const c of [access, refresh]) {
        expect(c).toMatch(/HttpOnly/i);
        expect(c).toMatch(/SameSite=Lax/i);
        expect(c).toMatch(/Path=\//);
      }
      expect(access).toMatch(/Max-Age=3600/);
    });

    it('body sai → 400 với mã invalid_request', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'not-an-email', password: '', portal: 'superuser' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: 'invalid_request' });
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('sai mật khẩu → 401 invalid_credentials, không set cookie', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'wrong', portal: 'tenant' });
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, code: 'invalid_credentials' });
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('sai cổng → 403 wrong_portal và không set cookie', async () => {
      willSignIn('a@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant');
      const res = await login(request.agent(app.getHttpServer()), 'landlord');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('wrong_portal');
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('giới hạn tần suất: lần thứ 11 trong 1 phút → 429 rate_limited', async () => {
      const responses = [];
      for (let i = 0; i < 11; i++) {
        responses.push(await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'x', portal: 'tenant' }));
      }
      expect(responses.slice(0, 10).every((r) => r.status === 401)).toBe(true);
      expect(responses[10].status).toBe(429);
      expect(responses[10].body.code).toBe('rate_limited');
    });
  });

  describe('phiên (cookie)', () => {
    it('GET /auth/session: chưa đăng nhập → user null; sau đăng nhập → user', async () => {
      willSignIn('a@example.com');
      const agent = request.agent(app.getHttpServer());

      expect((await agent.get('/api/v1/auth/session')).body.data).toEqual({ user: null });
      await login(agent, 'landlord');
      const res = await agent.get('/api/v1/auth/session');
      expect(res.body.data.user).toMatchObject({ email: 'a@example.com', portal: 'landlord' });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('access token hết hạn nhưng còn refresh → tự làm mới và set cookie mới', async () => {
      const { user, session } = willSignIn('a@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'landlord');

      sessions.clear(); // access token cũ hết hạn
      const fresh = fakeSession(user, { access_token: 'fresh-access', refresh_token: 'fresh-refresh' });
      sessions.set('fresh-access', user);
      supabase.refreshSession.mockResolvedValue({ data: { session: fresh, user }, error: null });

      const res = await agent.get('/api/v1/auth/session');
      expect(res.body.data.user).toMatchObject({ portal: 'landlord' });
      expect(supabase.refreshSession).toHaveBeenCalledWith(session.refresh_token);
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toContain('vs_access=fresh-access');
    });

    it('POST /auth/logout thu hồi phiên và xoá cả hai cookie', async () => {
      const { session } = willSignIn('a@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant');

      const res = await agent.post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      expect(supabase.signOut).toHaveBeenCalledWith(session.access_token);
      const cleared = cookiesOf(res);
      expect(cleared.find((c) => c.startsWith('vs_access=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(cleared.find((c) => c.startsWith('vs_refresh=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect((await agent.get('/api/v1/auth/session')).body.data.user).toBeNull();
    });

    it('Authorization: Bearer cũng dùng được (API client / Swagger)', async () => {
      const { session } = willSignIn('a@example.com');
      await login(request.agent(app.getHttpServer()), 'tenant');

      const res = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${session.access_token}`);
      expect(res.body.data.user).toMatchObject({ portal: 'tenant' });
    });
  });

  describe('phân quyền (RolesGuard) — /admin/field-hosts', () => {
    it('chưa đăng nhập → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/field-hosts');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('unauthorized');
    });

    it('token giả → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/field-hosts').set('Cookie', 'vs_access=forged');
      expect(res.status).toBe(401);
    });

    it('header x-demo-role bị bỏ qua khi không bật chế độ demo', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/field-hosts').set('x-demo-role', 'ops_admin');
      expect(res.status).toBe(401);
    });

    it('tenant → 403', async () => {
      willSignIn('t@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant', 't@example.com');
      expect((await agent.get('/api/v1/admin/field-hosts')).status).toBe(403);
    });

    it('ops_admin mời Field Host, trùng email → 409, danh sách có `registered`', async () => {
      const { user } = willSignIn('admin@example.com');
      seedProfile(prisma, { id: user.id, email: 'admin@example.com', roleCode: 'ops_admin' });
      const agent = request.agent(app.getHttpServer());
      expect((await login(agent, 'admin', 'admin@example.com')).status).toBe(200);

      const created = await agent.post('/api/v1/admin/field-hosts').send({ email: 'Host@Example.com', rfidCardNumber: 'RFID-1' });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({ email: 'host@example.com', rfidCardNumber: 'RFID-1', assignedZone: 'The Sapphire 1' });

      const dup = await agent.post('/api/v1/admin/field-hosts').send({ email: 'host@example.com', rfidCardNumber: 'RFID-2' });
      expect(dup.status).toBe(409);
      expect(dup.body.code).toBe('email_already_registered');

      const list = await agent.get('/api/v1/admin/field-hosts');
      expect(list.body.data).toEqual([expect.objectContaining({ email: 'host@example.com', registered: false, fullName: null })]);
    });

    it('validate DTO: thiếu RFID → 400', async () => {
      const { user } = willSignIn('admin@example.com');
      seedProfile(prisma, { id: user.id, email: 'admin@example.com', roleCode: 'ops_admin' });
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'admin', 'admin@example.com');
      expect((await agent.post('/api/v1/admin/field-hosts').send({ email: 'h@example.com' })).status).toBe(400);
    });
  });

  describe('Field Host: RFID', () => {
    it('đăng nhập lần đầu → nhập RFID sai/đúng → session báo đã xác nhận', async () => {
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'RFID-S1-0001', assignedZone: 'The Sapphire 1' } });
      willSignIn('h@example.com');
      const agent = request.agent(app.getHttpServer());

      const loginRes = await login(agent, 'host', 'h@example.com');
      expect(loginRes.body.data).toMatchObject({ needsRfidVerification: true, hostId: invite.id, user: { isHostVerified: false } });

      const wrong = await agent.post('/api/v1/auth/verify-rfid').send({ hostId: invite.id, rfid: 'nope' });
      expect(wrong.status).toBe(403);
      expect(wrong.body.code).toBe('rfid_mismatch');

      const ok = await agent.post('/api/v1/auth/verify-rfid').send({ hostId: invite.id, rfid: 'rfid-s1-0001' });
      expect(ok.status).toBe(200);
      expect((await agent.get('/api/v1/auth/session')).body.data.user).toMatchObject({ portal: 'host', isHostVerified: true });
    });

    it('verify-rfid cần đăng nhập', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/verify-rfid').send({ hostId: '11111111-1111-4111-8111-111111111111', rfid: 'x' });
      expect(res.status).toBe(401);
    });
  });

  describe('Google OAuth (Passport)', () => {
    /** Thay hai lời gọi mạng của Passport (đổi code, lấy hồ sơ) bằng dữ liệu giả; trả về spy đổi code. */
    function fakeGoogle(profile: Record<string, unknown> | null) {
      const strategy = app.get(GoogleStrategy) as any;
      const exchange = jest.fn((_code: string, _params: unknown, cb: (...args: unknown[]) => void) => cb(null, 'g-access', 'g-refresh', {}));
      strategy._oauth2.getOAuthAccessToken = exchange;
      strategy.userProfile = (_token: string, done: (...args: unknown[]) => void) => done(null, profile);
      return exchange;
    }
    const googleProfile = (overrides: Record<string, unknown> = {}) => ({
      id: 'google-sub-1',
      displayName: 'Nguyễn Văn An',
      emails: [{ value: 'g@example.com', verified: true }],
      _json: {},
      ...overrides,
    });
    const startFlow = async (portal: string) => {
      const res = await request(app.getHttpServer()).get(`/api/v1/auth/google?portal=${portal}`).redirects(0);
      const location = new URL(res.headers.location);
      const cookie = cookiesOf(res).find((c) => c.startsWith('vs_oauth='))!.split(';')[0];
      return { res, location, state: location.searchParams.get('state')!, cookie };
    };
    const callback = (query: string, cookie?: string) => {
      const req = request(app.getHttpServer()).get(`/api/v1/auth/google/callback?${query}`);
      return (cookie ? req.set('Cookie', cookie) : req).redirects(0);
    };

    it('GET /auth/google → 302 sang Google, luôn chọn tài khoản, state khớp cookie vs_oauth httpOnly', async () => {
      const { res, location, state } = await startFlow('tenant');

      expect(res.status).toBe(302);
      expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(location.searchParams.get('client_id')).toBe(ENV.GOOGLE_CLIENT_ID);
      expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/v1/auth/google/callback');
      expect(location.searchParams.get('prompt')).toBe('select_account');
      expect(location.searchParams.get('scope')).toBe('email profile');
      expect(state).toMatch(/^tenant\./);

      const oauth = cookiesOf(res).find((c) => c.startsWith('vs_oauth='))!;
      expect(oauth).toMatch(/HttpOnly/i);
      expect(oauth.split(';')[0]).toBe(`vs_oauth=${state.slice('tenant.'.length)}`);
    });

    it.each([
      ['root', 400, 'invalid_request'],
      ['', 400, 'invalid_request'],
      ['admin', 403, 'signup_not_allowed'],
    ])('portal "%s" → %i %s, không redirect, không set cookie', async (portal, status, code) => {
      const res = await request(app.getHttpServer()).get(`/api/v1/auth/google?portal=${portal}`).redirects(0);
      expect(res.status).toBe(status);
      expect(res.body).toMatchObject({ success: false, code });
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('chưa cấu hình GOOGLE_CLIENT_ID/SECRET → 503 auth_not_configured (backend vẫn khởi động)', async () => {
      const bare = await createApp(prisma, supabase, { ...ENV, GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined });
      try {
        for (const path of ['/api/v1/auth/google?portal=tenant', '/api/v1/auth/google/callback?code=x&state=y']) {
          const res = await request(bare.getHttpServer()).get(path).redirects(0);
          expect(res.status).toBe(503);
          expect(res.body).toMatchObject({ success: false, code: 'auth_not_configured' });
        }
      } finally {
        await bare.close();
      }
    });

    it('callback: tạo Profile, cookie phiên httpOnly (JWT backend, không refresh), xoá vs_oauth, redirect về FE', async () => {
      const exchange = fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('landlord');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('http://localhost:3000/landlord/dashboard');
      expect(exchange).toHaveBeenCalledWith('abc', expect.anything(), expect.any(Function));
      const cookies = cookiesOf(res);
      const access = cookies.find((c) => c.startsWith('vs_access='))!;
      expect(access).toMatch(/HttpOnly/i);
      expect(access).toMatch(/SameSite=Lax/i);
      expect(access).toMatch(/Max-Age=86400/);
      expect(cookies.find((c) => c.startsWith('vs_refresh=;'))).toBeDefined(); // xoá refresh cũ, không đặt mới
      expect(cookies.find((c) => c.startsWith('vs_oauth=;'))).toBeDefined();
      expect(res.text).not.toContain(access.split(';')[0].slice('vs_access='.length));
      expect(prisma.profile.rows).toHaveLength(1);
      expect(supabase.verifyJwtToken).not.toHaveBeenCalled();
    });

    it('sau callback: /auth/session nhận ra người dùng, guard nhận Bearer, logout xoá phiên — không hỏi Supabase', async () => {
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('tenant');
      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      const access = cookiesOf(res).find((c) => c.startsWith('vs_access='))!.split(';')[0];
      const token = access.slice('vs_access='.length);

      const session = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Cookie', access);
      expect(session.body.data.user).toMatchObject({ email: 'g@example.com', portal: 'tenant', role: 'tenant', fullName: 'Nguyễn Văn An' });
      expect(JSON.stringify(session.body)).not.toContain(token);

      // Route cần đăng nhập (guard toàn cục) chấp nhận token backend qua Bearer.
      const guarded = await request(app.getHttpServer()).post('/api/v1/auth/verify-rfid').set('Authorization', `Bearer ${token}`).send({ hostId: '11111111-1111-4111-8111-111111111111', rfid: 'x' });
      expect(guarded.status).toBe(400); // qua guard, bị nghiệp vụ từ chối vì không phải Field Host
      expect(guarded.body.code).toBe('invalid_host');

      const out = await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', access);
      expect(out.status).toBe(200);
      expect(cookiesOf(out).find((c) => c.startsWith('vs_access=;'))).toBeDefined();
      expect(supabase.verifyJwtToken).not.toHaveBeenCalled();
      expect(supabase.signOut).not.toHaveBeenCalled();
    });

    it('callback thiếu cookie vs_oauth (CSRF / mở link ở trình duyệt khác) → về màn đăng nhập, không gọi Google', async () => {
      const exchange = fakeGoogle(googleProfile());
      const { state } = await startFlow('tenant');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('http://localhost:3000/login?error=oauth_failed&tab=tenant');
      expect(exchange).not.toHaveBeenCalled();
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toBeUndefined();
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('state giả (nonce không khớp cookie) → oauth_failed, không tạo Profile', async () => {
      const exchange = fakeGoogle(googleProfile());
      const { cookie } = await startFlow('tenant');

      const res = await callback('code=abc&state=tenant.nonce-cua-ke-tan-cong', cookie);
      expect(res.headers.location).toBe('http://localhost:3000/login?error=oauth_failed&tab=tenant');
      expect(exchange).not.toHaveBeenCalled();
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('người dùng từ chối ở màn Google (error=access_denied) → về màn đăng nhập của cổng, không phải JSON 401', async () => {
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('host');

      const res = await callback(`error=access_denied&state=${encodeURIComponent(state)}`, cookie);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('http://localhost:3000/admin/login?error=oauth_failed&tab=host');
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toBeUndefined();
    });

    it('email Google chưa xác minh → email_not_verified, không cấp phiên', async () => {
      fakeGoogle(googleProfile({ emails: [{ value: 'g@example.com', verified: false }] }));
      const { state, cookie } = await startFlow('tenant');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      expect(res.headers.location).toBe('http://localhost:3000/login?error=email_not_verified&tab=tenant');
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toBeUndefined();
    });

    it('sai cổng (email đã là Chủ nhà) → wrong_portal, không cấp phiên', async () => {
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'landlord' });
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('tenant');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      expect(res.headers.location).toBe('http://localhost:3000/login?error=wrong_portal&tab=tenant');
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toBeUndefined();
    });

    it('Field Host được mời nhưng chưa nhập RFID → có phiên, redirect kèm rfidPending; session báo pendingHostId', async () => {
      const invite = await prisma.hostInvite.create({ data: { email: 'g@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('host');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      expect(res.headers.location).toBe(`http://localhost:3000/admin/login?tab=host&rfidPending=${invite.id}`);
      const access = cookiesOf(res).find((c) => c.startsWith('vs_access='))!.split(';')[0];
      const session = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Cookie', access);
      expect(session.body.data.user).toMatchObject({ portal: 'host', isHostVerified: false, pendingHostId: invite.id });
    });
  });

  describe('OTP', () => {
    it('send → verify (Khách thuê) trả action token; sai mã báo số lần còn lại', async () => {
      const send = await request(app.getHttpServer()).post('/api/v1/auth/otp/send').send({ phone: '0912345678', purpose: 'TENANT_VIEWING' });
      expect(send.status).toBe(200);
      const code: string = send.body.data.devCode;
      expect(code).toMatch(/^\d{4}$/);

      const wrongCode = code === '0000' ? '1111' : '0000';
      const wrong = await request(app.getHttpServer()).post('/api/v1/auth/otp/verify').send({ phone: '0912345678', purpose: 'TENANT_VIEWING', code: wrongCode });
      expect(wrong.status).toBe(400);
      expect(wrong.body).toMatchObject({ code: 'otp_invalid', errors: { attemptsRemaining: 2 } });

      const ok = await request(app.getHttpServer()).post('/api/v1/auth/otp/verify').send({ phone: '0912345678', purpose: 'TENANT_VIEWING', code });
      expect(ok.status).toBe(200);
      expect(ok.body.data).toMatchObject({ expiresInSeconds: 900 });
      expect(ok.body.data.actionToken).toEqual(expect.stringContaining('.'));
    });

    it('SĐT sai định dạng → 400 invalid_phone; PHONE_VERIFY không verify được ở endpoint tenant', async () => {
      const bad = await request(app.getHttpServer()).post('/api/v1/auth/otp/send').send({ phone: '12345678901', purpose: 'TENANT_VIEWING' });
      expect(bad.body.code).toBe('invalid_phone');

      const wrongPurpose = await request(app.getHttpServer()).post('/api/v1/auth/otp/verify').send({ phone: '0912345678', purpose: 'PHONE_VERIFY', code: '1234' });
      expect(wrongPurpose.status).toBe(400);
    });

    it('phone/verify: Chủ nhà gắn SĐT vào hồ sơ (mã hóa, chỉ lưu blind index)', async () => {
      willSignIn('l@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'landlord', 'l@example.com');

      const send = await agent.post('/api/v1/auth/otp/send').send({ phone: '0912345678', purpose: 'PHONE_VERIFY' });
      const res = await agent.post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: send.body.data.devCode });
      expect({ status: res.status, body: res.body }).toMatchObject({ status: 200, body: { success: true } });

      const profile = prisma.profile.rows[0];
      expect(profile.isPhoneVerified).toBe(true);
      expect(profile.phoneHash).toMatch(/^[0-9a-f]{64}$/);
      expect(profile.phoneEnc).not.toContain('84912345678');
    });

    it('phone/verify: Khách thuê không có quyền (403), chưa đăng nhập (401)', async () => {
      expect((await request(app.getHttpServer()).post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: '1234' })).status).toBe(401);

      willSignIn('t@example.com');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant', 't@example.com');
      expect((await agent.post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: '1234' })).status).toBe(403);
    });
  });

  it('demo-login bị tắt mặc định → 404 demo_disabled', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/demo-login').send({ portal: 'tenant' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('demo_disabled');
  });
});
