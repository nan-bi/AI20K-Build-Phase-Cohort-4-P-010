import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { EkycScanRequestDto, SubmitEkycInputDto } from './dto/identity.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('6. FPT.AI eKYC & Zero-Storage')
@Controller()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Roles('tenant')
  @Post('bookings/:ref/ekyc/scan')
  @ApiOperation({
    summary: 'A17: Bắt đầu phiên quét eKYC mô phỏng (CCCD gắn chip)',
    description: 'Tạo mã scanId HMAC 15 phút, trả kết quả trích xuất CCCD và độ tin cậy từng trường',
  })
  async scan(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: EkycScanRequestDto,
  ) {
    return this.identityService.scan(ref, user, dto);
  }

  @Roles('tenant')
  @Post('bookings/:ref/ekyc')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'A18: Gửi thông tin eKYC xác nhận & Tự động xác lập Hợp đồng thuê chính thức',
    description: 'Chuyển 100% cọc giữ chỗ 2M sang cọc bảo đảm, chuyển unit sang RENTED, tạo hợp đồng ACTIVE và sinh PDF',
  })
  async submit(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitEkycInputDto,
  ) {
    return this.identityService.submit(ref, user, dto);
  }
}
