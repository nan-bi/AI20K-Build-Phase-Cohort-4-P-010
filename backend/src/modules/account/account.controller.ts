import { Controller, Get, Patch, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/account.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('11. Tài khoản & Hồ sơ cá nhân (/me)')
@Controller('me')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Public()
  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id;
    return this.accountService.getProfile(userId);
  }

  @Public()
  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user?.id;
    return this.accountService.updateProfile(userId, dto);
  }

  @Public()
  @Get('bookings')
  @ApiOperation({ summary: 'Danh sách lịch hẹn xem phòng của người dùng' })
  async getBookings(@Req() req: any) {
    const userId = req.user?.id;
    return this.accountService.getBookings(userId);
  }

  @Public()
  @Get('contracts')
  @ApiOperation({ summary: 'Danh sách hợp đồng thuê & bàn giao của người dùng' })
  async getContracts(@Req() req: any) {
    const userId = req.user?.id;
    return this.accountService.getContracts(userId);
  }

  @Public()
  @Get('favorites')
  @ApiOperation({ summary: 'Danh sách căn hộ đã lưu yêu thích' })
  async getFavorites() {
    return this.accountService.getFavorites();
  }

  @Public()
  @Put('favorites/:unitId')
  @ApiOperation({ summary: 'Thêm căn hộ vào danh sách yêu thích' })
  async addFavorite(@Param('unitId') unitId: string) {
    return this.accountService.addFavorite(unitId);
  }

  @Public()
  @Delete('favorites/:unitId')
  @ApiOperation({ summary: 'Xóa căn hộ khỏi danh sách yêu thích' })
  async removeFavorite(@Param('unitId') unitId: string) {
    return this.accountService.removeFavorite(unitId);
  }

  @Public()
  @Get('notifications')
  @ApiOperation({ summary: 'Danh sách thông báo người dùng' })
  async getNotifications(@Req() req: any) {
    const userId = req.user?.id;
    return this.accountService.getNotifications(userId);
  }
}
