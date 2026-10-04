import { SetMetadata } from '@nestjs/common';
import type { HostRoleCode } from '../../modules/auth/host-roles';

export const HOST_ROLES_KEY = 'hostRoles';

/** Chỉ Field Host có ít nhất một trong các vai này được vào. Dùng kèm `@Roles('field_host', ...)` (hoặc đứng một mình). */
export const HostRoles = (...roles: HostRoleCode[]) => SetMetadata(HOST_ROLES_KEY, roles);
