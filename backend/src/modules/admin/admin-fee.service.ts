import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCommissionParamDto, UpdateDepositPolicyDto, UpdateLandlordFeeDto } from './dto/admin.dto';
import { DEFAULT_SERVICE_FEE_PERCENT, SERVICE_FEE_CONFIG_KEY } from '../landlord/landlord.mappers';

export interface AdminActor {
  id: string;
  role: string;
}

interface FeeRule {
  min: number;
  max: number;
  unit: string;
  integer?: boolean;
}

// Khoảng giá trị theo SAD_v2 §3.2 (🔵 cần chốt với Ops); giờ vàng là khung giờ 0–24 theo Asia/Ho_Chi_Minh.
export const FEE_RULES: Record<string, FeeRule> = {
  host_base_viewing_fee: { min: 30_000, max: 100_000, unit: 'VND/lượt' },
  host_deal_commission: { min: 200_000, max: 1_000_000, unit: 'VND/cọc' },
  host_rating_multiplier_5star: { min: 1.1, max: 1.5, unit: 'hệ số' },
  host_peak_hour_multiplier: { min: 1.1, max: 1.5, unit: 'hệ số' },
  // Thưởng nóng theo chiến dịch: cộng thêm cho mỗi deal chốt cọc, tối đa 3 deal/tuần/Host; 0 = tắt chiến dịch.
  host_campaign_bonus: { min: 0, max: 1_000_000, unit: 'VND/deal' },
  // Thù lao thẩm định ký gửi: trả cho Host vai Thẩm định cho mỗi phiếu thẩm định đã nộp (đạt hay không đạt).
  host_inspection_fee: { min: 50_000, max: 500_000, unit: 'VND/ca' },
  host_slow_inventory_bonus: { min: 100_000, max: 500_000, unit: 'VND' },
  host_handover_inspection_fee: { min: 50_000, max: 100_000, unit: 'VND/ca' },
  host_peak_hour_start: { min: 0, max: 23, unit: 'giờ', integer: true },
  host_peak_hour_end: { min: 1, max: 24, unit: 'giờ', integer: true },
};

export const DEPOSIT_MIN_RATIO_KEY = 'deposit_min_ratio';
export const DEPOSIT_MAX_RATIO_KEY = 'deposit_max_ratio';
export const DEPOSIT_DEFAULT_RATIO_KEY = 'deposit_default_ratio';
export const DEPOSIT_DEFAULTS = {
  MIN_RATIO: 0.5,
  MAX_RATIO: 4.0,
  DEFAULT_RATIO: 1.0,
};

