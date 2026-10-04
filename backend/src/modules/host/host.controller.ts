import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiCookieAuth } from '@nestjs/swagger';
import { HostService } from './host.service';
import { Public } from '../../common/decorators/public.decorator';
import { HostRoles } from '../../common/decorators/host-roles.decorator';
import { SetDutyDto } from '../host-viewings/dto/host-viewings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/session/authenticated-user';

@ApiTags('4.1. Field Host & Thẩm định (/host)')
@Controller('host')
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Get('me')
  @Roles('field_host')
  @ApiCookieAuth('session-cookie')
  @ApiOperation({
    summary: 'Hồ sơ của chính Field Host đang đăng nhập (vai, phân khu, SĐT đã xác thực, ca trực)',
    description: 'Không trả số thẻ RFID, mật khẩu hay SĐT dạng mã hoá. Xác thực SĐT: `POST /auth/otp/send` (PHONE_VERIFY) → `POST /auth/phone/verify`.',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.hostService.getMe(user.id);
  }

  @Patch('me/duty')
  @Roles('field_host')
  @HostRoles('sale')
  @ApiCookieAuth('session-cookie')
  @ApiOperation({
    summary: 'H1 — Bật/tắt trực (điều kiện để được giao ticket tầng 1)',
    description: 'Đang dẫn khách (RECEIVING/VIEWING) ⇒ 409 `host_busy` khi tắt trực.',
  })
  async setDuty(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetDutyDto) {
    return this.hostService.setDuty(user.id, dto.status);
  }

  @Public()
  @Get('earnings')
  @ApiOperation({ summary: 'Thống kê thu nhập Field Host (lượt dẫn, hoa hồng chốt cọc, thưởng)' })
  @ApiQuery({ name: 'hostId', required: false })
  async getEarnings(@Query('hostId') hostId?: string) {
    return this.hostService.getEarnings(hostId);
  }
}
