import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { hashPassword } from '../auth/password-hasher';
import { createFakePrisma, seedProfile } from '../auth/testing/fake-prisma';
import { AdminController } from './admin.controller';
import { AdminModule } from './admin.module';
import { AdminFeeService } from './admin-fee.service';
import { AdminPayoutService } from './admin-payout.service';
import { AdminDispatchService } from './admin-dispatch.service';
import { AdminBiService } from './admin-bi.service';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminDepositService } from './admin-deposit.service';
import { AdminKeyService } from './admin-key.service';
import { AdminService } from './admin.service';

const ENV = {
  WEB_APP_URL: 'http://localhost:3000',
  API_PREFIX: 'api/v1',
  AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
  JWT_SECRET: 'a-test-jwt-secret-of-at-least-32-chars',
  AUTH_DEMO_MODE: 'true',
};

type Route = { method: 'get' | 'post' | 'put'; path: string };

// 19 route cũ (không đổi path) + route thêm ở Bước 2.
const ADMIN_ROUTES: Route[] = [
  { method: 'get', path: 'bi-funnel' },
  { method: 'get', path: 'exclusive-inventory' },
  { method: 'post', path: 'mandates/x/terminate' },
  { method: 'post', path: 'consignments/x/approve' },
  { method: 'post', path: 'consignments/x/reject' },
  { method: 'get', path: 'dispatch-sla' },
  { method: 'post', path: 'bookings/x/reassign' },
  { method: 'get', path: 'dispatch-sla/summary' },
  { method: 'post', path: 'dispatch/x/escalate' },
  { method: 'get', path: 'contracts' },
  { method: 'get', path: 'contracts/x' },
  { method: 'post', path: 'contracts/x/void-hold' },
  { method: 'post', path: 'contracts/x/complete-exit' },
  { method: 'post', path: 'contracts/x/remind-renewal' },
  { method: 'get', path: 'contract-templates' },
  { method: 'get', path: 'contract-templates/x' },
  { method: 'get', path: 'contract-parties' },
  { method: 'get', path: 'contract-parties/x' },
  { method: 'get', path: 'commission-engine' },
  { method: 'post', path: 'commission-engine/config' },
  { method: 'get', path: 'settings/hold-policy' },
  { method: 'post', path: 'settings/hold-policy' },
  { method: 'get', path: 'deposits' },
  { method: 'post', path: 'deposits/x/resolve-unc' },
  { method: 'get', path: 'door-keys' },
  { method: 'post', path: 'door-keys/x/rotate' },
  { method: 'post', path: 'door-keys/x/revoke' },
];

describe('/admin/* — xác thực + @Roles(ops_admin)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const prisma = createFakePrisma();

    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: prisma }],
      exports: [PrismaService],
    })
    class FakeInfraModule {}

    @Module({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ENV] }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
        FakeInfraModule,
        AuthModule,
        AdminModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    })
    class TestAppModule {}

    // Service giả: guard là đối tượng kiểm; mọi method trả object rỗng.
    const fakeService = new Proxy(
      {},
      { get: (_t, p) => (typeof p === 'symbol' || ['then', 'onModuleInit', 'onApplicationBootstrap'].includes(p) ? undefined : jest.fn(async () => ({}))) },
    );

    const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] })
      .overrideProvider(AdminService)
      .useValue(fakeService)
      .overrideProvider(AdminFeeService)
      .useValue(fakeService)
      .overrideProvider(AdminPayoutService)
      .useValue(fakeService)
      .overrideProvider(AdminDispatchService)
      .useValue(fakeService)
      .overrideProvider(AdminBiService)
      .useValue(fakeService)
      .overrideProvider(AdminInventoryService)
      .useValue(fakeService)
      .overrideProvider(AdminDepositService)
      .useValue(fakeService)
      .overrideProvider(AdminKeyService)
      .useValue(fakeService)
      .compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const passwordHash = await hashPassword('Matkhau-123');
    seedProfile(prisma as any, { id: '00000000-0000-4000-8000-0000000000aa', email: 'ops@example.com', roleCode: 'ops_admin', passwordHash });
  });

  afterEach(() => app.close());

  const call = (agent: request.SuperTest<request.Test>, r: Route, demoRole?: string) => {
    const req = agent[r.method](`/api/v1/admin/${r.path}`);
    if (demoRole) req.set('x-demo-role', demoRole);
    return r.method === 'get' ? req : req.send({});
  };

  it('không route admin nào còn @Public và lớp controller có @Roles("ops_admin")', () => {
    const reflector = new Reflector();
    const proto = AdminController.prototype as any;
    const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    expect(names.length).toBeGreaterThanOrEqual(ADMIN_ROUTES.length);
    for (const n of names) {
      expect([n, reflector.get(IS_PUBLIC_KEY, proto[n])]).toEqual([n, undefined]);
    }
    expect(reflector.get(IS_PUBLIC_KEY, AdminController)).toBeUndefined();
    expect(reflector.get(ROLES_KEY, AdminController)).toEqual(['ops_admin']);
  });

  it.each(ADMIN_ROUTES)('không token ⇒ 401: $method $path', async (r) => {
    const res = await call(request(app.getHttpServer()) as any, r);
    expect(res.status).toBe(401);
  });

  const WRONG_ROLES = ['tenant', 'landlord', 'field_host', 'area_lead', 'compliance_officer'];
  it.each(WRONG_ROLES)('vai %s ⇒ 403 ở mọi route admin', async (role) => {
    for (const r of ADMIN_ROUTES) {
      const res = await call(request(app.getHttpServer()) as any, r, role);
      expect([r.method, r.path, res.status]).toEqual([r.method, r.path, 403]);
    }
  });

  it('ops_admin đăng nhập thật ⇒ qua guard (200/201) ở mọi route admin', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email: 'ops@example.com', password: 'Matkhau-123', portal: 'admin' }).expect(200);
    for (const r of ADMIN_ROUTES) {
      const res = await call(agent as any, r);
      expect([r.method, r.path, [200, 201, 400].includes(res.status)]).toEqual([r.method, r.path, true]);
    }
  });
});
