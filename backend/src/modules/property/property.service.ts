import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyFilterDto } from './dto/property-query.dto';
import { LayoutType, UnitStatus, ViewingStatus } from '@prisma/client';
import {
  toTenantUnit,
  ZONE_BUILDINGS,
} from '../tenant/tenant.mappers';
import { TenantUnit } from '../tenant/tenant.types';
import { generateAllSlotsBetween } from '../tenant/slots.helper';

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Tính toán All-in Cost (phục vụ Matchmaker AI và bộ so sánh chi phí).
   */
  calculateAllInCost(unit: any, motorbikes = 1, cars = 0, occupants = 2) {
    const baseRent = Number(unit.baseRentPrice);
    const carpetArea = Number(unit.carpetAreaM2);
    const managementFee = Math.round(carpetArea * 9500);
    const parkingFee = motorbikes * 150000 + cars * 1250000;
    const utilityCost = occupants * 300000;
    const allInTotal = baseRent + managementFee + parkingFee + utilityCost;

    const marketAvg = Number(unit.marketAvgPrice);
    const marketAllInEstimate = marketAvg + managementFee + parkingFee + utilityCost;
    const savingAmount = Math.max(0, marketAllInEstimate - allInTotal);
    const savingPercentage =
      marketAllInEstimate > 0 ? Math.round((savingAmount / marketAllInEstimate) * 100) : 0;
    const isBargain = savingPercentage >= 10;

    return {
      breakdown: {
        baseRent,
        managementFee,
        parkingFee,
        utilityCost,
        allInTotal,
      },
      comparison: {
        marketAvgPrice: marketAvg,
        marketAllInEstimate,
        savingAmount,
        savingPercentage,
        isBargain,
        badgeText: isBargain ? `🔥 CĂN HỜI PHÂN KHU (-${savingPercentage}%)` : null,
      },
    };
  }

  async getBuildings() {
    return this.prisma.building.findMany({
      orderBy: { buildingCode: 'asc' },
      include: { _count: { select: { units: true } } },
    });
  }

  /**
   * A1: Catalog công khai (AVAILABLE hoặc HOLDING, isVerified=true, có ảnh).
   * Lọc: zone, layout, maxRent, q. Sắp xếp baseRentPrice asc.
   */
  async getUnits(filter: PropertyFilterDto): Promise<TenantUnit[]> {
    const { zone, layout, maxRent, q, buildingCode, layoutType, status } = filter;

    const where: any = {
      isVerified: true,
      status: { in: [UnitStatus.AVAILABLE, UnitStatus.HOLDING] },
      media: { some: { url: { startsWith: '/' } } }, // chỉ căn có ảnh nội bộ (Listing Verified, không ảnh stock ngoài)
    };

    if (status && ([UnitStatus.AVAILABLE, UnitStatus.HOLDING] as UnitStatus[]).includes(status)) {
      where.status = status;
    }

    if (zone && ZONE_BUILDINGS[zone]) {
      where.building = { buildingCode: { in: ZONE_BUILDINGS[zone] } };
    } else if (buildingCode) {
      where.building = { buildingCode };
    }

    if (layout) {
      switch (layout) {
        case 'Studio':
          where.layoutType = LayoutType.STUDIO;
          break;
        case '1PN':
          where.layoutType = LayoutType.ONE_BED_PLUS;
          break;
        case '2PN':
          where.layoutType = { in: [LayoutType.TWO_BED_ONE_BATH, LayoutType.TWO_BED_TWO_BATH] };
          break;
        case '3PN':
          where.layoutType = LayoutType.THREE_BED;
          break;
      }
    } else if (layoutType) {
      where.layoutType = layoutType;
    }

    if (maxRent) {
      where.baseRentPrice = { lte: Number(maxRent) };
    }

    if (q && q.trim()) {
      const keyword = q.trim();
      where.OR = [
        { unitCode: { contains: keyword, mode: 'insensitive' } },
        { title: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const units = await this.prisma.unit.findMany({
      where,
      include: {
        building: true,
        media: { orderBy: { order: 'asc' } },
      },
      orderBy: { baseRentPrice: 'asc' },
    });

    const unitIds = units.map((u) => u.id);
    if (unitIds.length === 0) {
      return [];
    }

    // Tính mốc ngày hôm nay theo giờ VN để tìm activeViewing sớm nhất
    const nowUtc = new Date();
    const vnTime = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
    const startOfDayVn = new Date(
      Date.UTC(vnTime.getUTCFullYear(), vnTime.getUTCMonth(), vnTime.getUTCDate(), -7, 0, 0, 0),
    );
    const endOfDayVn = new Date(startOfDayVn.getTime() + 24 * 60 * 60 * 1000);

    const [activeViewings, interestGroups, feeConfig] = await Promise.all([
      this.prisma.viewing.findMany({
        where: {
          unitId: { in: unitIds },
          status: {
            in: [
              ViewingStatus.CONFIRMED,
              ViewingStatus.LOBBY,
              ViewingStatus.RECEIVING,
              ViewingStatus.VIEWING,
            ],
          },
          viewingSlot: { gte: startOfDayVn, lt: endOfDayVn },
        },
        orderBy: { viewingSlot: 'asc' },
      }),
      this.prisma.viewing.groupBy({
        by: ['unitId'],
        where: {
          unitId: { in: unitIds },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      }),
      this.prisma.feeConfig.findUnique({
        where: { configKey: 'hold_hours_default' },
      }),
    ]);

    const activeMap = new Map<string, string>();
    for (const v of activeViewings) {
      if (!activeMap.has(v.unitId)) {
        activeMap.set(v.unitId, v.viewingSlot.toISOString());
      }
    }

    const interestMap = new Map<string, number>();
    for (const ig of interestGroups) {
      interestMap.set(ig.unitId, ig._count.id);
    }

    const defaultHold = feeConfig ? Number(feeConfig.paramValue) : 48;

    return units.map((u) => {
      const activeSlot = activeMap.get(u.id) || null;
      const interest = interestMap.get(u.id) || 0;
      const rawHours = u.holdHoursOverride ?? defaultHold;
      const holdHours = Math.min(72, Math.max(12, rawHours));
      return toTenantUnit(u, activeSlot, holdHours, interest);
    });
  }

  /**
   * A2: Chi tiết căn hộ công khai (chấp nhận unitCode hoa/thường hoặc UUID).
   */
  async getUnitByCode(code: string): Promise<TenantUnit> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

    const unit = await this.prisma.unit.findFirst({
      where: {
        OR: [
          { unitCode: { equals: code, mode: 'insensitive' } },
          ...(isUuid ? [{ id: code }] : []),
        ],
        isVerified: true,
        status: { in: [UnitStatus.AVAILABLE, UnitStatus.HOLDING] },
        media: { some: { url: { startsWith: '/' } } }, // chỉ căn có ảnh nội bộ (Listing Verified, không ảnh stock ngoài)
      },
      include: {
        building: true,
        media: { orderBy: { order: 'asc' } },
      },
    });

    if (!unit) {
      throw new NotFoundException({
        message: 'Không tìm thấy căn hộ hoặc căn hộ không còn khả dụng.',
        code: 'unit_not_found',
      });
    }

    // Active viewing hôm nay
    const nowUtc = new Date();
    const vnTime = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
    const startOfDayVn = new Date(
      Date.UTC(vnTime.getUTCFullYear(), vnTime.getUTCMonth(), vnTime.getUTCDate(), -7, 0, 0, 0),
    );
    const endOfDayVn = new Date(startOfDayVn.getTime() + 24 * 60 * 60 * 1000);

    const [activeViewing, interestCount, feeConfig] = await Promise.all([
      this.prisma.viewing.findFirst({
        where: {
          unitId: unit.id,
          status: {
            in: [
              ViewingStatus.CONFIRMED,
              ViewingStatus.LOBBY,
              ViewingStatus.RECEIVING,
              ViewingStatus.VIEWING,
            ],
          },
          viewingSlot: { gte: startOfDayVn, lt: endOfDayVn },
        },
        orderBy: { viewingSlot: 'asc' },
      }),
      this.prisma.viewing.count({
        where: {
          unitId: unit.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.feeConfig.findUnique({
        where: { configKey: 'hold_hours_default' },
      }),
    ]);

    const defaultHold = feeConfig ? Number(feeConfig.paramValue) : 48;
    const rawHours = unit.holdHoursOverride ?? defaultHold;
    const holdHours = Math.min(72, Math.max(12, rawHours));

    return toTenantUnit(
      unit,
      activeViewing ? activeViewing.viewingSlot.toISOString() : null,
      holdHours,
      interestCount,
    );
  }

  /**
   * A3: Danh sách các khung giờ bận của căn hộ trong khoảng [from, to] (tối đa 14 ngày).
   * Căn HOLDING => toàn bộ slot đều bận.
   */
  async getBusySlots(code: string, fromStr?: string, toStr?: string): Promise<{ slots: string[] }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

    const unit = await this.prisma.unit.findFirst({
      where: {
        OR: [
          { unitCode: { equals: code, mode: 'insensitive' } },
          ...(isUuid ? [{ id: code }] : []),
        ],
        isVerified: true,
        status: { in: [UnitStatus.AVAILABLE, UnitStatus.HOLDING] },
        media: { some: { url: { startsWith: '/' } } }, // chỉ căn có ảnh nội bộ (Listing Verified, không ảnh stock ngoài)
      },
    });

    if (!unit) {
      throw new NotFoundException({
        message: 'Không tìm thấy căn hộ hoặc căn hộ không còn khả dụng.',
        code: 'unit_not_found',
      });
    }

    const from = fromStr ? new Date(fromStr) : new Date();
    const to = toStr ? new Date(toStr) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException({
        message: 'Khoảng thời gian tra cứu không hợp lệ.',
        code: 'invalid_request',
      });
    }

    const diffMs = to.getTime() - from.getTime();
    if (diffMs > 14 * 24 * 60 * 60 * 1000 + 60000) {
      throw new BadRequestException({
        message: 'Khoảng thời gian tra cứu tối đa 14 ngày.',
        code: 'invalid_request',
      });
    }

    if (unit.status === UnitStatus.HOLDING) {
      const allSlots = generateAllSlotsBetween(from, to);
      return { slots: allSlots };
    }

    const viewings = await this.prisma.viewing.findMany({
      where: {
        unitId: unit.id,
        viewingSlot: { gte: from, lte: to },
        status: {
          in: [
            ViewingStatus.PENDING_CONFIRMATION,
            ViewingStatus.CONFIRMED,
            ViewingStatus.LOBBY,
            ViewingStatus.RECEIVING,
            ViewingStatus.VIEWING,
            ViewingStatus.CLOSING,
          ],
        },
      },
      orderBy: { viewingSlot: 'asc' },
    });

    return {
      slots: viewings.map((v) => v.viewingSlot.toISOString()),
    };
  }

  /**
   * Phương thức tương thích ngược cho matchmaker / legacy caller.
   */
  async getUnitById(id: string, motorbikes = 1, cars = 0, occupants = 2) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const unit = await this.prisma.unit.findFirst({
      where: {
        OR: [{ id: isUuid ? id : undefined }, { unitCode: { equals: id, mode: 'insensitive' } }].filter(Boolean) as any,
      },
      include: {
        building: true,
        media: { orderBy: { order: 'asc' } },
      },
    });

    if (!unit) {
      throw new NotFoundException({
        message: 'Không tìm thấy căn hộ.',
        code: 'unit_not_found',
      });
    }

    const cost = this.calculateAllInCost(unit, motorbikes, cars, occupants);
    return {
      ...unit,
      allInCost: cost.breakdown,
      costComparison: cost.comparison,
      verifiedBadge: {
        isVerified: unit.isVerified,
        timestamp: unit.updatedAt,
        label: 'VERIFIED 100% HIỆN TRƯỜNG',
      },
    };
  }
}
