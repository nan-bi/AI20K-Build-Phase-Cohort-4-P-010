import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { RequestBookingOtpDto, ConfirmBookingDto, CreateBookingDto, CancelBookingDto, RescheduleBookingDto, RateBookingDto } from './dto/booking.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('3. Booking & Đón sảnh 1-chạm')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Đặt lịch xem phòng trực tiếp',
    description: 'Tạo Viewing, phân bổ Field Host phân khu và tạo Dispatch Ticket',
  })
  async createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(dto);
  }

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
  @Get('by-ref/:ref')
  @ApiOperation({ summary: 'Tra cứu lịch xem theo mã tham chiếu (vd: VIEW-S1.02-839201)' })
  async getByRef(@Param('ref') ref: string) {
    return this.bookingService.getByRef(ref);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết lịch hẹn xem phòng và Host phụ trách' })
  async getViewingDetails(@Param('id') id: string) {
    return this.bookingService.getViewingDetails(id);
  }

  @Public()
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy lịch hẹn xem phòng' })
  async cancelBooking(@Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingService.cancelBooking(id, dto);
  }

  @Public()
  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Đổi khung giờ xem phòng' })
  async rescheduleBooking(@Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.rescheduleBooking(id, dto);
  }

  @Public()
  @Post(':id/rating')
  @ApiOperation({ summary: 'Đánh giá chất lượng phục vụ của Field Host sau buổi xem' })
  async rateBooking(@Param('id') id: string, @Body() dto: RateBookingDto) {
    return this.bookingService.rateBooking(id, dto);
  }
}
