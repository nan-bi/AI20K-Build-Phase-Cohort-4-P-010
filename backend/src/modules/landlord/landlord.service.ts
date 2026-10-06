import { Injectable } from '@nestjs/common';
import { MandateStatus, UnitStatus } from '@prisma/client';
import { isConsigned } from './landlord.mappers';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tổng quan chủ nhà. Bản hiện tại lấy số liệu từ
 * phiên đăng nhập và bỏ dữ liệu mẫu cứng. Các màn còn lại nằm ở landlord-*.service.ts.
 */
@Injectable()
export class LandlordService {
  constructor(private readonly prisma: PrismaService) {}

  async getLandlordDashboard(landlordId: string) {
    const units = await this.prisma.unit.findMany({
      where: { landlordId },
      include: {
        building: true,
        mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
        deposits: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const listed = units.filter(isConsigned);

    return {
      effortMetrics: {
        travelDistanceKm: 0,
        viewingMinutesSpent: 0,
        summary: 'Chủ nhà ở nhà 100%! Toàn bộ quy trình dẫn khách, bảo quản mã khóa do Field Host phụ trách.',
      },
      portfolioSummary: {
        totalUnits: listed.length,
        holdingUnits: listed.filter((u) => u.status === UnitStatus.HOLDING).length,
        availableUnits: listed.filter((u) => u.status === UnitStatus.AVAILABLE).length,
        activeMandatesCount: listed.filter((u) => u.mandates[0]?.status === MandateStatus.ACTIVE).length,
      },
      units: listed.map((u) => ({
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
}
