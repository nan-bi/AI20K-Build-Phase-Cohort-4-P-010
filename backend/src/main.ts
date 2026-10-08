import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ACCESS_COOKIE } from './modules/auth/auth.constants';
import { useBodyParsers } from './modules/assistant/body-limit';

async function bootstrap() {
  const logger = new Logger('VinStayBootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  useBodyParsers(app); // json/urlencoded 256kb (relay chatbot tối đa ≈120KB); quá lớn ⇒ 413, không phải 500

  // Sau Next.js proxy (`/api/v1` rewrite) thì IP client nằm ở X-Forwarded-For; TRUST_PROXY=1 để rate limit
  // và audit log thấy IP thật. Chỉ bật khi backend không lộ trực tiếp ra Internet (nếu không client tự giả IP).
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  // Phiên nằm trong cookie httpOnly nên cần đọc cookie.
  app.use(cookieParser());

  // 1. CORS: cookie phiên chỉ dùng cùng origin (FE gọi qua rewrite /api/v1), nhưng vẫn cho phép danh sách
  // origin tường minh gọi kèm credentials. Không dùng '*' với credentials (trình duyệt từ chối).
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.WEB_APP_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global API Prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // 3. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 4. OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VinStay AI — Backend API Platform')
    .setDescription(
      `Hệ thống API Backend toàn diện cho nền tảng thuê căn hộ Asset-Light tại Vinhomes Ocean Park (Sapphire 1 & 2).\n\n` +
        `**Kiến trúc:** NestJS 10 + Prisma ORM + Supabase (PostgreSQL + Storage); đăng nhập do backend tự xử lý (JWT + băm mật khẩu trong bảng profiles).\n` +
        `**Phân hệ bám sát:**\n` +
        `- 👤 **Khách thuê (Tenant):** Catalog căn từ PostgreSQL, đặt lịch/đón sảnh; OTP, VietQR và eKYC chỉ hoạt động khi nhà cung cấp thật được cấu hình.\n` +
        `- 🏠 **Chủ nhà (Landlord):** Ký gửi độc quyền thẩm định 0đ, Ở nhà 100% (0km, 0 phút), Giám sát mở cửa từ xa, Thoát ủy quyền 15 ngày.\n` +
        `- 🚶 **Field Host PWA:** Nhận ticket SLA 3-5m, Quẹt thẻ RFID thang máy, Cấp mã cửa Vault JIT tại phòng, Hoa hồng +450k.\n` +
        `- ⚙️ **Quản trị viên (Admin):** BI Funnel, Heatmap lấp đầy Sapphire 1 & 2, Giám sát rổ hàng, Dynamic Commission Engine.\n`,
    )
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Authorization',
        description: 'JWT phiên do backend ký (trình duyệt dùng cookie httpOnly do POST /auth/login set).',
        in: 'header',
      },
      'bearer-token',
    )
    .addCookieAuth(ACCESS_COOKIE, { type: 'apiKey', in: 'cookie', name: ACCESS_COOKIE }, 'session-cookie')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'VinStay AI — API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // 4000 (không phải 3000) để không đụng cổng dev của Next.js ở apps/web.
  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`========================================================`);
  logger.log(`🚀 VinStay AI Backend is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger API Interactive Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏢 Pilot Area: Vinhomes Ocean Park (The Sapphire 1 & 2)`);
  logger.log(`========================================================`);
}

bootstrap();
