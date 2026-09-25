import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestBookingOtpDto, ConfirmBookingDto } from './dto/booking.dto';
import { ViewingStatus, TicketStatus, HostDutyStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private otpStore = new Map<string, { otp: string; expiresAt: number; fullName: string }>();

  constructor(private prisma: PrismaService) {}

  async requestOtp(dto: RequestBookingOtpDto) {
    const { phone, fullName } = dto;
    // Sinh OTP ngẫu nhiên hoặc cố định 4829 cho testing
    const otp = phone === '0912345678' ? '4829' : Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

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

    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { building: true },
    });

    if (!unit) {
      throw new NotFoundException('Không tìm thấy căn hộ');
    }

    // 1. Tìm hoặc tạo Profile Tenant
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
          fullName: storedOtpData?.fullName || 'Khách thuê VinStay',
          phoneHash,
          isPhoneVerified: true,
        },
      });
    }

    // 2. Tạo bản ghi Viewing
    const bookingRefCode = `VIEW-${unit.building.buildingCode}-${Date.now().toString().slice(-6)}`;
    const viewing = await this.prisma.viewing.create({
      data: {
        bookingRefCode,
        unitId: unit.id,
        tenantId: profile.id,
        viewingSlot: new Date(viewingSlot),
        status: ViewingStatus.CONFIRMED,
      },
    });

    // 3. Tìm Field Host phụ trách phân khu (The Sapphire 1 hoặc 2)
    const host = await this.prisma.fieldHost.findFirst({
      where: {
        dutyStatus: HostDutyStatus.ONLINE_AVAILABLE,
        assignedZone: { contains: unit.building.zoneName },
      },
      include: { profile: true },
    });

    // 4. Kích hoạt Dispatch Ticket Tầng 1 (SLA 5 phút)
    const ticket = await this.prisma.dispatchTicket.create({
      data: {
        viewingId: viewing.id,
        hostId: host?.id || null,
        tier: 1,
        slaSeconds: 300, // 5 phút
        status: TicketStatus.OFFERED,
      },
    });

    this.logger.log(
      `[DISPATCH] Kích hoạt Ticket ca trực #${ticket.id} cho Host [${host?.profile?.fullName || 'Open Pool'}], SLA: 300s`,
    );

    return {
      success: true,
      bookingRefCode: viewing.bookingRefCode,
      viewingSlot: viewing.viewingSlot,
      unitCode: unit.unitCode,
      buildingCode: unit.building.buildingCode,
      lobbyLocation: {
        lat: unit.building.lobbyLatitude,
        lng: unit.building.lobbyLongitude,
        address: `Sảnh tòa ${unit.building.buildingCode}, ${unit.building.zoneName}, Vinhomes Ocean Park`,
      },
      hostAssigned: host
        ? {
            id: host.id,
            fullName: host.profile.fullName,
            phone: '0912345678', // Host lộ số cho khách liên hệ theo SAD v2
            rating: host.rating,
          }
        : { message: 'Đang điều phối Field Host trực sảnh...' },
      nextStepInstruction: 'Đúng giờ hẹn, hệ thống Zalo sẽ gửi tin nhắn T-10m kèm nút [📍 Tôi đã có mặt tại sảnh] để Host đón lên phòng.',
    };
  }

  async lobbyCheckIn(viewingId: string) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: {
        unit: { include: { building: true } },
        tickets: {
          include: { host: { include: { profile: true } } },
        },
      },
    });

    if (!viewing) {
      throw new NotFoundException('Không tìm thấy lịch xem phòng');
    }

    const updated = await this.prisma.viewing.update({
      where: { id: viewingId },
      data: {
        lobbyCheckInAt: new Date(),
      },
    });

    const activeHost = viewing.tickets[0]?.host?.profile?.fullName || 'Field Host phụ trách';

    this.logger.log(
      `[LOBBY 1-TOUCH] Khách đã có mặt tại sảnh ${viewing.unit.building.buildingCode}! Đã báo động Host ${activeHost} ra quẹt thẻ cư dân thang máy đón khách trong 60 giây.`,
    );

    return {
      message: 'Đã thông báo Field Host thành công!',
      lobbyCheckInAt: updated.lobbyCheckInAt,
      instruction: `Field Host ${activeHost} đang di chuyển ra sảnh tòa ${viewing.unit.building.buildingCode} để quẹt thẻ cư dân thang máy đón bạn lên phòng.`,
    };
  }

  async getViewingDetails(id: string) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id },
      include: {
        unit: { include: { building: true } },
        tenant: true,
        tickets: { include: { host: { include: { profile: true } } } },
      },
    });

    if (!viewing) {
      throw new NotFoundException('Lịch hẹn không tồn tại');
    }

    return viewing;
  }
}
