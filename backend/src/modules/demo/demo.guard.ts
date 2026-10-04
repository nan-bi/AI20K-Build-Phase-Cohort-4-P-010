import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DemoGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const isDemoTools = process.env.DEMO_TOOLS === 'true';
    const isNotProd = process.env.NODE_ENV !== 'production';

    if (!isDemoTools || !isNotProd) {
      throw new NotFoundException({
        message: 'Endpoint không tồn tại hoặc tính năng demo đang tắt.',
        code: 'not_found',
      });
    }

    return true;
  }
}
