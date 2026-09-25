import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateCommissionParamDto } from './dto/admin.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('10. Admin Portal & Biến phí Host')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get('bi-funnel')
  @ApiOperation({
    summary: 'Module 1: BI Funnel & Bản đồ nhiệt lấp đầy (Occupancy Heatmap)',
    description: 'Phễu 6 giai đoạn thời gian thực (no-show 3.8%) và Heatmap phân khu Sapphire 1 & 2',
  })
  async getBiFunnel() {
    return this.adminService.getBiFunnelAndHeatmap();
  }

  @Public()
  @Get('exclusive-inventory')
  @ApiOperation({
    summary: 'Module 2: Quản lý Rổ hàng Độc quyền & Giám sát Thoát 15 ngày',
    description: 'Theo dõi 128 căn hộ và countdown widget đếm ngược thoát ủy quyền linh hoạt',
  })
  async getInventory() {
    return this.adminService.getExclusiveInventory();
  }

  @Public()
  @Get('dispatch-sla')
  @ApiOperation({
    summary: 'Module 3: Giám sát Điều phối SLA Field Host',
    description: 'Giám sát thời gian phản hồi ca trực 3-5 phút, cảnh báo đỏ khi quá hạn cho Area Lead',
  })
  async getDispatchSla() {
    return this.adminService.getDispatchSlaMonitoring();
  }

  @Public()
  @Get('commission-engine')
  @ApiOperation({
    summary: 'Module 4: Dynamic Commission & Incentive Engine',
    description: 'Bảng kê thanh toán tuần của Host và 4 tham số biến phí tự động tính toán',
  })
  async getCommissionEngine() {
    return this.adminService.getCommissionEngine();
  }

  @Public()
  @Post('commission-engine/config')
  @ApiOperation({
    summary: 'Điều chỉnh tham số biến phí (Dynamic Commission) có ghi nhận Audit Log',
    description: 'Thay đổi thù lao dẫn, hoa hồng chốt cọc, hệ số sao 5-star, ghi lại audit old/new/reason',
  })
  async updateCommissionParam(@Body() dto: UpdateCommissionParamDto) {
    return this.adminService.updateCommissionParam(dto);
  }
}
