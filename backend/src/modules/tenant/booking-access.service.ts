import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hàm duy nhất tải lịch cho route T (bắt buộc tenant là chủ lịch).
   * Không có hoặc không phải chủ lịch => 404 booking_not_found.
   */
  async loadOwned(ref: string, user: { id: string }, include?: any) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { bookingRefCode: ref },
      include: include || {
        unit: {
          include: {
            building: true,
            media: true,
          },
        },
        tenant: true,
        tickets: {
          include: {
            host: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: { offeredAt: 'asc' },
        },
        deposit: {
          include: {
            identity: true,
            contract: true,
          },
        },
      },
    });

    if (!viewing || viewing.tenantId !== user.id) {
      throw new NotFoundException({
        message: 'Không tìm thấy lịch hẹn trong tài khoản của bạn.',
        code: 'booking_not_found',
      });
    }

    return viewing as any;
  }
}
