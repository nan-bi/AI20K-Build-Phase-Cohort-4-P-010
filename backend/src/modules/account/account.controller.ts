import { Controller, Get, Patch, Put, Delete, Body, Param, Res, Optional } from '@nestjs/common';
import { ApiCookieAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AccountService } from './account.service';
import { LeasePdfService } from '../contract/lease-pdf.service';
import { UpdateProfileDto } from './dto/account.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Mọi route `/me/*` yêu cầu đăng nhập (guard toàn cục gắn `request.user`) và CHỈ trả dữ liệu của chính người gọi.
 * Tuyệt đối không đánh dấu `@Public()` ở đây: không có `request.user` thì không có "người dùng hiện tại".
 */
@ApiTags('11. Tài khoản & Hồ sơ cá nhân (/me)')
@ApiCookieAuth('session-cookie')
@Controller('me')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    @Optional() private readonly leasePdfService?: LeasePdfService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.accountService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản (hiện chỉ họ tên)' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.accountService.updateProfile(userId, dto);
  }

  @Roles('tenant')
  @Get('bookings')
  @ApiOperation({ summary: 'A7: Danh sách lịch hẹn xem phòng của người dùng' })
  getBookings(@CurrentUser('id') userId: string) {
    return this.accountService.getBookings(userId);
  }

  @Roles('tenant')
  @Get('contracts')
  @ApiOperation({ summary: 'A19: Danh sách hợp đồng thuê của khách thuê' })
  getContracts(@CurrentUser('id') userId: string) {
    return this.accountService.getContracts(userId);
  }

  @Roles('tenant')
  @Get('contracts/:id/pdf')
  @ApiOperation({ summary: 'A20: Tải file PDF hợp đồng thuê' })
  async getContractPdf(
    @Param('id') contractId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.leasePdfService.getPdfStream(
      contractId,
      userId,
      'tenant',
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Danh sách căn hộ đã lưu yêu thích' })
  getFavorites(@CurrentUser('id') userId: string) {
    return this.accountService.getFavorites(userId);
  }

  @Put('favorites/:unitId')
  @ApiOperation({ summary: 'Thêm căn hộ vào danh sách yêu thích' })
  addFavorite(@CurrentUser('id') userId: string, @Param('unitId') unitId: string) {
    return this.accountService.addFavorite(userId, unitId);
  }

  @Delete('favorites/:unitId')
  @ApiOperation({ summary: 'Xóa căn hộ khỏi danh sách yêu thích' })
  removeFavorite(@CurrentUser('id') userId: string, @Param('unitId') unitId: string) {
    return this.accountService.removeFavorite(userId, unitId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Danh sách thông báo người dùng' })
  getNotifications(@CurrentUser('id') userId: string) {
    return this.accountService.getNotifications(userId);
  }
}
