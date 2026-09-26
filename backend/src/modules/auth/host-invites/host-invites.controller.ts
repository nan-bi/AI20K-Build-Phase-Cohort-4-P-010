import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateHostInviteDto } from '../dto/auth.dto';
import { HostInvitesService } from './host-invites.service';

@ApiTags('10. Admin Portal & Biến phí Host')
@ApiCookieAuth('session-cookie')
@Roles('ops_admin')
@Controller('admin/field-hosts')
export class HostInvitesController {
  constructor(private readonly invites: HostInvitesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách Field Host đã mời (`registered` = đã đăng ký và nhập đúng RFID)' })
  list() {
    return this.invites.list();
  }

  @Post()
  @ApiOperation({
    summary: 'Mời Field Host bằng email + mã thẻ RFID',
    description: 'Email không có lời mời thì không đăng ký được cổng Field Host.',
  })
  create(@Body() dto: CreateHostInviteDto) {
    return this.invites.create(dto);
  }
}
