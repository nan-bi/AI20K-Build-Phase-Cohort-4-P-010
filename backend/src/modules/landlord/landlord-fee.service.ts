import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_SERVICE_FEE_PERCENT, SERVICE_FEE_CONFIG_KEY } from './landlord.mappers';

export interface ServiceFee {
  percent: number;
  /** `config` = Admin đã đặt trong fee_configs; `default` = chưa cấu hình, đang dùng mức tạm. */
  source: 'config' | 'default';
  /** Tiền phí dịch vụ trên một khoản tiền thuê (làm tròn đồng). */
  of: (gross: number) => number;
}

/** Nguồn duy nhất của tỷ lệ phí dịch vụ ký gửi — màn Khoản thu và Chi tiết căn phải dùng chung để không lệch số. */
const TTL_MS = 60_000;

@Injectable()
export class LandlordFeeService implements OnModuleInit {
  private readonly logger = new Logger(LandlordFeeService.name);
  private cache: { at: number; fee: ServiceFee } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.get().catch((err) => this.logger.warn(`Chưa nạp được mức phí dịch vụ: ${err.message}`));
  }

  /** Giữ trong bộ nhớ 60 giây: Admin đổi mức phí thì tối đa 1 phút sau màn chủ nhà mới thấy, đổi lại bớt 1 lượt truy vấn mỗi trang. */
  async get(now = Date.now()): Promise<ServiceFee> {
    if (this.cache && now - this.cache.at < TTL_MS) return this.cache.fee;
    const row = await this.prisma.feeConfig.findUnique({ where: { configKey: SERVICE_FEE_CONFIG_KEY } });
    const percent = row ? Number(row.paramValue) : DEFAULT_SERVICE_FEE_PERCENT;
    const fee: ServiceFee = { percent, source: row ? 'config' : 'default', of: (gross) => Math.round((gross * percent) / 100) };
    this.cache = { at: now, fee };
    return fee;
  }
}
