import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/account.dto';
import { PhoneService } from '../auth/phone/phone.service';
import { toTenantBooking, toTenantContract, toTenantUnit } from '../tenant/tenant.mappers';
import { TenantContract, TenantUnit } from '../tenant/tenant.types';

/** Hồ sơ trả về cho chính chủ: KHÔNG kèm `phoneEnc`/`phoneHash`/ví/vị trí Host. */
const PROFILE_SELECT = {
  id: true,
  phoneEnc: true, // chỉ để giải mã trả `phone` cho chính chủ; không bao giờ ra khỏi service dạng mã hoá
  fullName: true,
  email: true,
  isPhoneVerified: true,
  createdAt: true,
  role: { select: { code: true, name: true } },
} as const;

/**
 * Dữ liệu của CHÍNH người gọi. `userId` luôn đến từ phiên đã xác thực (xem controller); service không bao giờ
 * "đoán" một người dùng khác hay trả dữ liệu mẫu khi thiếu dữ liệu thật.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ');
    return this.toOwnProfile(profile);
  }

  /** SĐT (dạng 0xxxxxxxxx) chỉ trả cho chính chủ để điền sẵn form đặt lịch; giải mã lỗi ⇒ null, không làm hỏng hồ sơ. */
  private toOwnProfile<T extends { phoneEnc: string | null }>(profile: T) {
    const { phoneEnc, ...rest } = profile;
    let phone: string | null = null;
    if (phoneEnc) {
      try {
        const e164 = this.phones.decrypt(phoneEnc);
        phone = e164.startsWith('+84') ? `0${e164.slice(3)}` : e164;
      } catch {
        phone = null;
      }
    }
    return { ...rest, phone };
  }

  /** Chỉ cho đổi họ tên: email là định danh đăng nhập, SĐT phải qua OTP Zalo (không đổi bằng PATCH này). */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const fullName = dto.fullName?.trim().slice(0, 100);
    if (!fullName) return this.getProfile(userId);
    const updated = await this.prisma.profile.update({ where: { id: userId }, data: { fullName }, select: PROFILE_SELECT });
    return this.toOwnProfile(updated);
  }

  async getBookings(userId: string) {
    const viewings = await this.prisma.viewing.findMany({
      where: { tenantId: userId },
      include: {
        unit: { include: { building: true, media: true } },
        tickets: {
          include: {
            host: {
              select: {
                id: true,
                rating: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
        deposit: {
          include: {
            identity: true,
            contract: true,
          },
        },
        tenant: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return viewings.map((v) => toTenantBooking(v));
  }

  async getContracts(userId: string): Promise<TenantContract[]> {
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId: userId },
      include: {
        unit: { include: { building: true } },
        holdingDeposit: { include: { viewing: true } },
        document: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return contracts.map((c) => toTenantContract(c));
  }

  /** Căn đã lưu của chính người gọi, mới lưu trước. Trả đúng DTO `TenantUnit` như catalog công khai. */
  async getFavorites(userId: string): Promise<TenantUnit[]> {
    const rows = await this.prisma.favoriteUnit.findMany({
      where: { profileId: userId },
      orderBy: { createdAt: 'desc' },
      include: { unit: { include: { building: true, media: { orderBy: { order: 'asc' } } } } },
    });
    return rows.map((r) => {
      const hours = Math.min(72, Math.max(12, r.unit.holdHoursOverride ?? 48));
      return toTenantUnit(r.unit, null, hours, 0);
    });
  }

  /** `codeOrId` là mã căn (VHOP-…) hoặc UUID; lưu lặp lại là idempotent. */
  async addFavorite(userId: string, codeOrId: string) {
    const unit = await this.resolveUnit(codeOrId);
    await this.prisma.favoriteUnit.upsert({
      where: { profileId_unitId: { profileId: userId, unitId: unit.id } },
      create: { profileId: userId, unitId: unit.id },
      update: {},
    });
    return { success: true, unitId: unit.unitCode, saved: true };
  }

  async removeFavorite(userId: string, codeOrId: string) {
    const unit = await this.resolveUnit(codeOrId);
    await this.prisma.favoriteUnit.deleteMany({ where: { profileId: userId, unitId: unit.id } });
    return { success: true, unitId: unit.unitCode, saved: false };
  }

  private async resolveUnit(codeOrId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);
    const unit = await this.prisma.unit.findFirst({
      where: { OR: [{ unitCode: { equals: codeOrId, mode: 'insensitive' } }, ...(isUuid ? [{ id: codeOrId }] : [])] },
      select: { id: true, unitCode: true },
    });
    if (!unit) {
      throw new NotFoundException({ message: 'Không tìm thấy căn hộ.', code: 'unit_not_found' });
    }
    return unit;
  }

  /** Chưa có bảng thông báo: trả rỗng thay vì dữ liệu mẫu giả. */
  getNotifications(_userId: string) {
    return [];
  }
}
