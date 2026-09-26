import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';

/** Danh tính Google sau khi Passport đổi code: chỉ giữ những gì backend cần (không giữ access token Google). */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string | null;
}

// passport-google-oauth20 ném lỗi ngay khi khởi tạo nếu thiếu clientID/clientSecret; dùng giá trị giữ chỗ để
// backend vẫn khởi động khi chưa cấu hình Google (endpoint sẽ trả auth_not_configured).
const PLACEHOLDER = 'google-not-configured';

export function isGoogleConfigured(config: ConfigService): boolean {
  return Boolean(config.get<string>('GOOGLE_CLIENT_ID') && config.get<string>('GOOGLE_CLIENT_SECRET'));
}

/**
 * Google gọi về `${WEB_APP_URL}/api/v1/auth/google/callback` (đi qua rewrite của Next để cookie
 * nằm cùng origin với FE). URI này phải khớp chính xác "Authorized redirect URIs" trong Google Cloud.
 */
export function googleCallbackUrl(config: ConfigService): string {
  const explicit = config.get<string>('GOOGLE_CALLBACK_URL');
  if (explicit) return explicit;
  const webUrl = (config.get<string>('WEB_APP_URL') || 'http://localhost:3000').replace(/\/+$/, '');
  const apiPrefix = (config.get<string>('API_PREFIX') || 'api/v1').replace(/^\/+|\/+$/g, '');
  return `${webUrl}/${apiPrefix}/auth/google/callback`;
}

function strategyOptions(config: ConfigService): StrategyOptions {
  return {
    clientID: config.get<string>('GOOGLE_CLIENT_ID') || PLACEHOLDER,
    clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || PLACEHOLDER,
    callbackURL: googleCallbackUrl(config),
    scope: ['email', 'profile'],
  };
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super(strategyOptions(config));
  }

  // Luôn hiện màn chọn tài khoản Google (không tự đăng nhập bằng tài khoản Google đang mở sẵn trong trình duyệt).
  authorizationParams(): Record<string, string> {
    return { prompt: 'select_account' };
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleIdentity | null {
    const email = profile.emails?.[0];
    if (!email?.value) return null;
    return {
      googleId: profile.id,
      email: email.value,
      emailVerified: Boolean(email.verified ?? profile._json?.email_verified),
      fullName: profile.displayName || null,
    };
  }
}
