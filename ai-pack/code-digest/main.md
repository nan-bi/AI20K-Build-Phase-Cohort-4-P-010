# Digest: main.ts

## Files
- backend/src/main.ts (99 dòng)
## Cấu hình
- L4: import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
- L5: import * as cookieParser from 'cookie-parser';
- L23: if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
- L26: app.use(cookieParser());
- L34: app.enableCors({
- L42: app.setGlobalPrefix(apiPrefix);
- L45: app.useGlobalPipes(
- L54: const swaggerConfig = new DocumentBuilder()
- L82: const document = SwaggerModule.createDocument(app, swaggerConfig);
- L83: SwaggerModule.setup('api/docs', app, document, {
- L90: await app.listen(port);
