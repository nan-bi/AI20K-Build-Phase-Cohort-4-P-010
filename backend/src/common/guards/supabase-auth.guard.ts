import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { authError } from '../../modules/auth/auth.errors';
import { portalForRole } from '../../modules/auth/auth.constants';
import { AuthSessionService } from '../../modules/auth/session/auth-session.service';
import { SessionCookieService } from '../../modules/auth/session/session-cookies.service';

/**
 * Xác thực mọi route không đánh dấu @Public(): lấy access token từ `Authorization: Bearer` hoặc
 * cookie `vs_access`, kiểm tra JWT do backend ký, nạp vai trò từ DB và gắn `request.user`.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly demoMode: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AuthSessionService,
    private readonly cookies: SessionCookieService,
    config: ConfigService,
  ) {
    // Header x-demo-role bỏ qua xác thực hoàn toàn — chỉ tồn tại khi bật tường minh và không phải production.
    this.demoMode = config.get('AUTH_DEMO_MODE') === 'true' && config.get('NODE_ENV') !== 'production';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.cookies.readAccessToken(request);

    if (!token) {
      const demoRole = this.demoMode ? request.headers['x-demo-role'] : undefined;
      if (demoRole) {
        request.user = {
          id: request.headers['x-demo-userid'] || '00000000-0000-0000-0000-000000000001',
          email: `${demoRole}@vinstay.ai`,
          fullName: 'Demo User',
          role: demoRole,
          portal: portalForRole(demoRole),
          isPhoneVerified: true,
          isHostVerified: true,
        };
        return true;
      }
      throw authError('unauthorized');
    }

    const user = await this.sessions.authenticate(token);
    if (!user) throw authError('unauthorized');
    request.user = user;
    return true;
  }
}
