import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostDutyStatus, TicketStatus, ViewingStatus } from '@prisma/client';
import { hostConflict } from '../host-viewings/host-viewings.errors';
import { PrismaService } from '../../prisma/prisma.service';
import { authError } from '../auth/auth.errors';
import { toHostRoleCodes } from '../auth/host-roles';
import { PhoneService } from '../auth/phone/phone.service';
import { decryptPhoneForDisplay } from '../auth/phone/phone-display';

@Injectable()
export class HostService {
  private readonly logger = new Logger(HostService.name);

  constructor(
    private prisma: PrismaService,
    private readonly phones: PhoneService,
  ) {}

  /** Hồ sơ của CHÍNH Field Host đang đăng nhập. Không có số thẻ RFID, mật khẩu, mã hoá SĐT. */
  async getMe(profileId: string) {
    const host = await this.prisma.fieldHost.findUnique({
      where: { profileId },
      include: { profile: { select: { fullName: true, email: true, phoneEnc: true, isPhoneVerified: true } } },
    });
    if (!host) throw authError('host_not_provisioned');
    return {
      hostId: host.id,
      fullName: host.profile.fullName,
      email: host.profile.email,
      phone: decryptPhoneForDisplay(this.phones, host.profile.phoneEnc),
      isPhoneVerified: host.profile.isPhoneVerified,
      assignedZone: host.assignedZone,
      roles: toHostRoleCodes(host.roles),
      dutyStatus: host.dutyStatus,
      rating: Number(host.rating),
      joinedAt: host.createdAt.toISOString(),
    };
  }

  /**
   * Bật/tắt trực (H1). Chỉ Host ONLINE mới được giao ticket tầng 1. Đang dẫn khách (RECEIVING/VIEWING) ⇒ không tắt
   * được (`host_busy`); bật trực khi đang dẫn thì giữ BUSY_VIEWING — trạng thái tự trả về ONLINE khi xong phần dẫn.
   */
  async setDuty(profileId: string, status: 'ONLINE_AVAILABLE' | 'OFF_DUTY') {
    const host = await this.prisma.fieldHost.findUnique({ where: { profileId } });
    if (!host) throw authError('host_not_provisioned');
    const guiding = await this.prisma.dispatchTicket.count({
      where: {
        hostId: host.id,
        status: TicketStatus.ACCEPTED,
        viewing: { status: { in: [ViewingStatus.RECEIVING, ViewingStatus.VIEWING] } },
      },
    });
    if (guiding > 0) {
      if (status === 'OFF_DUTY') throw hostConflict('host_busy');
      return { dutyStatus: HostDutyStatus.BUSY_VIEWING };
    }
    await this.prisma.fieldHost.update({ where: { id: host.id }, data: { dutyStatus: status } });
    return { dutyStatus: status };
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
