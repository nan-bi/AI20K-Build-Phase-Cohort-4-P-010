import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GOOGLE_SESSION_TTL_SECONDS } from '../auth.constants';

/** `iss` phân biệt JWT do backend ký với JWT của Supabase khi cùng nằm trong cookie `vs_access`. */
export const SESSION_TOKEN_ISSUER = 'vinstay-backend';

export interface SessionTokenClaims {
  /** Id Profile. */
  sub: string;
  email?: string;
}

/**
 * JWT phiên do chính backend ký, dùng cho đăng nhập Google (không đi qua Supabase Auth). Token chỉ chứa
 * id + email; vai trò/trạng thái khoá luôn đọc lại từ DB ở AuthSessionService.
 */
@Injectable()
export class SessionTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(profileId: string, email: string): { accessToken: string; expiresIn: number } {
    const accessToken = this.jwt.sign({ sub: profileId, email }, { expiresIn: GOOGLE_SESSION_TTL_SECONDS });
    return { accessToken, expiresIn: GOOGLE_SESSION_TTL_SECONDS };
  }

  /** null nếu không phải token của backend (vd. JWT Supabase), sai chữ ký hoặc hết hạn. */
  verify(token: string): SessionTokenClaims | null {
    try {
      const claims = this.jwt.verify<SessionTokenClaims>(token);
      return typeof claims?.sub === 'string' ? claims : null;
    } catch {
      return null;
    }
  }
}
