import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminActor } from './admin-fee.service';

const DAY_MS = 86_400_000;
// Hợp đồng còn hiệu lực/đang xử lý chặn việc chấm dứt mandate (SAD_v2 §10.4).
const BLOCKING_CONTRACT_STATUSES = ['ACTIVE', 'AWAITING_TENANT_SIGN', 'AWAITING_LANDLORD_SIGN', 'DISPUTED'];

@Injectable()
export class AdminInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getExclusiveInventory(now: Date = new Date()) {
    const units: any[] = await this.prisma.unit.findMany({
      include: {
        building: true,
        landlord: true,
        mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return units.map((u) => {
      const m = u.mandates[0];
      const effective: Date | null = m?.exitEffectiveAt ? new Date(m.exitEffectiveAt) : null;
      let blocked: string | null = null;
      if (m?.status !== 'EXIT_REQUESTED') blocked = 'MANDATE_NOT_EXIT_REQUESTED';
      else if (u.status === 'HOLDING') blocked = 'UNIT_HOLDING';
      else if (!effective || effective.getTime() > now.getTime()) blocked = 'EXIT_NOTICE_NOT_ELAPSED';

      return {
        id: u.id,
        unitCode: u.unitCode,
        building: u.building.buildingCode,
        zone: u.building.zoneName,
        layout: u.layoutType,
        carpetAreaM2: Number(u.carpetAreaM2),
        baseRentPrice: Number(u.baseRentPrice),
        status: u.status,
        landlordName: u.landlord?.fullName || null,
        mandateStatus: m?.status || 'NONE',
        exitCountdownDays: effective
          ? Math.max(0, Math.ceil((effective.getTime() - now.getTime()) / DAY_MS))
          : null,
        mandateId: m?.id ?? null,
        exitRequestedAt: m?.exitRequestedAt ? new Date(m.exitRequestedAt).toISOString() : null,
        exitEffectiveAt: effective ? effective.toISOString() : null,
        canTerminate: blocked === null,
        terminateBlockedReason: blocked,
      };
    });
  }

  async terminateMandate(id: string, reason: string, actor: AdminActor, now: Date = new Date()) {
    const why = (reason ?? '').trim();
    if (!why) throw new BadRequestException('Bắt buộc nhập lý do chấm dứt ủy quyền.');

    return this.prisma.$transaction(async (tx: any) => {
      const mandate = await tx.exclusiveMandate.findUnique({ where: { id } });
      if (!mandate) throw new NotFoundException('Không tìm thấy hợp đồng ủy quyền.');
      if (mandate.status !== 'EXIT_REQUESTED') {
        throw new ConflictException('Chỉ chấm dứt được ủy quyền đang ở trạng thái EXIT_REQUESTED.');
      }
      if (!mandate.exitEffectiveAt || new Date(mandate.exitEffectiveAt).getTime() > now.getTime()) {
        throw new ConflictException('Chưa đủ 15 ngày báo trước thoát ủy quyền.');
      }

      const unit = await tx.unit.findUnique({ where: { id: mandate.unitId } });
      if (!unit) throw new NotFoundException('Không tìm thấy căn hộ của ủy quyền.');
      if (unit.status === 'HOLDING') {
        throw new ConflictException('Căn đang HOLDING (có cọc giữ chỗ), không thể chấm dứt ủy quyền.');
      }
      const blocking = await tx.contract.count({
        where: { unitId: unit.id, status: { in: BLOCKING_CONTRACT_STATUSES } },
      });
      if (blocking > 0) {
        throw new ConflictException('Căn có hợp đồng thuê đang hiệu lực/đang xử lý, không thể chấm dứt ủy quyền.');
      }

      const oldValue = { status: mandate.status, unitStatus: unit.status };
      await tx.exclusiveMandate.update({ where: { id }, data: { status: 'TERMINATED' } });
      await tx.unit.update({ where: { id: unit.id }, data: { status: 'UNLISTED' } });
      await this.audit.log({
        actorId: actor.id,
        actorRole: actor.role,
        actionType: 'MANDATE_TERMINATED_BY_ADMIN',
        entityName: 'ExclusiveMandate',
        entityId: id,
        oldValue,
        newValue: { status: 'TERMINATED', unitStatus: 'UNLISTED', reason: why },
      });
      return { mandateId: id, unitId: unit.id, status: 'TERMINATED', unitStatus: 'UNLISTED' };
    });
  }
}
