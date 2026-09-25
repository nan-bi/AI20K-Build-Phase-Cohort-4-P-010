import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HandoverService } from './handover.service';
import { CreateDigitalHandoverDto } from './dto/handover.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('9. Hộ chiếu Bàn giao số (10 hạng mục)')
@Controller('handovers')
export class HandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Lập Hộ chiếu Bàn giao số (Check-in / Check-out 10 hạng mục)',
    description: 'Kiểm định 10 hạng mục nội thất + chỉ số công tơ điện nước Host nhập tay + ảnh chứng cứ timestamp',
  })
  async createHandover(@Body() dto: CreateDigitalHandoverDto) {
    return this.handoverService.createHandover(dto);
  }

  @Public()
  @Get('contracts/:contractId')
  @ApiOperation({ summary: 'Xem lịch sử các biên bản bàn giao của hợp đồng' })
  async getHandoverByContract(@Param('contractId') contractId: string) {
    return this.handoverService.getHandoverByContract(contractId);
  }
}
