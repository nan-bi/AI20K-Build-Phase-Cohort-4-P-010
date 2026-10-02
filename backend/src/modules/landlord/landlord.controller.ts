import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LandlordService } from './landlord.service';
import { RequestExitMandateDto, CancelExitMandateDto, CreateConsignmentDto, SignConsignmentDto } from './dto/landlord.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('8. Chủ nhà Ở Nhà 100% & Ký Gửi')
@Controller('landlord')
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  @Public()
  @Get('dashboard')
  @ApiOperation({
    summary: 'Bảng điều khiển Chủ nhà "Ở nhà 100%" (0km, 0 phút)',
    description: 'Giám sát từ xa tình trạng căn hộ, trạng thái HOLDING và tiền cọc 2M đã gạch nợ',
  })
  @ApiQuery({ name: 'landlordId', required: false })
  async getDashboard(@Query('landlordId') landlordId?: string) {
    return this.landlordService.getLandlordDashboard(landlordId);
  }

  @Public()
  @Get('units')
  @ApiOperation({ summary: 'Danh sách các căn hộ của Chủ nhà' })
  @ApiQuery({ name: 'landlordId', required: false })
  async getLandlordUnits(@Query('landlordId') landlordId?: string) {
    return this.landlordService.getLandlordUnits(landlordId);
  }

  @Public()
  @Get('units/:id')
  @ApiOperation({ summary: 'Chi tiết căn hộ của Chủ nhà' })
  async getLandlordUnitById(@Param('id') id: string) {
    return this.landlordService.getLandlordUnitById(id);
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
  @Post('consignments')
  @ApiOperation({ summary: 'Tạo hồ sơ ký gửi căn hộ mới' })
  async createConsignment(@Body() dto: CreateConsignmentDto) {
    return this.landlordService.createConsignment(dto);
  }

  @Public()
  @Get('consignments/:id')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ ký gửi & kết quả thẩm định' })
  async getConsignmentById(@Param('id') id: string) {
    return this.landlordService.getConsignmentById(id);
  }

  @Public()
  @Post('consignments/:id/sign')
  @ApiOperation({ summary: 'Ký số ủy quyền độc quyền (chuyển giao Host phân khu thẩm định)' })
  async signConsignment(@Param('id') id: string, @Body() dto: SignConsignmentDto) {
    return this.landlordService.signConsignment(id, dto);
  }

  @Public()
  @Get('finance')
  @ApiOperation({ summary: 'Bảng kê tài chính, khoản thu, thực nhận sau phí dịch vụ' })
  @ApiQuery({ name: 'landlordId', required: false })
  async getLandlordFinance(@Query('landlordId') landlordId?: string) {
    return this.landlordService.getLandlordFinance(landlordId);
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

  @Public()
  @Post('mandates/cancel-exit')
  @ApiOperation({ summary: 'Hủy yêu cầu thoát ủy quyền' })
  async cancelExitMandate(@Body() dto: CancelExitMandateDto) {
    return this.landlordService.cancelExitMandate(dto);
  }
}
