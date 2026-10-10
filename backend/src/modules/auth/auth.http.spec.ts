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
import { FieldHostsModule } from '../field-hosts/field-hosts.module';
import { HostModule } from '../host/host.module';
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
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), FakeInfraModule, AuthModule, FieldHostsModule, HostModule],
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
      expect(res.body).toMatchObject({ success: true, data: { user: { portal: 'landlord', role: 'landlord' } } });

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
      expect(res.body.data).toMatchObject({ user: { email: 'n@example.com', fullName: 'Nguyễn An', portal: 'tenant' } });
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

    it('admin → 400 (DTO không cho cổng admin); Host không có đăng ký (Admin tạo) → 403 signup_not_allowed, không tạo Profile', async () => {
      const admin = await signup(request(app.getHttpServer()), { portal: 'admin' });
      expect(admin.status).toBe(400);
      expect(admin.body.code).toBe('invalid_request');

      const host = await signup(request(app.getHttpServer()), { portal: 'host' });
      expect(host.status).toBe(403);
      expect(host.body.code).toBe('signup_not_allowed');
      expect(prisma.profile.rows).toHaveLength(0);
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

    it('ops_admin: tạo Host → Profile field_host + FieldHost cùng lúc; danh sách/hồ sơ không lộ băm mật khẩu', async () => {
      seedUser('admin@example.com', 'ops_admin');
      prisma.building.rows.push({ id: 'b1', zoneName: 'The Sapphire 1' });
      const agent = request.agent(app.getHttpServer());
      expect((await login(agent, 'admin', 'admin@example.com')).status).toBe(200);

      const created = await agent
        .post('/api/v1/admin/field-hosts')
        .send({ email: 'Host@Example.com', fullName: ' Phương Nam ', assignedZone: 'The Sapphire 1', roles: ['inspector', 'sale'], password: 'Matkhau-123' });
      expect(created.status).toBe(200);
      expect(created.body.data).toMatchObject({
        email: 'host@example.com',
        fullName: 'Phương Nam',
        roles: ['sale', 'inspector'],
        isActive: true,
        hasPassword: true,
        ticketStats: { OFFERED: 0, ACCEPTED: 0, CHECKED: 0, COMPLETED: 0, EXPIRED: 0, ESCALATED: 0, CANCELLED: 0 },
      });
      expect(prisma.fieldHost.rows).toHaveLength(1);
      expect(JSON.stringify(created.body)).not.toMatch(/scrypt\$|passwordHash/);

      const dup = await agent.post('/api/v1/admin/field-hosts').send({ email: 'host@example.com', fullName: 'X', assignedZone: 'The Sapphire 1', roles: ['sale'] });
      expect(dup.status).toBe(409);
      expect(dup.body.code).toBe('host_already_exists');

      const list = await agent.get('/api/v1/admin/field-hosts');
      expect(list.body.data).toEqual([expect.objectContaining({ email: 'host@example.com', phone: null })]);
      expect(JSON.stringify(list.body)).not.toMatch(/scrypt\$|passwordHash/);
    });

    it('validate DTO: roles rỗng / lạ / trùng, mật khẩu ngắn, thiếu tên → 400; PATCH có email hoặc body rỗng → 400', async () => {
      seedUser('admin@example.com', 'ops_admin');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'admin', 'admin@example.com');
      const base = { email: 'h@example.com', fullName: 'H', assignedZone: 'Z', roles: ['sale'] };
      for (const bad of [{ roles: [] }, { roles: ['admin'] }, { roles: ['sale', 'sale'] }, { password: '1234567' }, { fullName: undefined }]) {
        expect((await agent.post('/api/v1/admin/field-hosts').send({ ...base, ...bad })).status).toBe(400);
      }
      const host = seedProfile(prisma, { email: 'h@example.com', roleCode: 'field_host', withFieldHost: true });
      const id = prisma.fieldHost.rows.find((f: any) => f.profileId === host.id).id;
      expect((await agent.patch(`/api/v1/admin/field-hosts/${id}`).send({ email: 'other@example.com' })).status).toBe(400);
      expect((await agent.patch(`/api/v1/admin/field-hosts/${id}`).send({})).status).toBe(400);
      expect((await agent.patch('/api/v1/admin/field-hosts/not-a-uuid').send({ fullName: 'A' })).status).toBe(400);
    });

    it('Host (đã đăng nhập) không gọi được bất kỳ route /admin/field-hosts nào → 403', async () => {
      seedUser('h@example.com', 'field_host', { withFieldHost: true });
      prisma.building.rows.push({ id: 'b1', zoneName: 'The Sapphire 1' });
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'host', 'h@example.com');
      const id = prisma.fieldHost.rows[0].id;
      expect((await agent.get('/api/v1/admin/field-hosts')).status).toBe(403);
      expect((await agent.get('/api/v1/admin/field-hosts/zones')).status).toBe(403);
      expect((await agent.get(`/api/v1/admin/field-hosts/${id}`)).status).toBe(403);
      expect((await agent.post('/api/v1/admin/field-hosts').send({ email: 'x@example.com', fullName: 'X', assignedZone: 'The Sapphire 1', roles: ['sale'] })).status).toBe(403);
      expect((await agent.patch(`/api/v1/admin/field-hosts/${id}`).send({ roles: ['inspector'] })).status).toBe(403);
      expect((await agent.delete(`/api/v1/admin/field-hosts/${id}`)).status).toBe(403);
      expect(prisma.fieldHost.rows[0].roles).toEqual(['SALE']);
    });

  });

  describe('Field Host: đăng nhập + GET /host/me', () => {
    it('Host do Admin tạo: login → phiên có hostRoles; /host/me không lộ số thẻ, băm mật khẩu hay SĐT mã hoá', async () => {
      const profile = seedUser('h@example.com', 'field_host', { withFieldHost: true });
      prisma.fieldHost.rows[0].rfidCardNumber = 'SECRET-CARD-0001'; // cột cũ còn trong DB
      prisma.profile.rows.find((p: any) => p.id === profile.id).phoneEnc = 'v1:not-decryptable';
      const agent = request.agent(app.getHttpServer());

      const loginRes = await login(agent, 'host', 'h@example.com');
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toMatchObject({ user: { portal: 'host', isHostVerified: true, hostRoles: ['sale'] } });
      expect(loginRes.body.data).not.toHaveProperty('needsRfidVerification');

      const me = await agent.get('/api/v1/host/me');
      expect(me.status).toBe(200);
      expect(me.body.data).toMatchObject({ email: 'h@example.com', roles: ['sale'], assignedZone: 'The Sapphire 1', dutyStatus: 'OFF_DUTY', phone: null });
      expect(JSON.stringify(me.body)).not.toMatch(/SECRET-CARD|rfid|scrypt\$|passwordHash|phoneEnc|not-decryptable/i);
    });

    it('/host/me: tenant → 403, chưa đăng nhập → 401, Host chưa có hồ sơ → 403 host_not_provisioned', async () => {
      expect((await request(app.getHttpServer()).get('/api/v1/host/me')).status).toBe(401);
      seedUser('t@example.com', 'tenant');
      const tenant = request.agent(app.getHttpServer());
      await login(tenant, 'tenant', 't@example.com');
      expect((await tenant.get('/api/v1/host/me')).status).toBe(403);

      seedUser('orphan@example.com', 'field_host'); // Profile field_host nhưng Admin chưa tạo hồ sơ Host
      const orphan = request.agent(app.getHttpServer());
      const res = await login(orphan, 'host', 'orphan@example.com');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('host_not_provisioned');
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it('route verify-rfid đã bị xoá → 404', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/verify-rfid').send({ hostId: '11111111-1111-4111-8111-111111111111', rfid: 'x' });
      expect(res.status).toBe(404);
    });

    it('Admin tạo Host từ Profile field_host mồ côi → Host đăng nhập được bằng chính tài khoản đó (ca lỗi Google chủ tịch gặp)', async () => {
      const orphan = seedUser('orphan@example.com', 'field_host');
      seedUser('admin@example.com', 'ops_admin');
      prisma.building.rows.push({ id: 'b1', zoneName: 'The Sapphire 1' });
      const admin = request.agent(app.getHttpServer());
      await login(admin, 'admin', 'admin@example.com');

      const created = await admin
        .post('/api/v1/admin/field-hosts')
        .send({ email: 'orphan@example.com', fullName: 'Phương Nam', assignedZone: 'The Sapphire 1', roles: ['sale', 'inspector'] });
      expect(created.status).toBe(200);
      expect(created.body.data.profileId).toBe(orphan.id);
      expect(prisma.profile.rows.filter((p: any) => p.email === 'orphan@example.com')).toHaveLength(1);

      const host = request.agent(app.getHttpServer());
      const res = await login(host, 'host', 'orphan@example.com');
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({ hostRoles: ['sale', 'inspector'], isHostVerified: true });
    });

    it('Admin khoá Host → phiên đang mở mất hiệu lực ngay; mở khoá → đăng nhập lại được', async () => {
      seedUser('admin@example.com', 'ops_admin');
      seedUser('h@example.com', 'field_host', { withFieldHost: true });
      const id = prisma.fieldHost.rows[0].id;
      const admin = request.agent(app.getHttpServer());
      await login(admin, 'admin', 'admin@example.com');
      const host = request.agent(app.getHttpServer());
      await login(host, 'host', 'h@example.com');
      expect((await host.get('/api/v1/host/me')).status).toBe(200);

      expect((await admin.delete(`/api/v1/admin/field-hosts/${id}`)).body.data).toMatchObject({ isActive: false, dutyStatus: 'OFF_DUTY' });
      expect((await host.get('/api/v1/auth/session')).body.data.user).toBeNull();
      expect((await login(request.agent(app.getHttpServer()), 'host', 'h@example.com')).body.code).toBe('account_suspended');

      expect((await admin.patch(`/api/v1/admin/field-hosts/${id}`).send({ isActive: true })).body.data).toMatchObject({ isActive: true });
      expect((await login(request.agent(app.getHttpServer()), 'host', 'h@example.com')).status).toBe(200);
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
      const guarded = await request(app.getHttpServer()).get('/api/v1/host/me').set('Authorization', `Bearer ${token}`);
      expect(guarded.status).toBe(403); // qua guard xác thực (không phải 401), bị phân quyền từ chối vì không phải Field Host

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

    it('Field Host có hồ sơ (Admin tạo) đăng nhập Google → redirect trang đích theo vai; session có hostRoles', async () => {
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'field_host', withFieldHost: true, hostRoles: ['INSPECTOR'] });
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('host');

      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      expect(res.headers.location).toBe('http://localhost:3000/host/inspections');
      const access = cookiesOf(res).find((c) => c.startsWith('vs_access='))!.split(';')[0];
      const session = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Cookie', access);
      expect(session.body.data.user).toMatchObject({ portal: 'host', isHostVerified: true, hostRoles: ['inspector'] });
    });

    it('Google cổng host, Profile field_host chưa có hồ sơ → host_not_provisioned (không phải not_authorized), không có phiên', async () => {
      seedProfile(prisma, { email: 'g@example.com', roleCode: 'field_host' });
      fakeGoogle(googleProfile());
      const { state, cookie } = await startFlow('host');
      const res = await callback(`code=abc&state=${encodeURIComponent(state)}`, cookie);
      expect(res.headers.location).toBe('http://localhost:3000/admin/login?error=host_not_provisioned&tab=host');
      expect(cookiesOf(res).find((c) => c.startsWith('vs_access='))).toBeUndefined();
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

    it('phone/send-otp: số đã thuộc tài khoản khác ⇒ 409 NGAY, không gửi mã; số của chính mình thì gửi được', async () => {
      seedUser('a@example.com', 'landlord');
      seedUser('b@example.com', 'landlord');
      const a = request.agent(app.getHttpServer());
      const b = request.agent(app.getHttpServer());
      await login(a, 'landlord', 'a@example.com');
      await login(b, 'landlord', 'b@example.com');

      const sendA = await a.post('/api/v1/auth/phone/send-otp').send({ phone: '0912345678' });
      expect(sendA.status).toBe(200);
      await a.post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: sendA.body.data.devCode });

      const otpRows = () => (prisma as any).otpCode?.rows?.length;
      const before = otpRows();
      const sendB = await b.post('/api/v1/auth/phone/send-otp').send({ phone: '0912345678' });
      expect(sendB.status).toBe(409);
      expect(sendB.body.code).toBe('phone_already_registered');
      expect(otpRows()).toBe(before); // chưa tạo/gửi OTP nào

      expect((await a.post('/api/v1/auth/phone/send-otp').send({ phone: '0912345678' })).status).toBe(200);
    });

    it('phone/send-otp: Khách thuê 403, chưa đăng nhập 401', async () => {
      expect((await request(app.getHttpServer()).post('/api/v1/auth/phone/send-otp').send({ phone: '0912345678' })).status).toBe(401);
      seedUser('t2@example.com', 'tenant');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant', 't2@example.com');
      expect((await agent.post('/api/v1/auth/phone/send-otp').send({ phone: '0912345678' })).status).toBe(403);
    });

    it('phone/verify: Khách thuê không có quyền (403), chưa đăng nhập (401)', async () => {
      expect((await request(app.getHttpServer()).post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: '1234' })).status).toBe(401);

      seedUser('t@example.com', 'tenant');
      const agent = request.agent(app.getHttpServer());
      await login(agent, 'tenant', 't@example.com');
      expect((await agent.post('/api/v1/auth/phone/verify').send({ phone: '0912345678', code: '1234' })).status).toBe(403);
    });
  });

  it.skip('demo-login bị tắt mặc định → 404 demo_disabled', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/demo-login').send({ portal: 'tenant' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('demo_disabled');
  });

  it.skip('demo-login bật (AUTH_DEMO_MODE=true) → đăng nhập qua login với tài khoản demo đã seed, set cookie phiên', async () => {
    const demoEnv = { ...ENV, AUTH_DEMO_MODE: 'true', DEMO_PASSWORD: PASSWORD };
    const restoreDemo = applyEnv(demoEnv);
    const demo = await createApp(prisma, demoEnv);
    try {
      seedUser('khachthue.demo@vinstay.vn', 'tenant');
      const res = await request(demo.getHttpServer()).post('/api/v1/auth/demo-login').send({ portal: 'tenant' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ user: { portal: 'tenant', email: 'khachthue.demo@vinstay.vn' } });
      expect(cookieValue(res, 'vs_access')).toMatch(/HttpOnly/i);
    } finally {
      await demo.close();
      restoreDemo();
    }
  });
});
