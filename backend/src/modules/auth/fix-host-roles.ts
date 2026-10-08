/**
 * Sửa dữ liệu cũ: Host có INSPECTOR mà thiếu SALE ⇒ thêm SALE (hồ sơ 18 SPEC-P02 §1, bất biến B5).
 * Tách khỏi script để test được. Idempotent: chạy lại ⇒ 0 dòng sửa. Mỗi dòng sửa ghi AuditLog `HOST_ROLES_UPDATE`
 * (actor = chính profile của Host, vai `system`, vì không có Admin ở ngữ cảnh script).
 */
import { HostRole, PrismaClient } from '@prisma/client';

export async function fixHostRoles(prisma: PrismaClient, apply: boolean): Promise<{ fixed: number }> {
  const hosts = await prisma.fieldHost.findMany({
    where: { roles: { has: HostRole.INSPECTOR } },
    select: { id: true, profileId: true, roles: true },
  });
  const broken = hosts.filter((h) => !h.roles.includes(HostRole.SALE));
  if (apply) {
    for (const h of broken) {
      const next = [HostRole.SALE, ...h.roles.filter((r) => r !== HostRole.SALE)];
      await prisma.$transaction(async (tx) => {
        await tx.fieldHost.update({ where: { id: h.id }, data: { roles: next } });
        await tx.auditLog.create({
          data: {
            actorId: h.profileId,
            actorRole: 'system',
            actionType: 'HOST_ROLES_UPDATE',
            entityName: 'FieldHost',
            entityId: h.id,
            oldValue: { roles: h.roles },
            newValue: { roles: next, reason: 'B5: INSPECTOR phải kèm SALE (script fix-host-roles)' },
          },
        });
      });
    }
  }
  return { fixed: broken.length };
}
