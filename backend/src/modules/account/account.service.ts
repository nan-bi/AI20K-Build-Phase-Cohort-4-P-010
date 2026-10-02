import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/account.dto';

/** Hồ sơ trả về cho chính chủ: KHÔNG kèm `phoneEnc`/`phoneHash`/ví/vị trí Host. */
const PROFILE_SELECT = {
  id: true,
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
  /** Yêu thích lưu tạm trong bộ nhớ theo từng người dùng (chưa có bảng `favorites`). */
  private readonly favorites = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ');
    return profile;
  }

  /** Chỉ cho đổi họ tên: email là định danh đăng nhập, SĐT phải qua OTP Zalo (không đổi bằng PATCH này). */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const fullName = dto.fullName?.trim().slice(0, 100);
    if (!fullName) return this.getProfile(userId);
    return this.prisma.profile.update({ where: { id: userId }, data: { fullName }, select: PROFILE_SELECT });
  }

  getBookings(userId: string) {
    return this.prisma.viewing.findMany({
      where: { tenantId: userId },
      include: {
        unit: { include: { building: true, media: true } },
        // Khách chỉ cần tên và đánh giá của Host, không phải toàn bộ hồ sơ Host.
        tickets: { include: { host: { select: { id: true, rating: true, profile: { select: { fullName: true } } } } } },
        deposit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: { OR: [{ tenantId: userId }, { landlordId: userId }] },
      include: {
        unit: { include: { building: true } },
        holdingDeposit: true,
        handovers: { include: { items: true, utilityReadings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFavorites(userId: string) {
    const ids = Array.from(this.favorites.get(userId) ?? []);
    if (ids.length === 0) return [];
    return this.prisma.unit.findMany({
      where: { id: { in: ids } },
      include: { building: true, media: true },
    });
  }

  addFavorite(userId: string, unitId: string) {
    const set = this.favorites.get(userId) ?? new Set<string>();
    set.add(unitId);
    this.favorites.set(userId, set);
    return { success: true, unitId, saved: true };
  }

  removeFavorite(userId: string, unitId: string) {
    this.favorites.get(userId)?.delete(unitId);
    return { success: true, unitId, saved: false };
  }

  /** Chưa có bảng thông báo: trả rỗng thay vì dữ liệu mẫu giả. */
  getNotifications(_userId: string) {
    return [];
  }
}
