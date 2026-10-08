import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/**
 * Body tối đa của relay chatbot theo contract: 20 tin × 2000 ký tự (tiếng Việt ≈ 3 B/ký tự) ≈ 120KB ⇒ vượt giới hạn
 * mặc định 100kb của express. 256kb chừa dư cho JSON; vẫn đủ nhỏ để chặn body khổng lồ (F12).
 */
export const BODY_LIMIT = '256kb';

/** body-parser quá lớn ⇒ 413 (mặc định filter toàn cục đổi mọi lỗi lạ thành 500, web không fallback được). */
function payloadTooLarge(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err?.type !== 'entity.too.large') return next(err);
  res.status(413).json({
    success: false,
    statusCode: 413,
    code: 'payload_too_large',
    message: 'Nội dung gửi lên quá lớn.',
    errors: null,
  });
}

/** Dùng cùng `NestFactory.create(AppModule, { bodyParser: false })` (main.ts) và bởi test. */
export function useBodyParsers(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true });
  app.use(payloadTooLarge);
}
