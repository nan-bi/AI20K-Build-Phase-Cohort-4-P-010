import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { PropertyFilterDto } from './dto/property-query.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('1. Property & All-in Cost')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Public()
  @Get('buildings')
  @ApiOperation({ summary: 'Lấy danh sách các tòa nhà tại Vinhomes Ocean Park (Sapphire 1 & 2)' })
  async getBuildings() {
    return this.propertyService.getBuildings();
  }

  @Public()
  @Get('units')
  @ApiOperation({
    summary: 'Tìm kiếm căn hộ & Bóc tách 4 khoản phí All-in Cost thời gian thực',
    description: 'Bóc tách tiền thuê gốc + phí BQL (9.5k/m2) + phí xe máy/ô tô + điện nước ước tính (300k/người)',
  })
  async getUnits(@Query() query: PropertyFilterDto) {
    return this.propertyService.getUnits(query);
  }

  @Public()
  @Get('units/:id')
  @ApiOperation({ summary: 'Chi tiết căn hộ, bộ ảnh kiểm định timestamp & chi tiết All-in Cost' })
  @ApiQuery({ name: 'motorbikes', required: false, example: 1 })
  @ApiQuery({ name: 'cars', required: false, example: 0 })
  @ApiQuery({ name: 'occupants', required: false, example: 2 })
  async getUnitById(
    @Param('id') id: string,
    @Query('motorbikes') motorbikes?: number,
    @Query('cars') cars?: number,
    @Query('occupants') occupants?: number,
  ) {
    return this.propertyService.getUnitById(id, motorbikes ? Number(motorbikes) : 1, cars ? Number(cars) : 0, occupants ? Number(occupants) : 2);
  }
}
