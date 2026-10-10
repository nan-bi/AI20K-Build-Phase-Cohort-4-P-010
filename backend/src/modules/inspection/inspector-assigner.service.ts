import { Injectable } from '@nestjs/common';
import { HostRole, MandateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readConsignmentMeta } from '../landlord/landlord.mappers';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Chọn Inspector (Field Host vai `INSPECTOR`) nhận ca thẩm định lúc chủ nhà ký (hồ sơ 16, SPEC-P01 §1):
 * cùng phân khu, ÍT ca đang giữ nhất (`awaiting_host` + `inspecting`, đếm theo meta `hostId`), hoà ⇒ tạo sớm hơn.
 * Không có ai ⇒ null: ca vào Open Pool ngay (mọi Inspector thấy và `claim`).
 */
@Injectable()
export class InspectorAssigner {
  async pick(db: Db, zoneName: string) {
    const hosts = await db.fieldHost.findMany({
      where: {
        roles: { has: HostRole.INSPECTOR },
        assignedZone: { contains: zoneName },
        profile: { isPhoneVerified: true }, // chưa xác thực SĐT thì không `accept` được ⇒ không giao ca
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!hosts.length) return null;

    // Số hồ sơ ký gửi < vài trăm ⇒ đếm trong bộ nhớ từ meta (TODO(hồ sơ 12): cột hostId riêng).
    const open = await db.exclusiveMandate.findMany({
      where: { status: MandateStatus.PENDING_INSPECTION, signedAt: { not: null } },
      select: { doorAccessConfig: true },
    });
    const load = new Map<string, number>(hosts.map((h) => [h.id, 0]));
    for (const m of open) {
      const meta = readConsignmentMeta(m.doorAccessConfig);
      if (!meta?.hostId || (meta.stage !== 'awaiting_host' && meta.stage !== 'inspecting')) continue;
      if (load.has(meta.hostId)) load.set(meta.hostId, load.get(meta.hostId)! + 1);
    }

    // `hosts` đã sắp createdAt tăng dần ⇒ so sánh nghiêm (<) giữ người cũ hơn khi hoà.
    let best = hosts[0];
    for (const h of hosts) if (load.get(h.id)! < load.get(best.id)!) best = h;
    return best;
  }
}
