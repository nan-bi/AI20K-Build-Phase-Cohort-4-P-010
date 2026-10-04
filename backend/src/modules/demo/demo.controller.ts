import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DemoGuard } from './demo.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingService } from '../booking/booking.service';

@ApiTags('Demo Tools (Development Only)')
@Controller('demo')
@UseGuards(DemoGuard)
export class DemoController {
  constructor(private readonly bookingService: BookingService) {}

  @Roles('tenant')
  @Post('bookings/:ref/:step')
  @ApiOperation({
    summary: 'A21: Tua nhanh trạng thái lịch hẹn xem phòng cho demo',
    description: 'Chỉ hoạt động khi DEMO_TOOLS=true và NODE_ENV!==production. Yêu cầu đăng nhập vai tenant và sở hữu lịch hẹn.',
  })
  async executeStep(
    @Param('ref') ref: string,
    @Param('step') step: string,
    @CurrentUser() user: any,
  ) {
    return this.bookingService.executeDemoStep(ref, step, user);
  }
}
