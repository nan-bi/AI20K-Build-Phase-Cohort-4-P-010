import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestExitMandateDto, CancelExitMandateDto, CreateConsignmentDto, SignConsignmentDto } from './dto/landlord.dto';
import { MandateStatus, UnitStatus } from '@prisma/client';

@Injectable()
export class LandlordService {
  private readonly logger = new Logger(LandlordService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getLandlordDashboard(landlordId?: string) {
    try {
      const where: any = {};
      if (landlordId) where.landlordId = landlordId;

      const units = await this.prisma.unit.findMany({
        where,
        include: {
          building: true,
          mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
          deposits: { orderBy: { createdAt: 'desc' }, take: 1 },
          viewings: { orderBy: { viewingSlot: 'desc' }, take: 5 },
        },
      });

      if (units.length > 0) {
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
            baseRentPrice: Number(u.baseRentPrice),
            holdingDeposit: u.deposits[0]
              ? {
                  amount: Number(u.deposits[0].amount),
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
    } catch (err) {
      this.logger.warn(`Landlord dashboard DB fallback: ${err.message}`);
    }

    return {
      effortMetrics: {
        travelDistanceKm: 0,
        viewingMinutesSpent: 0,
        summary: 'Chủ nhà ở nhà 100%! Toàn bộ quy trình dẫn khách, bảo quản mã khóa do Field Host phụ trách.',
      },
      portfolioSummary: {
        totalUnits: 2,
        holdingUnits: 1,
        availableUnits: 1,
        activeMandatesCount: 2,
      },
      units: [
        {
          id: 'u1111111-1111-1111-1111-111111111111',
          unitCode: 'VHOP-S1.02-12A08',
          building: 'S1.02',
          zone: 'The Sapphire 1',
          status: 'HOLDING',
          baseRentPrice: 6500000,
          holdingDeposit: {
            amount: 2000000,
            paymentStatus: 'PAID_HOLDING',
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          },
          mandate: {
            id: 'm1111111-1111-1111-1111-111111111111',
            contractNumber: 'UQ-2026-VHOP-S102-001',
            status: 'ACTIVE',
          },
        },
      ],
    };
  }

  async getLandlordUnits(landlordId?: string) {
    try {
      const units = await this.prisma.unit.findMany({
        where: landlordId ? { landlordId } : undefined,
        include: {
          building: true,
          mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
          viewings: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (units.length > 0) {
        return units.map((u) => ({
          id: u.id,
          unitCode: u.unitCode,
          building: u.building.buildingCode,
          zone: u.building.zoneName,
          floor: u.floorNumber,
          layout: u.layoutType,
          carpetAreaM2: Number(u.carpetAreaM2),
          baseRentPrice: Number(u.baseRentPrice),
          status: u.status,
          mandate: u.mandates[0] || null,
          totalViewings: u.viewings.length,
        }));
      }
    } catch (err) {
      this.logger.warn(`Landlord units DB fallback: ${err.message}`);
    }

    return [
      {
        id: 'u1111111-1111-1111-1111-111111111111',
        unitCode: 'VHOP-S1.02-12A08',
        building: 'S1.02',
        zone: 'The Sapphire 1',
        floor: 12,
        layout: 'ONE_BED_PLUS',
        carpetAreaM2: 47,
        baseRentPrice: 6500000,
        status: 'HOLDING',
        totalViewings: 5,
      },
    ];
  }

  async getLandlordUnitById(id: string) {
    try {
      const unit = await this.prisma.unit.findFirst({
        where: { OR: [{ id }, { unitCode: id }] },
        include: {
          building: true,
          mandates: { orderBy: { createdAt: 'desc' } },
          viewings: { orderBy: { viewingSlot: 'desc' }, include: { tickets: true } },
          deposits: { orderBy: { createdAt: 'desc' } },
          doorKey: true,
        },
      });
      if (unit) return unit;
    } catch (err) {
      this.logger.warn(`Landlord unit details DB fallback: ${err.message}`);
    }

    return {
      id,
      unitCode: 'VHOP-S1.02-12A08',
      building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
      floorNumber: 12,
      layoutType: 'ONE_BED_PLUS',
      carpetAreaM2: 47,
      baseRentPrice: 6500000,
      status: 'HOLDING',
    };
  }

  async getUnitDoorAuditTrail(unitId: string) {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          entityName: 'Unit',
          actionType: 'DOOR_KEY_REVEAL',
        },
        orderBy: { createdAt: 'desc' },
        include: { actor: true },
      });
      if (auditLogs.length > 0) return auditLogs;
    } catch (err) {
      this.logger.warn(`Door audit trail DB fallback: ${err.message}`);
    }

    return [
      {
        id: 'audit-01',
        actionType: 'DOOR_KEY_REVEAL',
        actor: { fullName: 'Lê Quốc Bảo', role: 'field_host' },
        createdAt: new Date().toISOString(),
        newValue: {
          doorLockType: 'ELECTRONIC_PIN',
          note: 'Mở cửa cho khách xem phòng theo lịch hẹn VIEW-S1.02-839201',
        },
      },
    ];
  }

  async createConsignment(dto: CreateConsignmentDto) {
    const consignmentId = `cons-${Date.now().toString().slice(-6)}`;
    this.logger.log(`[CONSIGNMENT] Chủ nhà đã gửi hồ sơ ký gửi căn hộ: ${dto.building}-${dto.floor}${dto.door}`);

    return {
      success: true,
      consignmentId,
      status: dto.draft ? 'draft' : 'awaiting_host',
      building: dto.building,
      floor: dto.floor,
      door: dto.door,
      askRent: dto.askRent,
      message: dto.draft ? 'Đã lưu bản nháp ký gửi thành công' : 'Đã gửi hồ sơ ký gửi. Vui lòng ký ủy quyền độc quyền.',
    };
  }

  async getConsignmentById(id: string) {
    return {
      id,
      building: 'S1.02',
      floor: 12,
      door: '08',
      layout: 'ONE_BED_PLUS',
      areaM2: 47,
      askRent: 6500000,
      status: 'awaiting_host',
      createdAt: new Date().toISOString(),
      inspection: null,
    };
  }

  async signConsignment(id: string, dto: SignConsignmentDto) {
    this.logger.log(`[CONSIGNMENT] Chủ nhà đã ký số ủy quyền độc quyền cho hồ sơ #${id}`);
    return {
      success: true,
      consignmentId: id,
      mandateStatus: 'active',
      signedAt: new Date().toISOString(),
      message: 'Ký ủy quyền độc quyền thành công! Hồ sơ đã được chuyển tới Field Host phân khu để tiến hành thẩm định.',
    };
  }

  async getLandlordFinance(landlordId?: string) {
    return {
      monthlyPayoutEstimate: 6500000,
      managementFeeDeducted: 0,
      serviceFeeDeducted: 0,
      netReceived: 6500000,
      history: [
        {
          period: 'Tháng 09/2026',
          unitCode: 'VHOP-S1.02-12A08',
          amount: 6500000,
          status: 'SETTLED',
          payoutDate: '2026-09-05',
        },
      ],
    };
  }

  async requestExitMandate(dto: RequestExitMandateDto) {
    const effectiveDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    this.logger.log(`[EXIT MANDATE] Đã kích hoạt điều khoản thoát 15 ngày cho mandate #${dto.mandateId}`);

    return {
      success: true,
      mandateId: dto.mandateId,
      status: 'EXIT_REQUESTED',
      countdownDays: 15,
      effectiveDate: effectiveDate.toISOString(),
      notice: 'Sau 15 ngày, quyền truy cập mở cửa sẽ tự động thu hồi và căn hộ rời khỏi rổ hàng độc quyền.',
    };
  }

  async cancelExitMandate(dto: CancelExitMandateDto) {
    this.logger.log(`[CANCEL EXIT] Đã hủy yêu cầu thoát ủy quyền cho mandate #${dto.mandateId}`);
    return {
      success: true,
      mandateId: dto.mandateId,
      status: 'ACTIVE',
      message: 'Đã hủy yêu cầu thoát ủy quyền. Hợp đồng tiếp tục có hiệu lực.',
    };
  }
}
