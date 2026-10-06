import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { authError } from '../../modules/auth/auth.errors';
import { AuthSessionService } from '../../modules/auth/session/auth-session.service';
import { SessionCookieService } from '../../modules/auth/session/session-cookies.service';

/**
 * Xác thực mọi route không đánh dấu @Public(): lấy access token từ `Authorization: Bearer` hoặc
 * cookie `vs_access`, kiểm tra JWT do backend ký, nạp vai trò từ DB và gắn `request.user`.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AuthSessionService,
    private readonly cookies: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.cookies.readAccessToken(request);

    if (!token) {
      throw authError('unauthorized');
    }

    const user = await this.sessions.authenticate(token);
    if (!user) throw authError('unauthorized');
    request.user = user;
    return true;
  }
}
