import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepositService } from './deposit.service';
import { GenerateVietQrDto, VietQrWebhookDto, UploadHostReceiptDto } from './dto/deposit.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('5. Cọc VietQR 2M & Khóa Giữ Chỗ')
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
    description: 'Chuyển căn sang HOLDING theo số giờ cài đặt (mặc định 48h), hủy tự động lịch trùng, cộng ví +450k cho Field Host',
  })
  async processWebhook(@Body() dto: VietQrWebhookDto) {
    return this.depositService.processWebhook(dto);
  }

  @Public()
  @Post(':id/host-receipt')
  @ApiOperation({
    summary: 'Host tải ảnh ủy nhiệm chi (UNC) khi webhook ngân hàng chậm',
    description: 'Khóa tạm căn hộ trong 30 phút để đối soát thanh toán',
  })
  async uploadHostReceipt(@Param('id') id: string, @Body() dto: UploadHostReceiptDto) {
    return this.depositService.uploadHostReceipt(id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem trạng thái cọc giữ chỗ và thông tin đếm ngược thời hạn giữ căn' })
  async getDepositStatus(@Param('id') id: string) {
    return this.depositService.getDepositStatus(id);
  }
}
