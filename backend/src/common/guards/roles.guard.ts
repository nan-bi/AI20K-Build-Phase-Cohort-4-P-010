import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { authError } from '../../modules/auth/auth.errors';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`Yêu cầu vai trò [${requiredRoles.join(', ')}], vai trò hiện tại: [${user.role}]`);
    }

    // Field Host đã đăng nhập nhưng chưa nhập đúng RFID chưa được dùng quyền Host.
    if (user.role === 'field_host' && !user.isHostVerified) {
      throw authError('host_rfid_unverified');
    }

    return true;
  }
}
