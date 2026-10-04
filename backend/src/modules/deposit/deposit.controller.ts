import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Query,
  Req,
  UnauthorizedException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DepositService } from './deposit.service';
import {
  CreateDepositDto,
  VietQrWebhookInputDto,
  UploadHostReceiptDto,
} from './dto/deposit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('5. Cọc VietQR 2M & Khóa Giữ Chỗ')
@Controller()
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Public()
  @Get('legal/deposit-terms')
  @ApiOperation({
    summary: 'A14 (công khai): biên bản điều khoản đặt cọc giữ chỗ — khách đọc trước khi tick và quét VietQR',
    description: 'Có `?unitCode=` thì số giờ giữ chỗ là của căn đó; không có thì dùng giờ mặc định Admin cài.',
  })
  async getPublicDepositTerms(@Query('unitCode') unitCode?: string) {
    return this.depositService.getPublicDepositTerms(unitCode);
  }

  @Roles('tenant')
  @Get('bookings/:ref/deposit/terms')
  @ApiOperation({
    summary: 'A14: Lấy biên bản điều khoản đặt cọc giữ chỗ trước khi tick chấp thuận',
  })
  async getDepositTerms(@Param('ref') ref: string, @CurrentUser() user: any) {
    return this.depositService.getDepositTerms(ref, user);
  }

  @Roles('tenant')
  @Post('bookings/:ref/deposit')
  @ApiOperation({
    summary: 'A15: Chấp thuận điều khoản cọc & Tạo giao dịch cọc VietQR 2.000.000 VNĐ',
  })
  async createDeposit(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: CreateDepositDto,
    @Req() req: Request,
  ) {
    return this.depositService.createDeposit(ref, user, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('vietqr/webhook')
  @ApiOperation({
    summary: 'A16: Webhook Ngân hàng tự động gạch nợ (First-to-Pay Wins)',
  })
  async vietqrWebhook(
    @Headers('x-vietqr-secret') secretHeader: string = '',
    @Body() dto: VietQrWebhookInputDto,
  ) {
    const expectedSecret = process.env.VIETQR_WEBHOOK_SECRET;
    if (!expectedSecret) {
      throw new ServiceUnavailableException({
        message: 'VietQR webhook secret is not configured.',
        code: 'webhook_not_configured',
      });
    }

    const secretBuf = Buffer.from(secretHeader);
    const expectedBuf = Buffer.from(expectedSecret);

    if (
      secretBuf.length !== expectedBuf.length ||
      !timingSafeEqual(secretBuf, expectedBuf)
    ) {
      throw new UnauthorizedException({
        message: 'Mã bí mật webhook không hợp lệ.',
        code: 'webhook_secret_invalid',
      });
    }

    const outcome = await this.depositService.markPaid({
      depositCode: dto.depositCode,
      transferContent: dto.transferContent,
      amount: dto.amount,
      bankRefNumber: dto.bankRefNumber,
      actor: 'bank',
    });

    return { success: true, outcome };
  }

  @Roles('field_host')
  @Post('deposits/:id/host-receipt')
  @ApiOperation({
    summary: 'Host tải ảnh ủy nhiệm chi (UNC) khi webhook ngân hàng chậm',
  })
  async uploadHostReceipt(
    @Param('id') id: string,
    @Body() dto: UploadHostReceiptDto,
  ) {
    return this.depositService.uploadHostReceipt(id, dto);
  }
}
