import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Live Supabase API (Nest thật + Prisma thật)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required; this suite reads the configured Supabase database.');
    }

    app = await NestFactory.create(AppModule, { logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns buildings and verified rental units from Supabase', async () => {
    const http = request(app.getHttpServer());
    const [buildings, units] = await Promise.all([
      http.get('/api/v1/properties/buildings'),
      http.get('/api/v1/properties/units'),
    ]);

    expect(buildings.status).toBe(200);
    expect(buildings.body.data.length).toBeGreaterThan(0);
    expect(units.status).toBe(200);
    expect(units.body.data.length).toBeGreaterThan(0);
    expect(units.body.data.every((unit: any) => Number.isInteger(unit.bedrooms))).toBe(true);
  });

  it('serves a real unit detail and busy-slot response', async () => {
    const http = request(app.getHttpServer());
    const list = await http.get('/api/v1/properties/units').expect(200);
    const unitCode = list.body.data[0]?.code;
    expect(unitCode).toBeTruthy();

    const [detail, busySlots] = await Promise.all([
      http.get(`/api/v1/properties/units/${encodeURIComponent(unitCode)}`),
      http.get(`/api/v1/properties/units/${encodeURIComponent(unitCode)}/busy-slots`),
    ]);

    expect(detail.status).toBe(200);
    expect(detail.body.data.code).toBe(unitCode);
    expect(busySlots.status).toBe(200);
  });

  it('runs the real matchmaker against current inventory', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/matchmaker/recommend')
      .send({ maxAllInBudget: 20_000_000, motorbikes: 1, cars: 0, occupants: 2 });

    expect(response.status).toBe(201);
    expect(response.body.data.scanSummary.totalScannedUnits).toBeGreaterThan(0);
    expect(response.body.data.topRecommendations.length).toBeGreaterThan(0);
    expect(response.body.data.topRecommendations.length).toBeLessThanOrEqual(3);
  });

  it('blocks unauthenticated requests to admin APIs', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/dispatch-sla').expect(401);
  });
});
