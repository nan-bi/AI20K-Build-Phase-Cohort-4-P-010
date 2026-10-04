import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { requestContext } from '../auth/auth.controller';
import { AuthenticatedUser } from '../auth/session/authenticated-user';
import { CreateFieldHostDto, ListFieldHostsQueryDto, UpdateFieldHostDto } from './dto/field-hosts.dto';
import { FieldHostsService } from './field-hosts.service';

/** Admin quản lý Field Host (Sale / Thẩm định). Khoá vai ở mức class: không route nào công khai. */
@ApiTags('10. Admin Portal & Biến phí Host')
@ApiCookieAuth('session-cookie')
@Roles('ops_admin')
@Controller('admin/field-hosts')
export class FieldHostsController {
  constructor(private readonly hosts: FieldHostsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách Field Host (lọc theo tên/email/SĐT, vai, phân khu, trạng thái)' })
  list(@Query() query: ListFieldHostsQueryDto) {
    return this.hosts.list(query);
  }

  // Khai báo TRƯỚC `:id` để "zones" không bị coi là id.
  @Get('zones')
  @ApiOperation({ summary: 'Danh sách phân khu hợp lệ để gán cho Host' })
  zones() {
    return this.hosts.zones();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hồ sơ một Field Host (kèm thống kê ticket)' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.hosts.detail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Thêm Field Host (tạo tài khoản + hồ sơ Host + vai)',
    description:
      'Host đăng nhập bằng email này (Google hoặc mật khẩu nếu Admin đặt) và tự xác thực SĐT trong hồ sơ. ' +
      'Email là Profile field_host chưa có hồ sơ Host (chỉnh tay) ⇒ được nhận vào, không tạo tài khoản thứ hai.',
  })
  create(@Body() dto: CreateFieldHostDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.hosts.create(dto, actor, requestContext(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa họ tên, phân khu, vai, mật khẩu; khoá/mở khoá (`isActive`). Email không sửa được.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldHostDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.hosts.update(id, dto, actor, requestContext(req));
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Khoá Field Host (khoá mềm, giữ lịch sử ca/hoa hồng)',
    description: 'Host đang có ca được giao/đang dẫn ⇒ 409 `host_has_active_tickets`. Mở khoá: `PATCH` `{ isActive: true }`.',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    return this.hosts.deactivate(id, actor, requestContext(req));
  }
}