@Injectable()
export class AdminFeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getCommissionEngine() {
    const configs = await this.prisma.feeConfig.findMany();
    return {
      configs: configs.map((c) => ({
        id: c.id,
        configKey: c.configKey,
        paramValue: Number(c.paramValue),
        paramUnit: c.paramUnit,
        updatedAt: c.updatedAt,
      })),
    };
  }

  async updateCommissionParam(dto: UpdateCommissionParamDto, actor: AdminActor) {
    const { configKey, paramValue } = dto;
    const reason = (dto.reason ?? '').trim();
    const rule = FEE_RULES[configKey];
    if (!rule) throw new BadRequestException(`Tham số biến phí không hợp lệ: ${configKey}`);
    if (!reason) throw new BadRequestException('Bắt buộc nhập lý do thay đổi');
    this.assertInRange(configKey, paramValue, rule);

    if (configKey === 'host_peak_hour_start' || configKey === 'host_peak_hour_end') {
      const otherKey = configKey === 'host_peak_hour_start' ? 'host_peak_hour_end' : 'host_peak_hour_start';
      const other = await this.prisma.feeConfig.findUnique({ where: { configKey: otherKey } });
      if (other) {
        const o = Number(other.paramValue);
        const [start, end] = configKey === 'host_peak_hour_start' ? [paramValue, o] : [o, paramValue];
        if (start >= end) throw new BadRequestException('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      }
    }

    const { old, saved } = await this.writeConfig(configKey, paramValue, rule.unit, actor);
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'FEE_CONFIG_UPDATED',
      entityName: 'FeeConfig',
      entityId: configKey,
      oldValue: { paramValue: old },
      newValue: { paramValue, reason },
    });

    return {
      success: true,
      configKey,
      newValue: paramValue,
      updatedAt: saved.updatedAt,
      reason,
      message: 'Đã cập nhật tham số biến phí và lưu nhật ký kiểm toán.',
    };
  }

  /** Nhật ký thay đổi tham số biến phí (AuditLog FEE_CONFIG_UPDATED), mới nhất trước. */
  async getCommissionAudit(limit = 30) {
    const rows: any[] = await this.prisma.auditLog.findMany({
      where: { actionType: 'FEE_CONFIG_UPDATED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { fullName: true, email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      at: new Date(r.createdAt).toISOString(),
      by: r.actor?.fullName || r.actor?.email || r.actorRole,
      configKey: r.entityId,
      from: typeof r.oldValue?.paramValue === 'number' ? r.oldValue.paramValue : null,
      to: typeof r.newValue?.paramValue === 'number' ? r.newValue.paramValue : null,
      reason: typeof r.newValue?.reason === 'string' ? r.newValue.reason : null,
    }));
  }

  /** Phí dịch vụ ký gửi thu của chủ nhà (% tiền thuê). Chưa cấu hình ⇒ mức tạm mặc định (cùng nguồn với màn Khoản thu của chủ nhà). */
  async getLandlordFee() {
    const row = await this.prisma.feeConfig.findUnique({ where: { configKey: SERVICE_FEE_CONFIG_KEY } });
    return {
      percent: row ? Number(row.paramValue) : DEFAULT_SERVICE_FEE_PERCENT,
      source: row ? ('config' as const) : ('default' as const),
      defaultPercent: DEFAULT_SERVICE_FEE_PERCENT,
      min: 0,
      max: 30,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async updateLandlordFee(dto: UpdateLandlordFeeDto, actor: AdminActor) {
    const reason = (dto.reason ?? '').trim();
    if (!reason) throw new BadRequestException('Bắt buộc nhập lý do thay đổi');
    const percent = dto.percent;
    // Tối đa 2 chữ số thập phân: cột FeeConfig.paramValue là Decimal(12,2).
    if (!Number.isFinite(percent) || percent < 0 || percent > 30 || Math.round(percent * 100) / 100 !== percent) {
      throw new BadRequestException('Phí dịch vụ phải từ 0% đến 30% (tối đa 2 chữ số thập phân)');
    }
    const { old } = await this.writeConfig(SERVICE_FEE_CONFIG_KEY, percent, '%', actor);
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'LANDLORD_FEE_UPDATED',
      entityName: 'FeeConfig',
      entityId: SERVICE_FEE_CONFIG_KEY,
      oldValue: { paramValue: old },
      newValue: { paramValue: percent, reason },
    } as any);
    return {
      success: true,
      percent,
      source: 'config' as const,
      message: 'Đã cập nhật phí dịch vụ ký gửi. Màn của chủ nhà cập nhật trong tối đa 1 phút.',
    };
  }

  async getDepositPolicy() {
    const [minRow, maxRow, defRow] = await Promise.all([
      this.prisma.feeConfig.findUnique({ where: { configKey: DEPOSIT_MIN_RATIO_KEY } }),
      this.prisma.feeConfig.findUnique({ where: { configKey: DEPOSIT_MAX_RATIO_KEY } }),
      this.prisma.feeConfig.findUnique({ where: { configKey: DEPOSIT_DEFAULT_RATIO_KEY } }),
    ]);
    const minRatio = minRow ? Number(minRow.paramValue) : DEPOSIT_DEFAULTS.MIN_RATIO;
    const maxRatio = maxRow ? Number(maxRow.paramValue) : DEPOSIT_DEFAULTS.MAX_RATIO;
    const defaultRatio = defRow ? Number(defRow.paramValue) : DEPOSIT_DEFAULTS.DEFAULT_RATIO;
    return {
      minRatio,
      maxRatio,
      defaultRatio,
      description: 'Số tiền cọc căn cứ theo giá của hợp đồng thuê: không nhỏ hơn 50% và không lớn hơn 4 lần số tiền thuê mỗi tháng.',
    };
  }

  async updateDepositPolicy(dto: UpdateDepositPolicyDto, actor: AdminActor) {
    const current = await this.getDepositPolicy();
    const minRatio = dto.minRatio ?? current.minRatio;
    const maxRatio = dto.maxRatio ?? current.maxRatio;
    const defaultRatio = dto.defaultRatio ?? current.defaultRatio;

    if (minRatio < 0.1 || minRatio > 2.0) {
      throw new BadRequestException('Tỷ lệ cọc tối thiểu phải từ 0.1 (10%) đến 2.0 (200%)');
    }
    if (maxRatio < minRatio || maxRatio > 10.0) {
      throw new BadRequestException('Tỷ lệ cọc tối đa phải lớn hơn tỷ lệ tối thiểu và không vượt quá 10.0 (1000%)');
    }
    if (defaultRatio < minRatio || defaultRatio > maxRatio) {
      throw new BadRequestException('Tỷ lệ cọc mặc định phải nằm trong khoảng tỷ lệ tối thiểu và tối đa');
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.feeConfig.upsert({
          where: { configKey: DEPOSIT_MIN_RATIO_KEY },
          update: { paramValue: minRatio, updatedBy: actor.id },
          create: { configKey: DEPOSIT_MIN_RATIO_KEY, paramValue: minRatio, paramUnit: 'hệ số', updatedBy: actor.id },
        }),
        tx.feeConfig.upsert({
          where: { configKey: DEPOSIT_MAX_RATIO_KEY },
          update: { paramValue: maxRatio, updatedBy: actor.id },
          create: { configKey: DEPOSIT_MAX_RATIO_KEY, paramValue: maxRatio, paramUnit: 'hệ số', updatedBy: actor.id },
        }),
        tx.feeConfig.upsert({
          where: { configKey: DEPOSIT_DEFAULT_RATIO_KEY },
          update: { paramValue: defaultRatio, updatedBy: actor.id },
          create: { configKey: DEPOSIT_DEFAULT_RATIO_KEY, paramValue: defaultRatio, paramUnit: 'hệ số', updatedBy: actor.id },
        }),
      ]);
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DEPOSIT_POLICY_UPDATED',
      entityName: 'FeeConfig',
      entityId: 'deposit_policy',
      oldValue: { minRatio: current.minRatio, maxRatio: current.maxRatio, defaultRatio: current.defaultRatio },
      newValue: { minRatio, maxRatio, defaultRatio, reason: dto.reason?.trim() || 'Cập nhật quy định cọc theo giá thuê' },
    } as any);

    return {
      success: true,
      minRatio,
      maxRatio,
      defaultRatio,
      message: 'Đã cập nhật quy định tiền cọc và lưu nhật ký kiểm toán.',
    };
  }

  private assertInRange(key: string, value: number, rule: FeeRule) {
    const v = new Prisma.Decimal(String(value));
    const ok =
      Number.isFinite(value) &&
      v.gte(String(rule.min)) &&
      v.lte(String(rule.max)) &&
      (!rule.integer || v.isInteger());
    if (!ok) {
      throw new BadRequestException(`${key} phải trong khoảng ${rule.min}–${rule.max} (${rule.unit})`);
    }
  }

  private async writeConfig(configKey: string, value: number, unit: string, actor: AdminActor) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.feeConfig.findUnique({ where: { configKey } });
      const saved = await tx.feeConfig.upsert({
        where: { configKey },
        update: { paramValue: value, updatedBy: actor.id },
        create: { configKey, paramValue: value, paramUnit: unit, updatedBy: actor.id },
      });
      return { old: existing ? Number(existing.paramValue) : null, saved };
    });
  }
}
