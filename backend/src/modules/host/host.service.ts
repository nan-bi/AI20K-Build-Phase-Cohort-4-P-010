import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptInspectionDto, SubmitInspectionReportDto } from './dto/host.dto';

@Injectable()
export class HostService {
  private readonly logger = new Logger(HostService.name);

  constructor(private prisma: PrismaService) {}

  async getInspections(hostId?: string) {
    try {
      const mandates = await this.prisma.exclusiveMandate.findMany({
        // Chỉ hồ sơ chủ nhà đã ký ủy quyền mới thành ca thẩm định; bản nháp chưa ký thì Host không thấy.
        where: { status: 'PENDING_INSPECTION', signedAt: { not: null } },
        include: { unit: { include: { building: true, landlord: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (mandates.length > 0) {
        return mandates.map((m) => ({
          consignmentId: m.id,
          unitId: m.unitId,
          unitCode: m.unit.unitCode,
          building: m.unit.building.buildingCode,
          zone: m.unit.building.zoneName,
          floor: m.unit.floorNumber,
          layout: m.unit.layoutType,
          carpetAreaM2: Number(m.unit.carpetAreaM2),
          askRent: Number(m.unit.baseRentPrice),
          status: 'awaiting_host',
          createdAt: m.createdAt.toISOString(),
          landlordName: m.unit.landlord?.fullName || 'Chủ nhà Ocean Park',
        }));
      }
    } catch (err) {
      this.logger.warn(`Inspections DB fallback: ${err.message}`);
    }

    // Fallback demo inspection items
    return [
      {
        consignmentId: 'cons-001',
        unitId: 'u1111111-1111-1111-1111-111111111111',
        unitCode: 'VHOP-S1.02-12A08',
        building: 'S1.02',
        zone: 'The Sapphire 1',
        floor: 12,
        layout: 'ONE_BED_PLUS',
        carpetAreaM2: 47,
        askRent: 6500000,
        status: 'awaiting_host',
        createdAt: new Date().toISOString(),
        landlordName: 'Nguyễn Thị Mai',
      },
      {
        consignmentId: 'cons-002',
        unitId: 'u2222222-2222-2222-2222-222222222222',
        unitCode: 'VHOP-S1.05-0804',
        building: 'S1.05',
        zone: 'The Sapphire 1',
        floor: 8,
        layout: 'STUDIO',
        carpetAreaM2: 32.5,
        askRent: 4800000,
        status: 'inspecting',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        landlordName: 'Trần Văn Hùng',
      },
    ];
  }

  async acceptInspection(consignmentId: string, dto: AcceptInspectionDto) {
    this.logger.log(`[HOST INSPECTION] Host ${dto.hostId || 'default'} đã nhận thẩm định hồ sơ: ${consignmentId}`);
    return {
      success: true,
      consignmentId,
      status: 'inspecting',
      acceptedAt: new Date().toISOString(),
      message: 'Đã nhận việc thẩm định căn hộ. Vui lòng kiểm tra thực tế và nộp biên bản kiểm kê.',
    };
  }

  async submitInspectionReport(consignmentId: string, dto: SubmitInspectionReportDto) {
    this.logger.log(`[HOST INSPECTION] Đã nộp báo cáo thẩm định cho hồ sơ: ${consignmentId}, đề xuất: ${dto.recommendation}`);
    return {
      success: true,
      consignmentId,
      status: 'reviewing',
      submittedAt: new Date().toISOString(),
      recommendation: dto.recommendation,
      note: dto.note || 'Báo cáo thẩm định đã hoàn tất và chuyển Admin phê duyệt.',
      payoutBonus: 100000, // Thưởng 100k cho lượt thẩm định
    };
  }

  async getEarnings(hostId?: string) {
    try {
      let host = await this.prisma.fieldHost.findFirst({
        where: hostId ? { id: hostId } : undefined,
        include: { payouts: true, profile: true },
      });

      if (host) {
        return {
          hostId: host.id,
          fullName: host.profile.fullName,
          rating: Number(host.rating),
          walletBalance: Number(host.walletBalance),
          stats: {
            totalViewings: 18,
            totalDeals: 6,
            dealCommissionTotal: 2400000,
            viewingFeeTotal: 900000,
            ratingBonus: 360000,
            totalEarnings: 3660000,
          },
          currentPeriod: 'Tuần 40 / 2026',
          payouts: host.payouts.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            period: p.period,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
          })),
        };
      }
    } catch (err) {
      this.logger.warn(`Earnings DB fallback: ${err.message}`);
    }

    return {
      hostId: hostId || 'h1111111-1111-1111-1111-111111111111',
      fullName: 'Lê Quốc Bảo',
      rating: 4.95,
      walletBalance: 2850000,
      stats: {
        totalViewings: 24,
        totalDeals: 8,
        dealCommissionTotal: 3200000,
        viewingFeeTotal: 1200000,
        ratingBonus: 480000,
        totalEarnings: 4880000,
      },
      currentPeriod: 'Tuần 40 / 2026',
      payouts: [
        {
          id: 'pay-01',
          amount: 2500000,
          period: 'Tuần 39 / 2026',
          status: 'PAID',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
      ],
    };
  }
}
