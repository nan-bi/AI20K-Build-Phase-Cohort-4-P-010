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
    summary: 'A17: Quét CCCD qua nhà cung cấp eKYC đã cấu hình',
    description: 'Hiện trả lỗi ekyc_provider_unavailable cho đến khi nhà cung cấp thật được tích hợp.',
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
    description: 'Hiện bị khóa cho đến khi có kết quả xác minh từ nhà cung cấp eKYC thật.',
  })
  async submit(
    @Param('ref') ref: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitEkycInputDto,
  ) {
    return this.identityService.submit(ref, user, dto);
  }
}
