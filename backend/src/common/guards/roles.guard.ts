import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HOST_ROLES_KEY } from '../decorators/host-roles.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { authError } from '../../modules/auth/auth.errors';
import type { HostRoleCode } from '../../modules/auth/host-roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredHostRoles = this.reflector.getAllAndOverride<HostRoleCode[]>(HOST_ROLES_KEY, targets);
    let requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);

    // `@HostRoles(...)` đứng một mình ngầm hiểu là chỉ Field Host.
    if ((!requiredRoles || requiredRoles.length === 0) && requiredHostRoles?.length) requiredRoles = ['field_host'];
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

    // Field Host chưa có hồ sơ `field_hosts` (Admin chưa tạo) chưa được dùng quyền Host.
    if (user.role === 'field_host' && !user.isHostVerified) {
      throw authError('host_not_provisioned');
    }

    // Vai con của Host (Sale / Thẩm định). Các vai khác đã qua kiểm `@Roles` ở trên nên không bị kiểm thêm.
    if (user.role === 'field_host' && requiredHostRoles?.length) {
      const owned: HostRoleCode[] = user.hostRoles ?? [];
      if (!requiredHostRoles.some((r) => owned.includes(r))) {
        throw authError('host_role_missing', { required: requiredHostRoles });
      }
    }

    return true;
  }
}
