import { Injectable } from '@nestjs/common';
import { HostDutyStatus, TicketStatus, ViewingStatus } from '@prisma/client';
import { hostConflict } from '../host-viewings/host-viewings.errors';
import { PrismaService } from '../../prisma/prisma.service';
import { authError } from '../auth/auth.errors';
import { toHostRoleCodes } from '../auth/host-roles';
import { PhoneService } from '../auth/phone/phone.service';
import { decryptPhoneForDisplay } from '../auth/phone/phone-display';

@Injectable()
export class HostService {
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

  async getEarnings(profileId: string) {
    const host = await this.prisma.fieldHost.findUnique({
      where: { profileId },
      include: { payouts: { orderBy: { createdAt: 'desc' } }, profile: { select: { fullName: true } } },
    });
    if (!host) throw authError('host_not_provisioned');

    const payoutRows = host.payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      period: p.period,
      status: p.status,
      transRef: p.transRef,
      createdAt: p.createdAt.toISOString(),
    }));
    const totalEarnings = payoutRows.reduce((sum, payout) => sum + payout.amount, 0);
    const viewingPayouts = payoutRows.filter((payout) => payout.transRef?.startsWith('viewing:'));
    const dealPayouts = payoutRows.filter(
      (payout) => payout.transRef?.startsWith('deposit:') && !payout.transRef.endsWith(':rating') && !payout.transRef.endsWith(':campaign'),
    );
    const ratingPayouts = payoutRows.filter((payout) => payout.transRef?.endsWith(':rating'));
    const campaignPayouts = payoutRows.filter((payout) => payout.transRef?.endsWith(':campaign'));
    const inspectionPayouts = payoutRows.filter((payout) => payout.transRef?.startsWith('inspection:'));

    return {
      hostId: host.id,
      fullName: host.profile.fullName,
      rating: Number(host.rating),
      roles: host.roles.map((r) => r.toLowerCase()),
      walletBalance: Number(host.walletBalance),
      stats: {
        totalViewings: viewingPayouts.length,
        totalDeals: dealPayouts.length,
        dealCommissionTotal: dealPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        viewingFeeTotal: viewingPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        ratingBonus: ratingPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        campaignBonus: campaignPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        totalInspections: inspectionPayouts.length,
        inspectionFeeTotal: inspectionPayouts.reduce((sum, payout) => sum + payout.amount, 0),
        totalEarnings,
      },
      currentPeriod: payoutRows[0]?.period ?? null,
      payouts: payoutRows.map(({ transRef: _transRef, ...payout }) => payout),
    };
  }
}
