import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_VERIFICATION_KEY, VerificationLevel } from '../decorators/require-verification.decorator';
import { authError } from '../../modules/auth/auth.errors';

/** Chạy sau `RolesGuard` (đã có `request.user`). Route không gắn `@RequireVerification` ⇒ bỏ qua. */
@Injectable()
export class VerificationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const level = this.reflector.getAllAndOverride<VerificationLevel>(REQUIRE_VERIFICATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!level) return true;

    const { user } = context.switchToHttp().getRequest();
    if (level === 'phone' && !user?.isPhoneVerified) {
      throw authError('phone_not_verified', { required: level });
    }
    return true;
  }
}
