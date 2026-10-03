import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import {
  ACCESS_COOKIE,
  GOOGLE_HINT_COOKIE,
  GOOGLE_HINT_MAX_AGE_MS,
  LEGACY_REFRESH_COOKIE,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE_MS,
} from '../auth.constants';

export interface SessionTokens {
  accessToken: string;
  /** Số giây access token còn hiệu lực. */
  expiresIn: number;
}

/**
 * Cookie phiên httpOnly + SameSite=Lax (Lax cũng là lớp chống CSRF cho POST/PUT/DELETE).
 * Path `/` bắt buộc: proxy của Next chuyển tiếp cookie của trang (vd. /admin/dashboard) lên backend.
 */
@Injectable()
export class SessionCookieService {
  private readonly secure: boolean;
  private readonly domain?: string;

  constructor(config: ConfigService) {
    const explicit = config.get<string>('COOKIE_SECURE');
    this.secure = explicit ? explicit === 'true' : config.get('NODE_ENV') === 'production';
    this.domain = config.get<string>('COOKIE_DOMAIN') || undefined;
  }

  private base(): CookieOptions {
    return { httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/', domain: this.domain };
  }

  set(res: Response, tokens: SessionTokens): void {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...this.base(), maxAge: tokens.expiresIn * 1000 });
    res.clearCookie(LEGACY_REFRESH_COOKIE, this.base());
  }

  clear(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.base());
    res.clearCookie(LEGACY_REFRESH_COOKIE, this.base());
  }

  /** Nhớ tài khoản Google vừa đăng nhập trên thiết bị này (FE đọc để hiện "Tiếp tục bằng tên …"). Không httpOnly có chủ đích. */
  setGoogleHint(res: Response, hint: { name: string | null; email: string }): void {
    res.cookie(GOOGLE_HINT_COOKIE, JSON.stringify({ name: hint.name, email: hint.email }), {
      ...this.base(),
      httpOnly: false,
      maxAge: GOOGLE_HINT_MAX_AGE_MS,
    });
  }

  setOAuthState(res: Response, value: string): void {
    res.cookie(OAUTH_COOKIE, value, { ...this.base(), maxAge: OAUTH_COOKIE_MAX_AGE_MS });
  }

  clearOAuthState(res: Response): void {
    res.clearCookie(OAUTH_COOKIE, this.base());
  }

  readOAuthState(req: Request): string | undefined {
    return req.cookies?.[OAUTH_COOKIE];
  }

  /** `Authorization: Bearer` (API client / Swagger) ưu tiên hơn cookie (trình duyệt). */
  readAccessToken(req: Request): string | undefined {
    const header = req.headers?.authorization;
    if (header?.toLowerCase().startsWith('bearer ')) {
      const token = header.slice(7).trim();
      if (token) return token;
    }
    return req.cookies?.[ACCESS_COOKIE];
  }
}
