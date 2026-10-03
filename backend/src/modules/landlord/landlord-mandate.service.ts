import { ConflictException, Injectable } from '@nestjs/common';
import { MandateStatus, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LandlordAccessService } from './landlord-access.service';
import { CancelExitMandateDto, RequestExitMandateDto } from './dto/landlord.dto';
import { EXIT_NOTICE_DAYS } from './landlord.mappers';

const UNIT_STATUS_VN: Record<UnitStatus, string> = {
  AVAILABLE: 'đang trống',
  HOLDING: 'đang được khách giữ chỗ',
  RENTED: 'đang cho thuê',
  UNLISTED: 'chưa niêm yết',
  MAINTENANCE: 'đang bảo trì',
};

/** Thoát ủy quyền linh hoạt: chỉ khi căn trống, báo trước 15 ngày (legal/01 Điều 8). */
@Injectable()
export class LandlordMandateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LandlordAccessService,
    private readonly audit: AuditService,
  ) {}

  async requestExit(landlordId: string, dto: RequestExitMandateDto, now = new Date()) {
    const mandate = await this.access.ownedMandate(landlordId, dto.mandateId);
    if (mandate.status !== MandateStatus.ACTIVE) {
      throw new ConflictException(
        mandate.status === MandateStatus.EXIT_REQUESTED
          ? 'Ủy quyền này đã có yêu cầu thoát đang đếm ngược.'
          : 'Chỉ ủy quyền đang hiệu lực mới thoát được.',
      );
    }
    if (mandate.unit.status !== UnitStatus.AVAILABLE) {
      throw new ConflictException(
        `Căn ${UNIT_STATUS_VN[mandate.unit.status]} nên chưa thể thoát ủy quyền — chỉ thoát được khi căn trống.`,
      );
    }

    const exitEffectiveAt = new Date(now.getTime() + EXIT_NOTICE_DAYS * 86_400_000);
    await this.prisma.exclusiveMandate.update({
      where: { id: mandate.id },
      data: { status: MandateStatus.EXIT_REQUESTED, exitRequestedAt: now, exitEffectiveAt },
    });
    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'MANDATE_EXIT_REQUESTED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
      newValue: { reason: dto.reason, exitEffectiveAt: exitEffectiveAt.toISOString() },
    });

    return {
      mandateId: mandate.id,
      unitId: mandate.unitId,
      status: 'exiting' as const,
      exitRequestedAt: now,
      exitEffectiveAt,
      countdownDays: EXIT_NOTICE_DAYS,
    };
  }

  async cancelExit(landlordId: string, dto: CancelExitMandateDto) {
    const mandate = await this.access.ownedMandate(landlordId, dto.mandateId);
    if (mandate.status !== MandateStatus.EXIT_REQUESTED) {
      throw new ConflictException('Ủy quyền này không có yêu cầu thoát để hủy.');
    }
    await this.prisma.exclusiveMandate.update({
      where: { id: mandate.id },
      data: { status: MandateStatus.ACTIVE, exitRequestedAt: null, exitEffectiveAt: null },
    });
    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'MANDATE_EXIT_CANCELLED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
    });
    return { mandateId: mandate.id, unitId: mandate.unitId, status: 'active' as const };
  }
}
