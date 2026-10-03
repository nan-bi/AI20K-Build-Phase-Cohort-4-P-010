import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SESSION_TTL_SECONDS } from '../auth.constants';

/** `iss` của JWT phiên do backend ký. */
export const SESSION_TOKEN_ISSUER = 'vinstay-backend';

export interface SessionTokenClaims {
  /** Id Profile. */
  sub: string;
  email?: string;
}

/**
 * JWT phiên do chính backend ký, dùng cho mọi cách đăng nhập (email + mật khẩu, Google). Token chỉ chứa
 * id + email; vai trò/trạng thái khoá luôn đọc lại từ DB ở AuthSessionService.
 */
@Injectable()
export class SessionTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(profileId: string, email: string): { accessToken: string; expiresIn: number } {
    const accessToken = this.jwt.sign({ sub: profileId, email }, { expiresIn: SESSION_TTL_SECONDS });
    return { accessToken, expiresIn: SESSION_TTL_SECONDS };
  }

  /** null nếu sai chữ ký, sai issuer (vd. JWT Supabase của phiên cũ) hoặc hết hạn. */
  verify(token: string): SessionTokenClaims | null {
    try {
      const claims = this.jwt.verify<SessionTokenClaims>(token);
      return typeof claims?.sub === 'string' ? claims : null;
    } catch {
      return null;
    }
  }
}
