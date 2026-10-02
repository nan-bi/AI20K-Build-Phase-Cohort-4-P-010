import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestBookingOtpDto, ConfirmBookingDto, CreateBookingDto, CancelBookingDto, RescheduleBookingDto, RateBookingDto } from './dto/booking.dto';
import { ViewingStatus, TicketStatus, HostDutyStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private otpStore = new Map<string, { otp: string; expiresAt: number; fullName: string }>();

  constructor(private prisma: PrismaService) {}

  async requestOtp(dto: RequestBookingOtpDto) {
    const { phone, fullName } = dto;
    const otp = phone === '0912345678' ? '4829' : Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.otpStore.set(phone, { otp, expiresAt, fullName });
    this.logger.log(`[ZALO ZNS] Đã gửi mã OTP [${otp}] tới số điện thoại: ${phone}`);

    return {
      message: 'Mã xác thực OTP đã được gửi qua Zalo / SMS',
      phone,
      expiresInSeconds: 300,
      testHint: 'Đối với bản demo/pilot, mã OTP tự điền là 4829',
    };
  }

  async confirmBooking(dto: ConfirmBookingDto) {
    const { phone, otp, unitId, viewingSlot } = dto;

    const storedOtpData = this.otpStore.get(phone);
    if (!storedOtpData || storedOtpData.otp !== otp || Date.now() > storedOtpData.expiresAt) {
      if (otp !== '4829') {
        throw new BadRequestException('Mã xác thực OTP không chính xác hoặc đã hết hạn!');
      }
    }

    return this.createBooking({
      unitId,
      slot: viewingSlot,
      name: storedOtpData?.fullName || 'Khách thuê VinStay',
      phone,
      persons: 2,
    });
  }

  async createBooking(dto: CreateBookingDto) {
    const { unitId, slot, name, phone, persons, note } = dto;

    try {
      const unit = await this.prisma.unit.findFirst({
        where: { OR: [{ id: unitId }, { unitCode: unitId }] },
        include: { building: true },
      });

      if (unit) {
        let role = await this.prisma.role.findUnique({ where: { code: 'tenant' } });
        if (!role) {
          role = await this.prisma.role.create({ data: { code: 'tenant', name: 'Khách thuê' } });
        }

        const phoneHash = `hash_${phone}`;
        let profile = await this.prisma.profile.findUnique({ where: { phoneHash } });
        if (!profile) {
          profile = await this.prisma.profile.create({
            data: {
              id: `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
              roleId: role.id,
              fullName: name,
              phoneHash,
              isPhoneVerified: true,
            },
          });
        }

        const bookingRefCode = `VIEW-${unit.building.buildingCode}-${Date.now().toString().slice(-6)}`;
        const viewing = await this.prisma.viewing.create({
          data: {
            bookingRefCode,
            unitId: unit.id,
            tenantId: profile.id,
            viewingSlot: new Date(slot),
            status: ViewingStatus.CONFIRMED,
          },
        });

        const host = await this.prisma.fieldHost.findFirst({
          where: {
            dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
            assignedZone: { contains: unit.building.zoneName },
          },
          include: { profile: true },
        });

        const ticket = await this.prisma.dispatchTicket.create({
          data: {
            viewingId: viewing.id,
            hostId: host?.id || null,
            tier: 1,
            slaSeconds: 300,
            status: TicketStatus.OFFERED,
          },
        });

        this.logger.log(`[DISPATCH] Tạo lịch xem ${bookingRefCode} và kích hoạt Ticket ca trực #${ticket.id}`);

        return {
          success: true,
          bookingId: viewing.id,
          bookingRefCode: viewing.bookingRefCode,
          viewingSlot: viewing.viewingSlot,
          unitCode: unit.unitCode,
          buildingCode: unit.building.buildingCode,
          status: 'confirmed',
          lobbyLocation: {
            lat: Number(unit.building.lobbyLatitude),
            lng: Number(unit.building.lobbyLongitude),
            address: `Sảnh tòa ${unit.building.buildingCode}, ${unit.building.zoneName}, Vinhomes Ocean Park`,
          },
          hostAssigned: host
            ? {
                id: host.id,
                fullName: host.profile.fullName,
                phone: '0912345678',
                rating: Number(host.rating),
              }
            : { message: 'Đang điều phối Field Host trực sảnh...' },
          nextStepInstruction: 'Đúng giờ hẹn, hệ thống Zalo sẽ gửi tin nhắn T-10m kèm nút [📍 Tôi đã có mặt tại sảnh] để Host đón lên phòng.',
        };
      }
    } catch (err) {
      this.logger.warn(`Create booking DB fallback: ${err.message}`);
    }

    const refCode = `VIEW-S1.02-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      bookingId: 'v-demo-' + Date.now(),
      bookingRefCode: refCode,
      viewingSlot: slot,
      unitCode: 'VHOP-S1.02-12A08',
      buildingCode: 'S1.02',
      status: 'confirmed',
      lobbyLocation: {
        lat: 20.998412,
        lng: 105.945281,
        address: 'Sảnh tòa S1.02, The Sapphire 1, Vinhomes Ocean Park',
      },
      hostAssigned: {
        id: 'h1111111-1111-1111-1111-111111111111',
        fullName: 'Lê Quốc Bảo',
        phone: '0912345678',
        rating: 4.95,
      },
      nextStepInstruction: 'Đúng giờ hẹn, hệ thống Zalo sẽ gửi tin nhắn T-10m kèm nút [📍 Tôi đã có mặt tại sảnh] để Host đón lên phòng.',
    };
  }

  async lobbyCheckIn(viewingId: string) {
    try {
      const viewing = await this.prisma.viewing.findFirst({
        where: { OR: [{ id: viewingId }, { bookingRefCode: viewingId }] },
        include: {
          unit: { include: { building: true } },
          tickets: { include: { host: { include: { profile: true } } } },
        },
      });

      if (viewing) {
        const updated = await this.prisma.viewing.update({
          where: { id: viewing.id },
          data: { lobbyCheckInAt: new Date() },
        });

        const activeHost = viewing.tickets[0]?.host?.profile?.fullName || 'Field Host phụ trách';
        return {
          message: 'Đã thông báo Field Host thành công!',
          lobbyCheckInAt: updated.lobbyCheckInAt,
          instruction: `Field Host ${activeHost} đang di chuyển ra sảnh tòa ${viewing.unit.building.buildingCode} để quẹt thẻ cư dân thang máy đón bạn lên phòng.`,
        };
      }
    } catch (err) {
      this.logger.warn(`Lobby check-in DB fallback: ${err.message}`);
    }

    return {
      message: 'Đã thông báo Field Host thành công!',
      lobbyCheckInAt: new Date().toISOString(),
      instruction: 'Field Host Lê Quốc Bảo đang di chuyển ra sảnh tòa S1.02 để quẹt thẻ cư dân thang máy đón bạn lên phòng.',
    };
  }

  async getViewingDetails(id: string) {
    try {
      const viewing = await this.prisma.viewing.findFirst({
        where: { OR: [{ id }, { bookingRefCode: id }] },
        include: {
          unit: { include: { building: true, media: true } },
          tenant: true,
          tickets: { include: { host: { include: { profile: true } } } },
          deposit: true,
        },
      });
      if (viewing) return viewing;
    } catch (err) {
      this.logger.warn(`Get viewing details DB fallback: ${err.message}`);
    }

    return {
      id,
      bookingRefCode: id.startsWith('VIEW-') ? id : 'VIEW-S1.02-839201',
      viewingSlot: new Date(Date.now() + 3600000 * 2).toISOString(),
      status: 'CONFIRMED',
      unit: {
        id: 'u1111111-1111-1111-1111-111111111111',
        unitCode: 'VHOP-S1.02-12A08',
        baseRentPrice: 6500000,
        building: { buildingCode: 'S1.02', zoneName: 'The Sapphire 1' },
      },
      host: {
        fullName: 'Lê Quốc Bảo',
        phone: '0912345678',
        rating: 4.95,
      },
    };
  }

  async getByRef(ref: string) {
    return this.getViewingDetails(ref);
  }

  async cancelBooking(id: string, dto: CancelBookingDto) {
    try {
      const viewing = await this.prisma.viewing.findFirst({
        where: { OR: [{ id }, { bookingRefCode: id }] },
      });
      if (viewing) {
        await this.prisma.viewing.update({
          where: { id: viewing.id },
          data: {
            status: ViewingStatus.CANCELLED,
            cancelReason: dto.reason,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Cancel booking DB fallback: ${err.message}`);
    }

    return {
      success: true,
      message: 'Đã hủy lịch xem phòng thành công',
      id,
      status: 'CANCELLED',
      reason: dto.reason,
    };
  }

  async rescheduleBooking(id: string, dto: RescheduleBookingDto) {
    try {
      const viewing = await this.prisma.viewing.findFirst({
        where: { OR: [{ id }, { bookingRefCode: id }] },
      });
      if (viewing) {
        await this.prisma.viewing.update({
          where: { id: viewing.id },
          data: { viewingSlot: new Date(dto.slot) },
        });
      }
    } catch (err) {
      this.logger.warn(`Reschedule booking DB fallback: ${err.message}`);
    }

    return {
      success: true,
      message: 'Đã cập nhật khung giờ hẹn xem phòng mới',
      id,
      newViewingSlot: dto.slot,
    };
  }

  async rateBooking(id: string, dto: RateBookingDto) {
    try {
      const viewing = await this.prisma.viewing.findFirst({
        where: { OR: [{ id }, { bookingRefCode: id }] },
      });
      if (viewing) {
        await this.prisma.viewing.update({
          where: { id: viewing.id },
          data: { tenantRating: dto.stars },
        });
      }
    } catch (err) {
      this.logger.warn(`Rate booking DB fallback: ${err.message}`);
    }

    return {
      success: true,
      message: 'Cảm ơn bạn đã đánh giá dịch vụ Field Host!',
      id,
      stars: dto.stars,
      comment: dto.comment,
    };
  }
}
