import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LandlordService } from './landlord.service';
import { RequestExitMandateDto } from './dto/landlord.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('8. Chủ nhà Ở Nhà 100% & Thoát 15 ngày')
@Controller('landlord')
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  @Public()
  @Get('dashboard')
  @ApiOperation({
    summary: 'Bảng điều khiển Chủ nhà "Ở nhà 100%" (0km, 0 phút)',
    description: 'Giám sát từ xa tình trạng căn hộ, trạng thái HOLDING 7 ngày và tiền cọc 2M đã gạch nợ',
  })
  @ApiQuery({ name: 'landlordId', required: false })
  async getDashboard(@Query('landlordId') landlordId?: string) {
    return this.landlordService.getLandlordDashboard(landlordId);
  }

  @Public()
  @Get('units/:unitId/audit-trail')
  @ApiOperation({
    summary: 'Nhật ký mở cửa xem phòng (Audit Trail) của căn hộ',
    description: 'Minh bạch 100% từng lượt mở cửa: ai mở, lúc nào, thiết bị nào',
  })
  async getUnitDoorAuditTrail(@Param('unitId') unitId: string) {
    return this.landlordService.getUnitDoorAuditTrail(unitId);
  }

  @Public()
  @Post('mandates/request-exit')
  @ApiOperation({
    summary: 'Kích hoạt Thoát ủy quyền linh hoạt 15 ngày (Exit Clause)',
    description: 'Chỉ áp dụng khi căn Available. Tự động đếm ngược 15 ngày, hết hạn xóa sạch mã cửa khỏi mạng lưới Host.',
  })
  async requestExitMandate(@Body() dto: RequestExitMandateDto) {
    return this.landlordService.requestExitMandate(dto);
  }
}
