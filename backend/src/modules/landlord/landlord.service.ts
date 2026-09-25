import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestExitMandateDto } from './dto/landlord.dto';
import { MandateStatus, UnitStatus } from '@prisma/client';

@Injectable()
export class LandlordService {
  private readonly logger = new Logger(LandlordService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getLandlordDashboard(landlordId?: string) {
    const where: any = {};
    if (landlordId) {
      where.landlordId = landlordId;
    }

    const units = await this.prisma.unit.findMany({
      where,
      include: {
        building: true,
        mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
        deposits: { orderBy: { createdAt: 'desc' }, take: 1 },
        viewings: { orderBy: { viewingSlot: 'desc' }, take: 5 },
      },
    });

    const activeMandates = units.flatMap((u) => u.mandates).filter((m) => m.status === MandateStatus.ACTIVE);

    return {
      effortMetrics: {
        travelDistanceKm: 0,
        viewingMinutesSpent: 0,
        summary: 'Chủ nhà ở nhà 100%! Toàn bộ quy trình dẫn khách, bảo quản mã khóa do Field Host phụ trách.',
      },
      portfolioSummary: {
        totalUnits: units.length,
        holdingUnits: units.filter((u) => u.status === UnitStatus.HOLDING).length,
        availableUnits: units.filter((u) => u.status === UnitStatus.AVAILABLE).length,
        activeMandatesCount: activeMandates.length,
      },
      units: units.map((u) => ({
        id: u.id,
        unitCode: u.unitCode,
        building: u.building.buildingCode,
        zone: u.building.zoneName,
        status: u.status,
        baseRentPrice: u.baseRentPrice,
        holdingDeposit: u.deposits[0]
          ? {
              amount: u.deposits[0].amount,
              paymentStatus: u.deposits[0].paymentStatus,
              expiresAt: u.deposits[0].expiresAt,
            }
          : null,
        mandate: u.mandates[0]
          ? {
              id: u.mandates[0].id,
              contractNumber: u.mandates[0].contractNumber,
              status: u.mandates[0].status,
              exitRequestedAt: u.mandates[0].exitRequestedAt,
              exitEffectiveAt: u.mandates[0].exitEffectiveAt,
            }
          : null,
      })),
    };
  }

  async getUnitDoorAuditTrail(unitId: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        building: true,
        viewings: {
          orderBy: { viewingSlot: 'desc' },
          include: {
            tickets: {
              include: { host: { include: { profile: true } } },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Không tìm thấy căn hộ');
    }

    // Lấy audit logs mở cửa từ DB
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityName: 'Unit',
        entityId: unit.id,
        actionType: 'DOOR_KEY_REVEAL',
      },
      orderBy: { createdAt: 'desc' },
      include: { actor: true },
    });

    return {
      unitCode: unit.unitCode,
      building: unit.building.buildingCode,
      auditRecords: auditLogs.map((log) => ({
        id: log.id,
        hostName: log.actor.fullName,
        timestamp: log.createdAt,
        action: 'Mở cửa xem phòng thực địa',
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
    };
  }

  async requestExitMandate(dto: RequestExitMandateDto, landlordId?: string) {
    const { mandateId, reason } = dto;

    const mandate = await this.prisma.exclusiveMandate.findUnique({
      where: { id: mandateId },
      include: { unit: true },
    });

    if (!mandate) {
      throw new NotFoundException('Không tìm thấy hợp đồng ủy quyền');
    }

    // Điều kiện tiên quyết bám sát SAD v2 §10.4:
    // Căn hộ phải ở trạng thái AVAILABLE (không HOLDING, không RENTED)
    if (mandate.unit.status !== UnitStatus.AVAILABLE) {
      throw new BadRequestException(
        `Không thể yêu cầu thoát ủy quyền: Căn hộ đang ở trạng thái [${mandate.unit.status}]. Chỉ được dừng ủy quyền khi nhà trống (AVAILABLE) và không có giao dịch cọc 7 ngày đang hiệu lực.`,
      );
    }

    const now = new Date();
    const exitEffectiveAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 ngày

    const updated = await this.prisma.exclusiveMandate.update({
      where: { id: mandateId },
      data: {
        status: MandateStatus.EXIT_REQUESTED,
        exitRequestedAt: now,
        exitEffectiveAt,
      },
    });

    // Ghi Audit Log
    await this.auditService.log({
      actorId: landlordId || mandate.unit.landlordId,
      actorRole: 'landlord',
      actionType: 'MANDATE_EXIT_15D_REQUESTED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
      newValue: {
        reason,
        exitRequestedAt: now.toISOString(),
        exitEffectiveAt: exitEffectiveAt.toISOString(),
      },
    });

    this.logger.log(
      `[15-DAY EXIT] Chủ nhà đã kích hoạt dừng ký gửi căn ${mandate.unit.unitCode}. Đếm ngược 15 ngày tới: ${exitEffectiveAt.toLocaleDateString(
        'vi-VN',
      )}. Sau 15 ngày mã cửa sẽ tự động xóa sạch khỏi hệ thống Host.`,
    );

    return {
      success: true,
      message: 'Kích hoạt yêu cầu dừng ký gửi 15 ngày thành công!',
      mandateStatus: updated.status,
      exitEffectiveAt,
      countdownDaysRemaining: 15,
      automationNotice:
        'Hệ thống tự động đếm ngược 15 ngày. Khi hết hạn, mã khóa cửa sẽ bị xóa hoàn toàn khỏi thiết bị của Field Host và xuất biên bản thanh lý gửi Zalo.',
    };
  }
}
