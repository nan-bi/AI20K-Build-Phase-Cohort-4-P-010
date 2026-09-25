import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('VinStayBootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. CORS Configuration (Hỗ trợ PWA, Web Portal, Admin & Prototype)
  app.enableCors({
    origin: '*',
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
        `**Kiến trúc:** NestJS 10 + Prisma ORM + Supabase (PostgreSQL + Auth + Storage).\n` +
        `**Phân hệ bám sát:**\n` +
        `- 👤 **Khách thuê (Tenant):** All-in Cost Calculator, AI Matchmaker 30s, Đặt lịch OTP, Đón sảnh 1-chạm, Cọc VietQR 2M, FPT.AI eKYC, Ký thỏa thuận số.\n` +
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
        description: 'Nhập Supabase Auth JWT Token hoặc gửi header [x-demo-role: admin / field_host / landlord / tenant]',
        in: 'header',
      },
      'bearer-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'VinStay AI — API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`========================================================`);
  logger.log(`🚀 VinStay AI Backend is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger API Interactive Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏢 Pilot Area: Vinhomes Ocean Park (The Sapphire 1 & 2)`);
  logger.log(`========================================================`);
}

bootstrap();
