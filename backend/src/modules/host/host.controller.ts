import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HostService } from './host.service';
import { AcceptInspectionDto, SubmitInspectionReportDto } from './dto/host.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('4.1. Field Host & Thẩm định (/host)')
@Controller('host')
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Public()
  @Get('inspections')
  @ApiOperation({ summary: 'Danh sách căn ký gửi cần Host phân khu thẩm định' })
  @ApiQuery({ name: 'hostId', required: false })
  async getInspections(@Query('hostId') hostId?: string) {
    return this.hostService.getInspections(hostId);
  }

  @Public()
  @Post('inspections/:consignmentId/accept')
  @ApiOperation({ summary: 'Host nhận việc thẩm định căn ký gửi' })
  async acceptInspection(@Param('consignmentId') consignmentId: string, @Body() dto: AcceptInspectionDto) {
    return this.hostService.acceptInspection(consignmentId, dto);
  }

  @Public()
  @Post('inspections/:consignmentId/report')
  @ApiOperation({ summary: 'Host nộp báo cáo thẩm định (kiểm kê 32 hạng mục, đối chiếu thông tin)' })
  async submitInspectionReport(
    @Param('consignmentId') consignmentId: string,
    @Body() dto: SubmitInspectionReportDto,
  ) {
    return this.hostService.submitInspectionReport(consignmentId, dto);
  }

  @Public()
  @Get('earnings')
  @ApiOperation({ summary: 'Thống kê thu nhập Field Host (lượt dẫn, hoa hồng chốt cọc, thưởng)' })
  @ApiQuery({ name: 'hostId', required: false })
  async getEarnings(@Query('hostId') hostId?: string) {
    return this.hostService.getEarnings(hostId);
  }
}
