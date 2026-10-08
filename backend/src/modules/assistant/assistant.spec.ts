import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { AuthSessionService } from '../auth/session/auth-session.service';
import { SessionCookieService } from '../auth/session/session-cookies.service';
import { useBodyParsers } from './body-limit';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { GuestLimiter, guestChatTurns } from './guest-limiter';

const SSE =
  'event: delta\ndata: {"text":"Chào "}\n\n' +
  'event: delta\ndata: {"text":"bạn"}\n\n' +
  'event: units\ndata: {"unitCodes":["VHOP-S1.02-0607"],"mode":"search","matched":2,"matchedCodes":["VHOP-S1.02-0607","VHOP-S1.05-1203"],"assumed":{"occupants":2,"motorbikes":1,"cars":0}}\n\n' +
  'event: done\ndata: {"model":"fake","toolCalls":1,"ms":5}\n\n';

const BODY = { messages: [{ role: 'user', content: 'Studio dưới 8 triệu' }], locale: 'vi' };

async function makeApp(rawEnv: Record<string, string | undefined>, fullName: string | null = null) {
  const env: Record<string, string | undefined> = { ASSISTANT_GUEST_TURNS: '1000', ...rawEnv };
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
    controllers: [AssistantController],
    providers: [
      AssistantService,
      { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      { provide: SessionCookieService, useValue: { readAccessToken: () => (fullName ? 'tok' : null) } },
      { provide: AuthSessionService, useValue: { authenticate: async () => ({ id: 'u1', email: 'a@b.c', fullName }) } },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  useBodyParsers(app);
  if (env.TRUST_PROXY) app.set('trust proxy', true); // như main.ts khi chạy sau reverse proxy
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

describe('Assistant relay (A8)', () => {
  let fake: Server;
  let url: string;
  const seen: { headers: IncomingMessage['headers']; body: any }[] = [];
  let app: INestApplication;

  beforeAll(async () => {
    fake = createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        seen.push({ headers: req.headers, body: JSON.parse(raw) });
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write(SSE.slice(0, 20)); // cắt giữa event để kiểm tra pipe nguyên văn
        setTimeout(() => res.end(SSE.slice(20)), 10);
      });
    });
    await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => fake.close(r));
  });
  afterEach(async () => {
    await app?.close();
    seen.length = 0;
  });

  it('pipes SSE verbatim, sends internal key and only firstName', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' }, 'Nguyễn Văn Nam');
    const res = await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ ...BODY, user: { id: 'evil', phone: '0900' } })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.setEncoding('utf8');
        r.on('data', (c) => (d += c));
        r.on('end', () => cb(null, d));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.body).toBe(SSE);
    expect(seen[0].headers['x-internal-key']).toBe('k1');
    expect(seen[0].body.user).toEqual({ firstName: 'Nam' });
    expect(JSON.stringify(seen[0].body)).not.toMatch(/evil|0900|a@b\.c|u1/);
  });

  it('guest => no user field', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    await request(app.getHttpServer()).post('/assistant/chat').send(BODY).expect(200);
    expect(seen[0].body.user).toBeUndefined();
  });

  it('searchContext: có ⇒ forward nguyên văn, khoá lạ bị bỏ; không có ⇒ không gửi', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    const ctx = { max_all_in_budget: 6000000, occupants: 1, motorbikes: 0, must_have: ['bàn ghế'] };
    await request(app.getHttpServer())
      .post('/assistant/chat')
      .send({ ...BODY, searchContext: { ...ctx, evil: 'x' } })
      .expect(200);
    expect(seen[0].body.searchContext).toEqual(ctx);
    await request(app.getHttpServer()).post('/assistant/chat').send(BODY).expect(200);
    expect(seen[1].body).not.toHaveProperty('searchContext');
  });

  it('searchContext sai kiểu/giới hạn ⇒ 400, không gọi ai-engine', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    const bads = [
      { must_have: ['x'.repeat(41)] },
      { must_have: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { occupants: -1 },
      { occupants: 'abc' },
      { layout: '5pn' },
    ];
    for (const bad of bads) {
      await request(app.getHttpServer()).post('/assistant/chat').send({ ...BODY, searchContext: bad }).expect(400);
    }
    expect(seen).toHaveLength(0);
  });

  it('AI_ENGINE_URL missing => 503 AI_UPSTREAM_DOWN', async () => {
    app = await makeApp({});
    const res = await request(app.getHttpServer()).post('/assistant/chat').send(BODY);
    expect(res.status).toBe(503);
    expect(res.body.code ?? res.body.error?.code).toBe('AI_UPSTREAM_DOWN');
  });

  it('ai-engine down (connection refused) => 503 AI_UPSTREAM_DOWN', async () => {
    app = await makeApp({ AI_ENGINE_URL: 'http://127.0.0.1:1', AI_ENGINE_INTERNAL_KEY: 'k' });
    const res = await request(app.getHttpServer()).post('/assistant/chat').send(BODY);
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).toContain('AI_UPSTREAM_DOWN');
  });

  it.each([
    ['no messages', { messages: [], locale: 'vi' }],
    ['21 messages', { messages: Array(21).fill({ role: 'user', content: 'x' }), locale: 'vi' }],
    ['content > 2000', { messages: [{ role: 'user', content: 'x'.repeat(2001) }], locale: 'vi' }],
    ['bad role', { messages: [{ role: 'system', content: 'x' }], locale: 'vi' }],
    ['bad locale', { messages: [{ role: 'user', content: 'x' }], locale: 'fr' }],
  ])('bad body (%s) => 400, upstream untouched', async (_n, body) => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    await request(app.getHttpServer()).post('/assistant/chat').send(body).expect(400);
    expect(seen).toHaveLength(0);
  });

  it('F12: body tối đa theo contract (20 tin × 2000 ký tự tiếng Việt ≈ 120KB) vẫn nhận được (200), body quá giới hạn ⇒ 413', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    const content = 'ệ'.repeat(2000);
    const max = { messages: Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content })), locale: 'vi' };
    expect(Buffer.byteLength(JSON.stringify(max))).toBeGreaterThan(100 * 1024);
    await request(app.getHttpServer()).post('/assistant/chat').send(max).expect(200);
    expect(seen[0].body.messages).toHaveLength(20);
    const huge = { messages: [{ role: 'user', content: 'x'.repeat(300 * 1024) }], locale: 'vi' };
    const res = await request(app.getHttpServer()).post('/assistant/chat').send(huge);
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('payload_too_large');
    expect(seen).toHaveLength(1);
  });

  it('rate limit 20/min => 429 on the 21st', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, AI_ENGINE_INTERNAL_KEY: 'k1' });
    const codes: number[] = [];
    for (let i = 0; i < 21; i++) codes.push((await request(app.getHttpServer()).post('/assistant/chat').send(BODY)).status);
    expect(codes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(codes[20]).toBe(429);
  });
});

