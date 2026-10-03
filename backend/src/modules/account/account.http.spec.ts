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
import { AuthModule } from '../auth/auth.module';
import { createFakePrisma, seedProfile } from '../auth/testing/fake-prisma';
import { hashPassword } from '../auth/password-hasher';
import { AccountModule } from './account.module';

const ENV = {
  WEB_APP_URL: 'http://localhost:3000',
  API_PREFIX: 'api/v1',
  AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!',
  JWT_SECRET: 'a-test-jwt-secret-of-at-least-32-chars',
};

const USER_A = '00000000-0000-4000-8000-00000000000a';
const USER_B = '00000000-0000-4000-8000-00000000000b';

describe('/me (Nest thật + Prisma giả)', () => {
  let app: INestApplication;
  let prisma: Record<string, any>;
  let agentOf: (email: string, id: string, roleCode: 'tenant' | 'landlord') => Promise<ReturnType<typeof request.agent>>;

  beforeEach(async () => {
    prisma = createFakePrisma();
    prisma.viewing = { findMany: jest.fn(async () => []) };
    prisma.contract = { findMany: jest.fn(async () => []) };
    prisma.unit = { findMany: jest.fn(async () => []) };

    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: prisma }],
      exports: [PrismaService],
    })
    class FakeInfraModule {}

    @Module({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ENV] }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
        FakeInfraModule,
        AuthModule,
        AccountModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    })
    class TestAppModule {}

    const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Hai người dùng thật trong DB (mật khẩu băm scrypt); đăng nhập bằng mật khẩu qua đúng đường của hệ thống.
    const passwordHash = await hashPassword('Matkhau-123');
    seedProfile(prisma as any, { id: USER_A, email: 'a@example.com', roleCode: 'tenant', fullName: 'Người A', passwordHash });
    seedProfile(prisma as any, { id: USER_B, email: 'b@example.com', roleCode: 'tenant', fullName: 'Người B', passwordHash });
    agentOf = async (email, _id, roleCode) => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/api/v1/auth/login').send({ email, password: 'Matkhau-123', portal: roleCode }).expect(200);
      return agent;
    };
  });

  afterEach(() => app.close());

  it('không đăng nhập ⇒ 401 ở MỌI route /me (không còn @Public)', async () => {
    const http = request(app.getHttpServer());
    for (const path of ['profile', 'bookings', 'contracts', 'favorites', 'notifications']) {
      expect((await http.get(`/api/v1/me/${path}`)).status).toBe(401);
    }
    expect((await http.patch('/api/v1/me/profile').send({ fullName: 'x' })).status).toBe(401);
  });

  it('GET /me/profile trả đúng hồ sơ của người gọi, không bao giờ "người đầu tiên trong DB"', async () => {
    const agent = await agentOf('b@example.com', USER_B, 'tenant');
    const res = await agent.get('/api/v1/me/profile');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(USER_B);
    expect(JSON.stringify(res.body)).not.toContain(USER_A);
    expect(prisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it('bookings và contracts luôn lọc theo người gọi, không trả dữ liệu mẫu khi rỗng', async () => {
    const agent = await agentOf('b@example.com', USER_B, 'tenant');

    const bookings = await agent.get('/api/v1/me/bookings');
    expect(prisma.viewing.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: USER_B } }));
    expect(bookings.body.data).toEqual([]);

    const contracts = await agent.get('/api/v1/me/contracts');
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ tenantId: USER_B }, { landlordId: USER_B }] } }),
    );
    expect(contracts.body.data).toEqual([]);
  });

  it('PATCH /me/profile chỉ đổi họ tên; email/SĐT trong body bị bỏ qua', async () => {
    const agent = await agentOf('b@example.com', USER_B, 'tenant');
    const res = await agent.patch('/api/v1/me/profile').send({ fullName: 'Tên Mới', email: 'hacker@example.com', phone: '0900000000' });

    expect(res.status).toBe(200);
    const row = prisma.profile.rows.find((r: any) => r.id === USER_B);
    expect(row).toMatchObject({ fullName: 'Tên Mới', email: 'b@example.com' });
    expect(prisma.profile.rows.find((r: any) => r.id === USER_A).fullName).toBe('Người A');
  });

  it('yêu thích tách riêng theo người dùng', async () => {
    const a = await agentOf('a@example.com', USER_A, 'tenant');
    const b = await agentOf('b@example.com', USER_B, 'tenant');
    await a.put('/api/v1/me/favorites/unit-1').expect(200);

    await b.get('/api/v1/me/favorites');
    expect(prisma.unit.findMany).not.toHaveBeenCalled(); // B chưa lưu gì ⇒ không truy vấn, trả []

    await a.get('/api/v1/me/favorites');
    expect(prisma.unit.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['unit-1'] } } }));
  });
});
