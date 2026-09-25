import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepositService } from './deposit.service';
import { GenerateVietQrDto, VietQrWebhookDto } from './dto/deposit.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('5. Cọc VietQR 2M & Khóa 7 ngày')
@Controller('deposits')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Public()
  @Post('generate-vietqr')
  @ApiOperation({
    summary: 'Sinh mã VietQR động 2.000.000 VNĐ kèm Attribution Lock (host_id)',
    description: 'Tạo mã QR Napas247 động, nhúng mã căn và host_id, ràng buộc cọc bảo đảm tài sản',
  })
  async generateVietQr(@Body() dto: GenerateVietQrDto) {
    return this.depositService.generateVietQr(dto);
  }

  @Public()
  @Post('webhook-vietqr')
  @ApiOperation({
    summary: 'Webhook Ngân hàng tự động gạch nợ (SLA <= 5s) & Kích hoạt Conflict Resolver',
    description: 'Chuyển căn sang HOLDING 7 ngày, hủy tự động lịch trùng, cộng ví +450k cho Field Host',
  })
  async processWebhook(@Body() dto: VietQrWebhookDto) {
    return this.depositService.processWebhook(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem trạng thái cọc giữ chỗ và thông tin thời hạn 7 ngày' })
  async getDepositStatus(@Param('id') id: string) {
    return this.depositService.getDepositStatus(id);
  }
}
