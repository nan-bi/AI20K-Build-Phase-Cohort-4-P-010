import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { authError } from '../auth.errors';
import { AuthService } from '../auth.service';
import { SessionCookieService } from '../session/session-cookies.service';
import { isGoogleConfigured } from './google.strategy';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bước 1 — `GET /auth/google?portal=`: sinh `state` (portal + nonce), đặt nonce vào cookie httpOnly rồi để
 * Passport redirect sang Google. Cookie phải đặt ở đây vì Passport tự gửi redirect ngay trong guard.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookieService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    if (!isGoogleConfigured(this.config)) throw authError('auth_not_configured');
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const { state, nonce } = this.auth.beginGoogle(req.query.portal);
    this.cookies.setOAuthState(http.getResponse<Response>(), nonce);
    // FE gửi email Google đã dùng trước đó (`login_hint`) để Google chọn sẵn đúng tài khoản; chỉ nhận chuỗi giống email.
    const hint = req.query.login_hint;
    const loginHint = typeof hint === 'string' && hint.length <= 100 && EMAIL_SHAPE.test(hint) ? hint : undefined;
    return { state, ...(loginHint ? { loginHint } : {}) };
  }
}

/**
 * Bước 2 — `GET /auth/google/callback`: Passport đổi `code` lấy hồ sơ Google. Thất bại (người dùng từ chối,
 * code sai, `state` không khớp cookie) không ném 401 JSON mà để `req.user = null`, controller redirect về
 * màn đăng nhập kèm mã lỗi. `state` sai thì không gọi Google (callback lạc/giả mạo, không tốn lượt đổi code).
 */
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleCallbackGuard.name);

  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookieService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isGoogleConfigured(this.config)) throw authError('auth_not_configured');
    const req = context.switchToHttp().getRequest<Request>();
    if (!this.auth.isGoogleStateValid(req.query.state as string | undefined, this.cookies.readOAuthState(req))) {
      req.user = null;
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<T>(err: unknown, user: T | false | null): T | null {
    if (err) this.logger.warn(`Google callback: ${(err as Error).message}`);
    return user || null;
  }
}
