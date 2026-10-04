import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { PropertyFilterDto } from './dto/property-query.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('1. Property & All-in Cost')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Public()
  @Get('buildings')
  @ApiOperation({ summary: 'Lấy danh sách các tòa nhà tại Vinhomes Ocean Park' })
  async getBuildings() {
    return this.propertyService.getBuildings();
  }

  @Public()
  @Get('units')
  @ApiOperation({
    summary: 'A1: Danh mục căn hộ công khai',
    description: 'Chỉ hiển thị căn hộ đã kiểm định (isVerified=true), trạng thái AVAILABLE hoặc HOLDING, có ảnh.',
  })
  async getUnits(@Query() query: PropertyFilterDto) {
    return this.propertyService.getUnits(query);
  }

  @Public()
  @Get('units/:code/busy-slots')
  @ApiOperation({
    summary: 'A3: Danh sách các khung giờ bận của căn hộ',
    description: 'Trả về danh sách ISO timestamp các slot đã có lịch xem sống hoặc căn đang giữ chỗ.',
  })
  @ApiQuery({ name: 'from', required: false, description: 'ISO string thời điểm bắt đầu' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO string thời điểm kết thúc' })
  async getBusySlots(
    @Param('code') code: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.propertyService.getBusySlots(code, from, to);
  }

  @Public()
  @Get('units/:code')
  @ApiOperation({ summary: 'A2: Chi tiết căn hộ công khai theo unitCode hoặc ID' })
  async getUnitByCode(@Param('code') code: string) {
    return this.propertyService.getUnitByCode(code);
  }
}
