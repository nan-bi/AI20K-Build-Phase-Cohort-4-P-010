import { JwtService } from '@nestjs/jwt';
import { SESSION_TOKEN_ISSUER, SessionTokenService } from '../session/session-token.service';

/** SessionTokenService thật (JWT HS256) với khóa test — không cần giả vì không có I/O. */
export const createSessionTokens = (secret = 'a-test-jwt-secret-of-at-least-32-chars') =>
  new SessionTokenService(
    new JwtService({
      secret,
      signOptions: { algorithm: 'HS256', issuer: SESSION_TOKEN_ISSUER },
      verifyOptions: { algorithms: ['HS256'], issuer: SESSION_TOKEN_ISSUER },
    }),
  );
