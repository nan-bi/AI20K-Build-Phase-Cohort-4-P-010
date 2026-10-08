/**
 * Logic backfill `unit_inventory_items` từ `meta.report.inventory` của mandate ACTIVE/EXIT_REQUESTED (hồ sơ 18, SPEC-P01 §3).
 * Tách khỏi script để test được. Idempotent: upsert theo `unitId+code`; chỉ dòng `present`.
 */
import { MandateStatus, PrismaClient } from '@prisma/client';
import { readConsignmentMeta } from '../landlord/landlord.mappers';

export async function backfillUnitInventory(
  prisma: Pick<PrismaClient, 'exclusiveMandate' | 'unitInventoryItem'>,
  apply: boolean,
): Promise<{ units: number; rows: number }> {
  const mandates = await prisma.exclusiveMandate.findMany({
    where: { status: { in: [MandateStatus.ACTIVE, MandateStatus.EXIT_REQUESTED] } }, // EXIT_REQUESTED: căn còn niêm yết đến hết 15 ngày báo trước
    select: { unitId: true, doorAccessConfig: true },
  });
  let units = 0;
  let rows = 0;
  for (const m of mandates) {
    const inventory = readConsignmentMeta(m.doorAccessConfig)?.report?.inventory?.filter((l) => l.present) ?? [];
    if (!inventory.length) continue;
    units++;
    for (const l of inventory) {
      rows++;
      if (!apply) continue;
      const data = {
        groupCode: l.group,
        name: l.name,
        qty: l.qty ?? 1,
        spec: l.spec?.trim().slice(0, 120) || null,
        condition: l.condition ?? null,
      };
      await prisma.unitInventoryItem.upsert({
        where: { unitId_code: { unitId: m.unitId, code: l.code } },
        update: data,
        create: { unitId: m.unitId, code: l.code, ...data },
      });
    }
  }
  return { units, rows };
}
