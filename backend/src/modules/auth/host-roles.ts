import { HostRole } from '@prisma/client';

/** Vai của Field Host trên dây (API/phiên). DB lưu enum chữ hoa; mọi chuyển đổi đi qua file này. */
export const HOST_ROLES = ['sale', 'inspector'] as const;
export type HostRoleCode = (typeof HOST_ROLES)[number];

const TO_CODE: Record<HostRole, HostRoleCode> = { SALE: 'sale', INSPECTOR: 'inspector' };
const TO_ENUM: Record<HostRoleCode, HostRole> = { sale: HostRole.SALE, inspector: HostRole.INSPECTOR };

/** DB → dây. Bỏ trùng, sắp theo thứ tự HOST_ROLES (sale trước). */
export function toHostRoleCodes(roles: readonly HostRole[] | null | undefined): HostRoleCode[] {
  const set = new Set((roles ?? []).map((r) => TO_CODE[r]));
  return HOST_ROLES.filter((r) => set.has(r));
}

/** Dây → DB. Bỏ trùng, sắp theo thứ tự HOST_ROLES. */
export function toHostRoleEnums(codes: readonly HostRoleCode[]): HostRole[] {
  const set = new Set(codes);
  return HOST_ROLES.filter((r) => set.has(r)).map((r) => TO_ENUM[r]);
}

/** Trang đích cổng Host theo vai (web có bản sao thuần ở `apps/web/src/lib/auth/portals.ts`). */
export function hostHome(roles: readonly HostRoleCode[]): string {
  if (roles.includes('sale')) return '/host/dispatch';
  if (roles.includes('inspector')) return '/host/inspections';
  return '/host/account';
}
