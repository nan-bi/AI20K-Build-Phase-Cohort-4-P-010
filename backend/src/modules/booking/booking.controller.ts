import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { RequestBookingOtpDto, ConfirmBookingDto } from './dto/booking.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('3. Booking & Đón sảnh 1-chạm')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Public()
  @Post('request-otp')
  @ApiOperation({
    summary: 'Yêu cầu gửi mã OTP qua Zalo/SMS để xác thực SĐT khách thuê',
    description: 'Diệt trừ 100% môi giới ảo và no-show bằng xác thực số điện thoại thực',
  })
  async requestOtp(@Body() dto: RequestBookingOtpDto) {
    return this.bookingService.requestOtp(dto);
  }

  @Public()
  @Post('confirm')
  @ApiOperation({
    summary: 'Xác thực OTP & Chốt lịch hẹn xem phòng với Field Host nội khu',
    description: 'Tạo Viewing, kích hoạt Dispatch Ticket Tầng 1 (SLA 5 phút) cho Host trực sảnh',
  })
  async confirmBooking(@Body() dto: ConfirmBookingDto) {
    return this.bookingService.confirmBooking(dto);
  }

  @Public()
  @Post(':id/lobby-checkin')
  @ApiOperation({
    summary: 'Nút 1-chạm Zalo Bot T-10m: [📍 Tôi đã có mặt tại sảnh]',
    description: 'Không dán QR sảnh vi phạm BQL. Kích hoạt chuông rung cho Field Host quẹt thẻ cư dân thang máy đón khách trong 60s',
  })
  async lobbyCheckIn(@Param('id') id: string) {
    return this.bookingService.lobbyCheckIn(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết lịch hẹn xem phòng và Host phụ trách' })
  async getViewingDetails(@Param('id') id: string) {
    return this.bookingService.getViewingDetails(id);
  }
}
