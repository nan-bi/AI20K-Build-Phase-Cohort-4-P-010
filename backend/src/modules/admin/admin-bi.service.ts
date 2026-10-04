import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Ngưỡng cảnh báo heatmap: lấp đầy dưới 80% (đã chốt).
const OCCUPANCY_ALERT_THRESHOLD = 80;

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class AdminBiService {
  constructor(private readonly prisma: PrismaService) {}

  async getBiFunnelAndHeatmap() {
    const [booked, checkedIn, deposited, signed, completed, noShow, units] = await Promise.all([
      this.prisma.viewing.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.viewing.count({ where: { lobbyCheckInAt: { not: null } } }),
      this.prisma.holdingDeposit.count({ where: { paymentStatus: { in: ['PAID_HOLDING', 'CONVERTED_TO_CONTRACT'] } } }),
      this.prisma.contract.count({ where: { status: { in: ['ACTIVE', 'TERMINATED_SETTLED'] } } }),
      this.prisma.viewing.count({ where: { status: 'COMPLETED' } }),
      this.prisma.viewing.count({ where: { status: 'NO_SHOW' } }),
      this.prisma.unit.findMany({ include: { building: true } }),
    ]);

    const raw: Array<{ stage: string; count: number | null }> = [
      { stage: '1. Truy cập & All-in Calculator', count: null },
      { stage: '2. Quét AI Matchmaker 30s', count: null },
      { stage: '3. Đặt lịch OTP xác thực SĐT', count: booked },
      { stage: '4. Check-in 1-chạm Sảnh đón', count: checkedIn },
      { stage: '5. Quét VietQR Cọc 2M', count: deposited },
      { stage: '6. Ký Thỏa thuận & Hợp đồng số', count: signed },
    ];
    const stages = raw.map((s, i) => {
      const prev = i > 0 ? raw[i - 1].count : null;
      const dropRate =
        s.count === null || prev === null || prev === 0 ? null : round1(((prev - s.count) / prev) * 100);
      return { stage: s.stage, count: s.count, available: s.count !== null, dropRate };
    });

    const attended = completed + noShow;
    const funnel = {
      stages,
      noShowRate: attended === 0 ? null : round1((noShow / attended) * 100),
      avgDecisionTimeMinutes: null as number | null,
      avgDecisionTimeAvailable: false,
    };

    const byBuilding = new Map<string, { buildingCode: string; zone: string; total: number; rented: number }>();
    for (const u of units as any[]) {
      const code = u.building.buildingCode;
      const row = byBuilding.get(code) ?? { buildingCode: code, zone: u.building.zoneName, total: 0, rented: 0 };
      row.total += 1;
      if (u.status === 'RENTED') row.rented += 1;
      byBuilding.set(code, row);
    }
    const occupancyHeatmap = [...byBuilding.values()]
      .sort((a, b) => a.buildingCode.localeCompare(b.buildingCode))
      .map((b) => {
        const occupancyRate = round1((b.rented / b.total) * 100);
        return {
          ...b,
          occupancyRate,
          alert: occupancyRate < OCCUPANCY_ALERT_THRESHOLD ? 'ATTENTION_NEEDED' : 'NORMAL',
        };
      });

    const count = (s: string) => (units as any[]).filter((u) => u.status === s).length;
    return {
      funnel,
      occupancyHeatmap,
      portfolioStatus: {
        totalUnits: units.length,
        rentedUnits: count('RENTED'),
        holdingUnits: count('HOLDING'),
        availableUnits: count('AVAILABLE'),
      },
    };
  }
}
