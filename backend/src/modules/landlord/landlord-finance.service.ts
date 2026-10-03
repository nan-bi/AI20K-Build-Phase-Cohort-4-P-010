import { Injectable } from '@nestjs/common';
import { ContractStatus, DepositStatus, MandateStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LandlordFeeService } from './landlord-fee.service';
import { isConsigned, lastMonths, toUiUnitStatus } from './landlord.mappers';

const HISTORY_MONTHS = 6;

/**
 * Khoản thu của chủ nhà, tính từ HỢP ĐỒNG THUÊ (hệ thống chưa có sổ thu tiền thực tế theo tháng):
 * một tháng được tính là có thu khi hợp đồng còn hiệu lực trong tháng đó.
 * Tỷ lệ phí dịch vụ lấy từ FeeConfig `landlord_service_fee_rate` (Admin cấu hình, legal/01 Điều 6 để mở);
 * chưa cấu hình thì dùng mặc định và báo `feeSource: 'default'` để UI nói rõ đây là mức tạm.
 */
@Injectable()
export class LandlordFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: LandlordFeeService,
  ) {}

  async getFinance(landlordId: string, now = new Date()) {
    const [fee, units, contracts, deposits] = await Promise.all([
      this.fees.get(),
      this.prisma.unit.findMany({
        where: { landlordId },
        include: { building: true, mandates: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.contract.findMany({
        where: { landlordId, status: { in: [ContractStatus.ACTIVE, ContractStatus.TERMINATED_SETTLED] } },
      }),
      this.prisma.holdingDeposit.findMany({
        where: { unit: { landlordId }, paymentStatus: DepositStatus.PAID_HOLDING },
        select: { unitId: true, amount: true },
      }),
    ]);

    const feeOf = fee.of;

    const months = lastMonths(HISTORY_MONTHS, now);
    const history = months.map((m) => {
      const gross = contracts
        .filter((c) => c.startDate <= m.end && c.endDate >= m.start)
        .reduce((sum, c) => sum + Number(c.monthlyRentPrice), 0);
      return { month: m.key, label: m.label, gross, fee: feeOf(gross), net: gross - feeOf(gross) };
    });
    const current = history[history.length - 1];

    const activeByUnit = new Map(
      contracts.filter((c) => c.status === ContractStatus.ACTIVE).map((c) => [c.unitId, c]),
    );
    const holdByUnit = new Map(deposits.map((d) => [d.unitId, Number(d.amount)]));

    const perUnit = units
      .filter(isConsigned)
      .map((u) => {
        const lease = activeByUnit.get(u.id);
        const rent = lease ? Number(lease.monthlyRentPrice) : 0;
        return {
          unitId: u.id,
          unitCode: u.unitCode,
          building: u.building.buildingCode,
          status: toUiUnitStatus(u.status, false),
          rent,
          fee: feeOf(rent),
          net: rent - feeOf(rent),
          // Cọc đang giữ hộ: cọc bảo đảm của HĐ đang chạy, hoặc 2tr cọc giữ chỗ nếu chưa ký HĐ.
          escrow: lease ? Number(lease.securityDepositAmount) : (holdByUnit.get(u.id) ?? 0),
        };
      });

    return {
      serviceFeePercent: fee.percent,
      feeSource: fee.source,
      thisMonth: { gross: current.gross, fee: current.fee, net: current.net },
      totalNet6Months: history.reduce((sum, m) => sum + m.net, 0),
      escrowTotal: perUnit.reduce((sum, r) => sum + r.escrow, 0),
      history,
      perUnit,
    };
  }
}
