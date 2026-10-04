import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import {
  CreateBookingDto,
  CancelBookingDto,
  RescheduleBookingDto,
  RateBookingDto,
} from './dto/booking.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('3. Booking & Đón sảnh 1-chạm')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Roles('tenant')
  @Post()
  @ApiOperation({
    summary: 'A6: Đặt lịch xem phòng trực tiếp',
    description: 'Tạo Viewing, phân bổ Field Host phân khu và tạo Dispatch Ticket (SLA 180s)',
  })
  async createBooking(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(user, dto);
  }

  @Roles('tenant')
  @Get(':ref')
  @ApiOperation({ summary: 'A8: Xem chi tiết lịch hẹn xem phòng theo mã ref (VS-XXXXX)' })
  async getBookingByRef(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.bookingService.getBookingByRef(ref, user);
  }

  @Roles('tenant')
  @Post(':ref/cancel')
  @ApiOperation({ summary: 'A9: Hủy lịch hẹn xem phòng (trước giờ xem tối thiểu 2h)' })
  async cancelBooking(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(ref, user, dto);
  }

  @Roles('tenant')
  @Post(':ref/reschedule')
  @ApiOperation({ summary: 'A10: Đổi khung giờ xem phòng (trước giờ xem tối thiểu 2h)' })
  async rescheduleBooking(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingService.rescheduleBooking(ref, user, dto);
  }

  @Roles('tenant')
  @Post(':ref/late')
  @ApiOperation({ summary: 'A11: Báo trễ 10 phút' })
  async requestLate(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.bookingService.requestLate(ref, user);
  }

  @Roles('tenant')
  @Post(':ref/lobby-checkin')
  @ApiOperation({
    summary: 'A12: Nút 1-chạm: [📍 Tôi đã có mặt tại sảnh]',
    description: 'Chuyển trạng thái LOBBY để Field Host quẹt thẻ cư dân đón khách',
  })
  async lobbyCheckIn(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.bookingService.lobbyCheckIn(ref, user);
  }

  @Roles('tenant')
  @Post(':ref/rating')
  @ApiOperation({ summary: 'A13: Đánh giá chất lượng phục vụ của Field Host sau buổi xem' })
  async rateBooking(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: RateBookingDto,
  ) {
    return this.bookingService.rateBooking(ref, user, dto);
  }
}
