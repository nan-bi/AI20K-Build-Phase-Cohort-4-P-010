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
import { AuthModule } from './auth.module';
import { SESSION_TTL_SECONDS } from './auth.constants';
import { GoogleStrategy } from './google/google.strategy';
import { hashPassword } from './password-hasher';
import { createFakePrisma, FakePrisma, seedProfile } from './testing/fake-prisma';
import { createSessionTokens } from './testing/fake-session-token';

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

const PASSWORD = 'Matkhau-123';

/**
 * ConfigService thật ưu tiên `process.env` (kể cả biến nạp từ backend/.env của máy dev) nên `load` không đủ để cô lập
 * test. Ghi đè `process.env` theo `env` cho tới khi gọi hàm khôi phục: test không phụ thuộc .env thật, CI và máy dev như nhau.
 */
function applyEnv(env: Record<string, string | undefined>): () => void {
  const keys = new Set([...Object.keys(ENV), ...Object.keys(env), 'AUTH_DEMO_MODE', 'GOOGLE_CALLBACK_URL', 'COOKIE_DOMAIN', 'COOKIE_SECURE']);
  const previous = new Map([...keys].map((k) => [k, process.env[k]]));
  for (const key of keys) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

async function createApp(prisma: FakePrisma, env: Record<string, string | undefined> = ENV): Promise<INestApplication> {
  @Global()
  @Module({
    providers: [{ provide: PrismaService, useValue: prisma }],
    exports: [PrismaService],
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

describe('Auth HTTP (Nest thật + Prisma giả)', () => {
  let app: INestApplication;
  let prisma: FakePrisma;
  let restoreEnv: () => void;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    prisma = createFakePrisma();
    restoreEnv = applyEnv(ENV);
    app = await createApp(prisma);
  });

  afterEach(async () => {
    await app.close();
    restoreEnv();
  });

  /** Seed tài khoản đã có mật khẩu `PASSWORD` (như sau khi đăng ký). */
  const seedUser = (email: string, roleCode: string, extra: { id?: string; withFieldHost?: boolean; isActive?: boolean } = {}) =>
    seedProfile(prisma, { email, roleCode, passwordHash, ...extra });

  const cookiesOf = (res: request.Response): string[] => (res.headers['set-cookie'] as unknown as string[]) ?? [];
  const cookieValue = (res: request.Response, name: string) => cookiesOf(res).find((c) => c.startsWith(`${name}=`) && !c.startsWith(`${name}=;`));
  const login = (agent: ReturnType<typeof request.agent>, portal: string, email = 'a@example.com', password = PASSWORD) =>
    agent.post('/api/v1/auth/login').send({ email, password, portal });

  describe('POST /auth/login', () => {
    it('đặt cookie JWT backend httpOnly, KHÔNG trả token trong body, bọc envelope chuẩn', async () => {
      seedUser('a@example.com', 'landlord');
      const res = await login(request(app.getHttpServer()) as any, 'landlord');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, data: { needsRfidVerification: false, user: { portal: 'landlord', role: 'landlord' } } });

      const access = cookieValue(res, 'vs_access')!;
      const token = access.split(';')[0].slice('vs_access='.length);
      expect(createSessionTokens().verify(token)).toMatchObject({ email: 'a@example.com' });
      expect(JSON.stringify(res.body)).not.toContain(token);
      expect(JSON.stringify(res.body)).not.toContain('scrypt$');
      expect(JSON.stringify(res.body)).not.toContain('refresh');
      expect(access).toMatch(/HttpOnly/i);
      expect(access).toMatch(/SameSite=Lax/i);
      expect(access).toMatch(/Path=\//);
      expect(access).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    });

    it('xoá cookie vs_refresh cũ (phiên Supabase trước đây), không đặt refresh mới', async () => {
      seedUser('a@example.com', 'tenant');
      const res = await login(request(app.getHttpServer()) as any, 'tenant');
      expect(cookieValue(res, 'vs_refresh')).toBeUndefined();
      expect(cookiesOf(res).find((c) => c.startsWith('vs_refresh=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('body sai → 400 với mã invalid_request', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'not-an-email', password: '', portal: 'superuser' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: 'invalid_request' });
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('sai mật khẩu → 401 invalid_credentials, không set cookie', async () => {
      seedUser('a@example.com', 'tenant');
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'wrong', portal: 'tenant' });
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, code: 'invalid_credentials' });
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('email không tồn tại → 401 invalid_credentials (cùng mã với sai mật khẩu)', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'khong-co@example.com', password: PASSWORD, portal: 'tenant' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('invalid_credentials');
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('tài khoản Google chưa có mật khẩu → 401 password_not_set', async () => {
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'tenant' });
      const res = await login(request(app.getHttpServer()) as any, 'tenant', 'g@example.com');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('password_not_set');
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('sai cổng → 403 wrong_portal và không set cookie', async () => {
      seedUser('a@example.com', 'tenant');
      const res = await login(request.agent(app.getHttpServer()), 'landlord');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('wrong_portal');
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('tài khoản bị khoá → 403 account_suspended', async () => {
      seedUser('a@example.com', 'tenant', { isActive: false });
      const res = await login(request.agent(app.getHttpServer()), 'tenant');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('account_suspended');
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

  describe('POST /auth/signup', () => {
    const signup = (agent: ReturnType<typeof request.agent> | request.SuperTest<request.Test>, body: Record<string, unknown>) =>
      agent.post('/api/v1/auth/signup').send({ email: 'n@example.com', password: PASSWORD, fullName: ' Nguyễn An ', portal: 'tenant', ...body });

    it('thành công: đăng nhập luôn (cookie phiên, không needsEmailConfirmation), Profile có passwordHash scrypt', async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await signup(agent, {});

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ needsRfidVerification: false, user: { email: 'n@example.com', fullName: 'Nguyễn An', portal: 'tenant' } });
      expect('needsEmailConfirmation' in res.body.data).toBe(false);
      expect(cookieValue(res, 'vs_access')).toMatch(/HttpOnly/i);
      expect(prisma.profile.rows[0].passwordHash).toMatch(/^scrypt\$/);
      expect(JSON.stringify(res.body)).not.toContain('scrypt$');

      expect((await agent.get('/api/v1/auth/session')).body.data.user).toMatchObject({ email: 'n@example.com', portal: 'tenant' });
    });

    it('đăng nhập lại bằng mật khẩu vừa đăng ký → 200; sai mật khẩu → 401', async () => {
      await signup(request(app.getHttpServer()), {});
      expect((await login(request.agent(app.getHttpServer()), 'tenant', 'n@example.com')).status).toBe(200);
      expect((await login(request.agent(app.getHttpServer()), 'tenant', 'n@example.com', 'sai-mat-khau')).status).toBe(401);
    });

    it('email đã đăng ký → 409 email_already_registered, không đổi mật khẩu cũ', async () => {
      seedUser('n@example.com', 'tenant');
      const res = await signup(request(app.getHttpServer()), { password: 'Mat-khau-ke-lạ-9' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('email_already_registered');
      expect(cookiesOf(res)).toHaveLength(0);
      expect(prisma.profile.rows[0].passwordHash).toBe(passwordHash);
    });

    it('admin → 400 (DTO không cho cổng admin; service còn chặn thêm signup_not_allowed); Host chưa được mời → 403 not_authorized', async () => {
      const admin = await signup(request(app.getHttpServer()), { portal: 'admin' });
      expect(admin.status).toBe(400);
      expect(admin.body.code).toBe('invalid_request');

      const host = await signup(request(app.getHttpServer()), { portal: 'host' });
      expect(host.status).toBe(403);
      expect(host.body.code).toBe('not_authorized');
      expect(prisma.profile.rows).toHaveLength(0);
    });

    it('Host được mời → có phiên, needsRfidVerification + hostId', async () => {
      const invite = await prisma.hostInvite.create({ data: { email: 'n@example.com', rfidCardNumber: 'R1', assignedZone: 'Z' } });
      const res = await signup(request(app.getHttpServer()), { portal: 'host' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ needsRfidVerification: true, hostId: invite.id, user: { isHostVerified: false } });
    });

    it('body sai (mật khẩu quá ngắn / thiếu tên) → 400 invalid_request, không tạo Profile', async () => {
      const res = await signup(request(app.getHttpServer()), { password: '123', fullName: '' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
      expect(prisma.profile.rows).toHaveLength(0);
    });
  });

  describe('phiên (cookie)', () => {
    it('GET /auth/session: chưa đăng nhập → user null; sau đăng nhập → user', async () => {
      seedUser('a@example.com', 'landlord');
      const agent = request.agent(app.getHttpServer());

      expect((await agent.get('/api/v1/auth/session')).body.data).toEqual({ user: null });
      await login(agent, 'landlord');
      const res = await agent.get('/api/v1/auth/session');
      expect(res.body.data.user).toMatchObject({ email: 'a@example.com', portal: 'landlord' });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('không còn POST /auth/refresh', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', 'vs_refresh=abc');
      expect(res.status).toBe(404);
    });

    it('cookie phiên hỏng / token Supabase cũ → user null và xoá cookie', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Cookie', 'vs_access=eyJhbGciOiJIUzI1NiJ9.e30.sai-chu-ky');
      expect(res.body.data).toEqual({ user: null });
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('Profile bị khoá sau khi đăng nhập → phiên vô hiệu', async () => {
      const profile = seedUser('a@example.com', 'tenant');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant');
      profile.isActive = false;
      // Cache phiên 30s (AuthSessionService) có thể còn giữ user cũ; dùng token khác để không dính cache.
      const fresh = request.agent(app.getHttpServer());
      const token = createSessionTokens().sign(profile.id, 'a@example.com').accessToken;
      const res = await fresh.get('/api/v1/auth/session').set('Cookie', `vs_access=${token}`);
      expect(res.body.data.user).toBeNull();
    });

    it('POST /auth/logout xoá cả hai cookie, phiên sau đó là null', async () => {
      seedUser('a@example.com', 'tenant');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant');

      const res = await agent.post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      const cleared = cookiesOf(res);
      expect(cleared.find((c) => c.startsWith('vs_access=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(cleared.find((c) => c.startsWith('vs_refresh=;'))).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect((await agent.get('/api/v1/auth/session')).body.data.user).toBeNull();
    });

    it('Authorization: Bearer cũng dùng được (API client / Swagger)', async () => {
      seedUser('a@example.com', 'tenant');
      const res0 = await login(request.agent(app.getHttpServer()), 'tenant');
      const token = cookieValue(res0, 'vs_access')!.split(';')[0].slice('vs_access='.length);

      const res = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token}`);
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
      seedUser('t@example.com', 'tenant');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant', 't@example.com');
      expect((await agent.get('/api/v1/admin/field-hosts')).status).toBe(403);
    });

    it('ops_admin mời Field Host, trùng email → 409, danh sách có `registered`', async () => {
      seedUser('admin@example.com', 'ops_admin');
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
      seedUser('admin@example.com', 'ops_admin');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'admin', 'admin@example.com');
      expect((await agent.post('/api/v1/admin/field-hosts').send({ email: 'h@example.com' })).status).toBe(400);
    });
  });

  describe('Field Host: RFID', () => {
    it('đăng nhập lần đầu → nhập RFID sai/đúng → session báo đã xác nhận', async () => {
      const invite = await prisma.hostInvite.create({ data: { email: 'h@example.com', rfidCardNumber: 'RFID-S1-0001', assignedZone: 'The Sapphire 1' } });
      seedUser('h@example.com', 'field_host');
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
      const bareEnv = { ...ENV, GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined };
      const restoreBare = applyEnv(bareEnv);
      const bare = await createApp(prisma, bareEnv);
      try {
        for (const path of ['/api/v1/auth/google?portal=tenant', '/api/v1/auth/google/callback?code=x&state=y']) {
          const res = await request(bare.getHttpServer()).get(path).redirects(0);
          expect(res.status).toBe(503);
          expect(res.body).toMatchObject({ success: false, code: 'auth_not_configured' });
        }
      } finally {
        await bare.close();
        restoreBare();
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
      expect(access).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
      expect(cookies.find((c) => c.startsWith('vs_refresh=;'))).toBeDefined(); // xoá refresh cũ, không đặt mới
      expect(cookies.find((c) => c.startsWith('vs_oauth=;'))).toBeDefined();
      expect(res.text).not.toContain(access.split(';')[0].slice('vs_access='.length));
      expect(prisma.profile.rows).toHaveLength(1);
      expect(prisma.profile.rows[0].passwordHash).toBeNull();
    });

    it('cookie vs_google_hint (không httpOnly, JSON {name,email}) chỉ được đặt khi Google thành công', async () => {
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('tenant');
      const ok = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);

      const hint = cookieValue(ok, 'vs_google_hint')!;
      expect(hint).not.toMatch(/HttpOnly/i);
      expect(hint).toMatch(/SameSite=Lax/i);
      const raw = decodeURIComponent(hint.split(';')[0].slice('vs_google_hint='.length));
      expect(JSON.parse(raw)).toEqual({ name: 'Nguyễn Văn An', email: 'g@example.com' });

      // Lỗi (state giả) → không có cookie gợi ý.
      const failed = await callback('code=abc&state=tenant.nonce-cua-ke-tan-cong', cookie);
      expect(cookieValue(failed, 'vs_google_hint')).toBeUndefined();
    });

    it('sau callback: /auth/session nhận ra người dùng, guard nhận Bearer, logout xoá phiên', async () => {
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
      seedUser('l@example.com', 'landlord');
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

      seedUser('t@example.com', 'tenant');
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

  it('demo-login bật (AUTH_DEMO_MODE=true) → đăng nhập qua login với tài khoản demo đã seed, set cookie phiên', async () => {
    const demoEnv = { ...ENV, AUTH_DEMO_MODE: 'true', DEMO_PASSWORD: PASSWORD };
    const restoreDemo = applyEnv(demoEnv);
    const demo = await createApp(prisma, demoEnv);
    try {
      seedUser('khachthue.demo@vinstay.vn', 'tenant');
      const res = await request(demo.getHttpServer()).post('/api/v1/auth/demo-login').send({ portal: 'tenant' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ needsRfidVerification: false, user: { portal: 'tenant', email: 'khachthue.demo@vinstay.vn' } });
      expect(cookieValue(res, 'vs_access')).toMatch(/HttpOnly/i);
    } finally {
      await demo.close();
      restoreDemo();
    }
  });
});
