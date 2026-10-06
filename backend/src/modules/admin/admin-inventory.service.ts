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
        floorNumber: u.floorNumber,
        doorNumber: u.doorNumber,
        doorLockType: u.doorLockType,
        isVerified: u.isVerified,
        managementFee: Number(u.managementFee),
        createdAt: u.createdAt.toISOString(),
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

  async getExclusiveInventoryDetail(id: string, now: Date = new Date()) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const unit = await this.prisma.unit.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id }] : []),
          { unitCode: id },
          { mandates: { some: { id } } },
        ],
      },
      include: {
        building: true,
        landlord: { select: { id: true, fullName: true, email: true } },
        mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
        media: { orderBy: { order: 'asc' }, select: { id: true, url: true, category: true, verifiedAt: true } },
      },
    });
    if (!unit) throw new NotFoundException('Không tìm thấy căn hộ trong rổ hàng.');

    const mandate = unit.mandates[0];
    const effectiveAt = mandate?.exitEffectiveAt ?? null;
    const exitCountdownDays = effectiveAt
      ? Math.max(0, Math.ceil((effectiveAt.getTime() - now.getTime()) / DAY_MS))
      : null;
    const canTerminate = mandate?.status === 'EXIT_REQUESTED' &&
      unit.status !== 'HOLDING' &&
      effectiveAt !== null && effectiveAt <= now;

    return {
      id: unit.id,
      unitCode: unit.unitCode,
      building: unit.building.buildingCode,
      zone: unit.building.zoneName,
      floorNumber: unit.floorNumber,
      doorNumber: unit.doorNumber,
      layout: unit.layoutType,
      carpetAreaM2: Number(unit.carpetAreaM2),
      baseRentPrice: Number(unit.baseRentPrice),
      managementFee: Number(unit.managementFee),
      marketAvgPrice: Number(unit.marketAvgPrice),
      status: unit.status,
      isVerified: unit.isVerified,
      doorLockType: unit.doorLockType,
      landlord: unit.landlord,
      media: unit.media.map((photo) => ({ ...photo, verifiedAt: photo.verifiedAt.toISOString() })),
      mandate: mandate ? {
        id: mandate.id,
        contractNumber: mandate.contractNumber,
        status: mandate.status,
        signedAt: mandate.signedAt?.toISOString() ?? null,
        exitRequestedAt: mandate.exitRequestedAt?.toISOString() ?? null,
        exitEffectiveAt: effectiveAt?.toISOString() ?? null,
        exitCountdownDays,
        canTerminate,
      } : null,
    };
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