describe('Giới hạn khách chưa đăng nhập (fix2)', () => {
  let fake: Server;
  let url: string;
  let hits = 0;
  let app: INestApplication;
  beforeAll(async () => {
    fake = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        hits++;
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(SSE);
      });
    });
    await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => fake.close(r));
  });
  afterEach(async () => {
    await app?.close();
    hits = 0;
  });
  const post = (ip: string) => request(app.getHttpServer()).post('/assistant/chat').set('X-Forwarded-For', `${ip}, 10.0.0.1`).send(BODY);

  it('khách: lượt 1-2 qua, lượt 3 => 401 LOGIN_REQUIRED và không gọi ai-engine', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, ASSISTANT_GUEST_TURNS: '2' });
    await post('1.1.1.1').expect(200);
    await post('1.1.1.1').expect(200);
    const res = await post('1.1.1.1');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('LOGIN_REQUIRED');
    expect(hits).toBe(2);
  });

  it('hai IP độc lập (sau proxy tin cậy)', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, ASSISTANT_GUEST_TURNS: '2', TRUST_PROXY: 'true' });
    await post('1.1.1.1').expect(200);
    await post('1.1.1.1').expect(200);
    await post('1.1.1.1').expect(401);
    await post('2.2.2.2').expect(200);
  });

  it('không bật TRUST_PROXY: giả X-Forwarded-For KHÔNG lách được giới hạn', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, ASSISTANT_GUEST_TURNS: '2' });
    await post('1.1.1.1').expect(200);
    await post('2.2.2.2').expect(200);
    await post('3.3.3.3').expect(401);
  });

  it('đã đăng nhập: lượt 3 vẫn qua', async () => {
    app = await makeApp({ AI_ENGINE_URL: url, ASSISTANT_GUEST_TURNS: '2' }, 'Nguyễn Văn Nam');
    for (let i = 0; i < 4; i++) await post('1.1.1.1').expect(200);
  });

  it('guestChatTurns: mặc định 2, đọc env hợp lệ', () => {
    expect(guestChatTurns(undefined)).toBe(2);
    expect(guestChatTurns('')).toBe(2);
    expect(guestChatTurns('abc')).toBe(2);
    expect(guestChatTurns('5')).toBe(5);
  });
});

describe('GuestLimiter (đồng hồ giả)', () => {
  it('hết cửa sổ 24h => đếm lại và dọn entry', () => {
    let t = 1_000;
    const lim = new GuestLimiter(2, () => t);
    expect(lim.take('a')).toBe(true);
    expect(lim.take('a')).toBe(true);
    expect(lim.take('a')).toBe(false);
    t += 24 * 60 * 60 * 1000 - 1;
    expect(lim.take('a')).toBe(false);
    t += 1;
    expect(lim.take('a')).toBe(true);
    expect(lim.take('a')).toBe(true);
    expect(lim.take('a')).toBe(false);
    lim.take('b');
    t += 25 * 60 * 60 * 1000;
    lim.take('c');
    expect(lim.size).toBe(1); // a, b đã dọn
    lim.stop();
  });
});
