import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/account.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private favorites = new Set<string>(['u1111111-1111-1111-1111-111111111111']);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId?: string) {
    try {
      if (userId) {
        const profile = await this.prisma.profile.findUnique({
          where: { id: userId },
          include: { role: true, hostProfile: true },
        });
        if (profile) return profile;
      }
      // Demo fallback
      const first = await this.prisma.profile.findFirst({
        include: { role: true, hostProfile: true },
      });
      if (first) return first;
    } catch (err) {
      this.logger.warn(`Could not fetch profile from DB: ${err.message}`);
    }

    return {
      id: '00000000-0000-0000-0000-000000000001',
      fullName: 'Nguyễn Văn An',
      email: 'tenant@vinstay.test',
      phoneHash: 'hash_0912345678',
      isPhoneVerified: true,
      role: { code: 'tenant', name: 'Khách thuê' },
      createdAt: new Date().toISOString(),
    };
  }

  async updateProfile(userId: string | undefined, dto: UpdateProfileDto) {
    try {
      if (userId) {
        return await this.prisma.profile.update({
          where: { id: userId },
          data: {
            fullName: dto.fullName,
            email: dto.email,
          },
          include: { role: true },
        });
      }
    } catch (err) {
      this.logger.warn(`Update profile DB fallback: ${err.message}`);
    }

    return {
      id: userId || '00000000-0000-0000-0000-000000000001',
      fullName: dto.fullName || 'Nguyễn Văn An',
      email: dto.email || 'tenant@vinstay.test',
      phone: dto.phone || '0912345678',
      updatedAt: new Date().toISOString(),
    };
  }

  async getBookings(userId?: string) {
    try {
      const viewings = await this.prisma.viewing.findMany({
        where: userId ? { tenantId: userId } : undefined,
        include: {
          unit: { include: { building: true, media: true } },
          tickets: { include: { host: { include: { profile: true } } } },
          deposit: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (viewings.length > 0) return viewings;
    } catch (err) {
      this.logger.warn(`Could not fetch bookings from DB: ${err.message}`);
    }

    // Fallback demo bookings
    return [
      {
        id: 'v1111111-1111-1111-1111-111111111111',
        bookingRefCode: 'VIEW-S1.02-839201',
        viewingSlot: new Date(Date.now() + 3600000 * 24).toISOString(),
        status: 'CONFIRMED',
        unit: {
          id: 'u1111111-1111-1111-1111-111111111111',
          unitCode: 'VHOP-S1.02-12A08',
          baseRentPrice: 6500000,
          carpetAreaM2: 47,
          layoutType: 'ONE_BED_PLUS',
          building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
          media: [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200' }],
        },
        host: {
          fullName: 'Lê Quốc Bảo',
          phone: '0912345678',
          rating: 4.95,
        },
        deposit: null,
      },
    ];
  }

  async getContracts(userId?: string) {
    try {
      const contracts = await this.prisma.contract.findMany({
        where: userId ? { OR: [{ tenantId: userId }, { landlordId: userId }] } : undefined,
        include: {
          unit: { include: { building: true } },
          holdingDeposit: true,
          handovers: { include: { items: true, utilityReadings: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (contracts.length > 0) return contracts;
    } catch (err) {
      this.logger.warn(`Could not fetch contracts from DB: ${err.message}`);
    }

    return [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        contractNumber: 'HDT-2026-VHOP-S102-001',
        status: 'ACTIVE',
        leaseTermMonths: 12,
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        monthlyRentPrice: 6500000,
        securityDepositAmount: 6500000,
        unit: {
          unitCode: 'VHOP-S1.02-12A08',
          building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
        },
        handoverStatus: 'CHECKED_IN',
        signedAt: '2026-10-01T09:00:00Z',
      },
    ];
  }

  async getFavorites() {
    try {
      const units = await this.prisma.unit.findMany({
        where: { id: { in: Array.from(this.favorites) } },
        include: { building: true, media: true },
      });
      if (units.length > 0) return units;
    } catch (err) {
      this.logger.warn(`Favorites DB fallback: ${err.message}`);
    }

    return [
      {
        id: 'u1111111-1111-1111-1111-111111111111',
        unitCode: 'VHOP-S1.02-12A08',
        baseRentPrice: 6500000,
        carpetAreaM2: 47,
        layoutType: 'ONE_BED_PLUS',
        isHot: true,
        building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
        media: [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200' }],
      },
    ];
  }

  addFavorite(unitId: string) {
    this.favorites.add(unitId);
    return { success: true, unitId, saved: true };
  }

  removeFavorite(unitId: string) {
    this.favorites.delete(unitId);
    return { success: true, unitId, saved: false };
  }

  getNotifications(userId?: string) {
    return [
      {
        id: 'n1',
        title: 'Nhắc hẹn xem phòng T-10m',
        body: 'Bạn có lịch xem căn S1.02-12A08 vào lúc 14:00 hôm nay. Bấm nút khi có mặt tại sảnh.',
        channel: 'zalo',
        audience: 'tenant',
        tone: 'info',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        actions: [{ id: 'arrived', label: 'Tôi đã có mặt tại sảnh' }],
      },
      {
        id: 'n2',
        title: 'Cọc giữ chỗ thành công',
        body: 'Giao dịch cọc 2.000.000đ cho căn S1.02-12A08 đã được ghi nhận. Thời hạn giữ căn: 48 giờ.',
        channel: 'push',
        audience: 'tenant',
        tone: 'success',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
}
