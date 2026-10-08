import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PropertyService } from '../property/property.service';
import { MatchmakerRequestDto } from './dto/matchmaker-request.dto';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class MatchmakerService {
  private readonly logger = new Logger(MatchmakerService.name);

  constructor(
    private prisma: PrismaService,
    private propertyService: PropertyService,
  ) {}

  async findTopRecommendations(dto: MatchmakerRequestDto) {
    const startTime = Date.now();
    const { maxAllInBudget, preferredLayout, motorbikes = 1, cars = 0, occupants = 2, limit = 3 } = dto;

    // 1. Quét toàn bộ rổ hàng AVAILABLE thông qua PropertyService
    const availableUnits = await this.propertyService.getUnits({
      layoutType: preferredLayout,
      status: UnitStatus.AVAILABLE,
      motorbikes,
      cars,
      occupants,
    });

    const totalScanned = availableUnits.length;
    const enrichedUnits = availableUnits.map((item) => {
      const baseRent = Number(item.rent);
      const managementFee = Number(item.managementFee);
      const parkingFee = motorbikes * 150000 + cars * 1250000;
      const utilityCost = occupants * 300000;
      const allInTotal = baseRent + managementFee + parkingFee + utilityCost;
      const marketAllInEstimate = Number(item.marketAvg) + managementFee + parkingFee + utilityCost;
      const savingAmount = Math.max(0, marketAllInEstimate - allInTotal);
      const savingPercentage = marketAllInEstimate > 0 ? Math.round((savingAmount / marketAllInEstimate) * 100) : 0;
      return {
        ...item,
        allInCost: { baseRent, managementFee, parkingFee, utilityCost, allInTotal },
        costComparison: {
          marketAllInEstimate,
          savingAmount,
          savingPercentage,
          isBargain: savingPercentage >= 10,
        },
      };
    });

    // 2. Lọc cứng theo trần ngân sách All-in (Hard Constraints)
    const eligibleUnits = enrichedUnits.filter((item) => item.allInCost.allInTotal <= maxAllInBudget);

    const eliminatedCount = totalScanned - eligibleUnits.length;

    // 3. Xếp hạng Ranking (Ưu tiên mức tiết kiệm so với thị trường + độ tin cậy)
    eligibleUnits.sort((a: any, b: any) => {
      // Ưu tiên tỷ lệ tiết kiệm %
      const diffSaving = b.costComparison.savingPercentage - a.costComparison.savingPercentage;
      if (diffSaving !== 0) return diffSaving;
      // Nếu bằng nhau, ưu tiên giá All-in thấp hơn
      return a.allInCost.allInTotal - b.allInCost.allInTotal;
    });

    const top3 = eligibleUnits.slice(0, limit).map((item: any, index: number) => {
      const savingMonthly = item.costComparison.savingAmount;
      return {
        rank: index + 1,
        unitId: item.id,
        unitCode: item.code,
        buildingCode: item.building,
        zoneName: item.zoneName,
        layoutType: item.layout,
        carpetAreaM2: item.areaM2,
        allInCost: item.allInCost,
        comparison: item.costComparison,
        aiExplanation: `Căn ${item.code} giúp bạn tiết kiệm ${savingMonthly.toLocaleString('vi-VN')} đ/tháng (${item.costComparison.savingPercentage}%) so với giá thuê tham chiếu cùng phân khu ${item.zoneName}, bao gồm toàn bộ phí BQL và định mức sinh hoạt.`,
        verifiedImages: item.photos,
      };
    });

    const executionTimeMs = Date.now() - startTime;

    return {
      scanSummary: {
        totalScannedUnits: totalScanned,
        eliminatedUnits: eliminatedCount,
        matchedUnits: top3.length,
        totalMatched: eligibleUnits.length, // số căn khớp trước khi cắt theo limit
        executionTimeSeconds: (executionTimeMs / 1000).toFixed(2),
      },
      topRecommendations: top3,
    };
  }
}
