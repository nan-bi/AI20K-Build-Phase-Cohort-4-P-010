import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HostRoles } from '../../common/decorators/host-roles.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { requestContext } from '../auth/auth.controller';
import { AuthenticatedUser } from '../auth/session/authenticated-user';
import { EmergencyDto, NotInterestedDto, RejectTicketDto } from './dto/host-viewings.dto';
import { HostActorService } from './host-actor.service';
import { HostBoardService } from './host-board.service';
import { ViewingFlowService } from './viewing-flow.service';

/**
 * Cổng Sale "Lịch & yêu cầu" (hồ sơ 15). Khoá vai ở mức class: chỉ Field Host có vai `sale`; không route nào công khai.
 * Mọi thao tác trên ca chỉ dành cho CHỦ CA (khác ⇒ 404 `viewing_not_found`).
 */
@ApiTags('4.2. Sale — Lịch & yêu cầu (/host)')
@ApiCookieAuth('session-cookie')
@Roles('field_host')
@HostRoles('sale')
@Controller('host')
export class HostViewingsController {
  constructor(
    private readonly actors: HostActorService,
    private readonly board: HostBoardService,
    private readonly flow: ViewingFlowService,
  ) {}

  @Get('board')
  @ApiOperation({ summary: 'D1 — Bảng yêu cầu mới · lịch của tôi · lịch sử · KPI (1 request)' })
  async getBoard(@CurrentUser() user: AuthenticatedUser) {
    return this.board.board(await this.actors.resolve(user.id));
  }

  @Post('tickets/:id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'D2 — Nhận ticket được giao (trong 3 phút SLA)' })
  async accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.accept(id, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('tickets/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'D3 — Từ chối ticket được giao (kèm lý do) ⇒ giao Sale khác' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectTicketDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.flow.reject(id, await this.actors.resolve(user.id), dto.reason, requestContext(req));
    return { rejected: true };
  }

  @Post('tickets/:id/claim')
  @HttpCode(200)
  @ApiOperation({ summary: 'D4 — Nhận ticket trong Open Pool (ai nhận trước được giao, nguyên tử)' })
  async claim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.claim(id, await this.actors.resolve(user.id), requestContext(req));
  }

  @Get('viewings/:ref')
  @ApiOperation({ summary: 'V1 — Chi tiết ca xem (chỉ chủ ca; có SĐT đầy đủ của khách)' })
  async detail(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser) {
    return this.flow.detail(ref, await this.actors.resolve(user.id));
  }

  @Post('viewings/:ref/remind')
  @HttpCode(200)
  @ApiOperation({ summary: 'V2 — Nhắc hẹn T-10 (chỉ ghi mốc; chưa gửi Zalo thật)' })
  async remind(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.remind(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/receive')
  @HttpCode(200)
  @ApiOperation({ summary: 'V3 — Đã đón khách ở sảnh (⇒ RECEIVING, Host bận)' })
  async receive(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.receive(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/open-door')
  @HttpCode(200)
  @ApiOperation({
    summary: 'V4 — Mở cửa: ca sang VIEWING và trả mã cửa (hiệu lực hiển thị 10 phút, ghi audit cho chủ nhà)',
    description: 'Chỉ chủ ca, chỉ khi ca đang RECEIVING. Căn chưa có mã hợp lệ ⇒ 409 `door_code_missing` (không có PIN giả).',
  })
  async openDoor(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.openDoor(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/door-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'V5 — Xem lại mã cửa khi ca đang VIEWING (mỗi lần ghi audit)' })
  async doorCode(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.revealDoorCode(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/no-show')
  @HttpCode(200)
  @ApiOperation({ summary: 'V6 — Báo khách không đến (sau giờ hẹn 15 phút)' })
  async noShow(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.noShow(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/start-deposit')
  @HttpCode(200)
  @ApiOperation({
    summary: 'V7 — Khách muốn cọc ⇒ CLOSING (khách tự quét VietQR; Host không đụng tiền)',
  })
  async startDeposit(@Param('ref') ref: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.flow.startDeposit(ref, await this.actors.resolve(user.id), requestContext(req));
  }

  @Post('viewings/:ref/not-interested')
  @HttpCode(200)
  @ApiOperation({ summary: 'V8 — Khách chưa quyết / không thuê ⇒ đóng ca COMPLETED' })
  async notInterested(
    @Param('ref') ref: string,
    @Body() dto: NotInterestedDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.flow.notInterested(ref, await this.actors.resolve(user.id), dto.reason, requestContext(req));
  }

  @Post('viewings/:ref/emergency')
  @HttpCode(200)
  @ApiOperation({ summary: 'V9 — Báo sự cố khoá / chìa (ghi nhật ký ca, không gọi dịch vụ ngoài)' })
  async emergency(
    @Param('ref') ref: string,
    @Body() dto: EmergencyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.flow.emergency(ref, await this.actors.resolve(user.id), dto.kind, dto.note, requestContext(req));
  }
}
