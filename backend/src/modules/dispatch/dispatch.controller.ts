import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { AcceptTicketDto } from './dto/dispatch.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('4. Field Host PWA & Điều phối')
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Public()
  @Get('tickets')
  @ApiOperation({ summary: 'Lấy danh sách Ticket ca trực của Field Host' })
  @ApiQuery({ name: 'hostId', required: false })
  async getHostTickets(@Query('hostId') hostId?: string) {
    return this.dispatchService.getHostTickets(hostId);
  }

  @Public()
  @Post('tickets/:id/accept')
  @ApiOperation({
    summary: 'Nút 1-chạm: [⚡ NHẬN CA TRỰC NGAY] (SLA đếm ngược 3-5 phút)',
    description: 'Host bấm nhận ticket, chuyển trạng thái ACCEPTED, chuẩn bị đón sảnh',
  })
  async acceptTicket(@Param('id') id: string, @Body() dto: AcceptTicketDto) {
    return this.dispatchService.acceptTicket(id, dto.hostId);
  }

  @Public()
  @Post('tickets/:id/elevator-rfid')
  @ApiOperation({
    summary: 'Nút 1-chạm: [💳 QUẸT THẺ CƯ DÂN THANG MÁY]',
    description: 'Xác nhận Host đã quẹt thẻ RFID đưa khách lên tầng phòng trong 60 giây',
  })
  async swipeElevatorRfid(@Param('id') id: string) {
    return this.dispatchService.swipeElevatorRfid(id);
  }

  @Public()
  @Post('tickets/:id/reveal-key')
  @ApiOperation({
    summary: 'Nút 1-chạm tại cửa căn hộ: [🔓 XÁC NHẬN XEM PHÒNG & CẤP MÃ CỬA]',
    description: 'Cấp mã PIN cố định từ Vault (AES-256) chỉ khi ticket active. Không dùng Lockbox. Tự gửi alert Zalo báo cho Chủ nhà.',
  })
  async revealDoorKey(@Param('id') id: string) {
    return this.dispatchService.revealDoorKey(id);
  }
}
