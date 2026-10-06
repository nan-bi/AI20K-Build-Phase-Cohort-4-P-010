import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { authError } from '../auth.errors';
import { requestContext } from '../auth.controller';
import { SendOtpDto, VerifyOtpDto, VerifyPhoneDto } from '../dto/auth.dto';
import { PhoneService } from '../phone/phone.service';
import { AuthenticatedUser } from '../session/authenticated-user';
import { ACTION_TOKEN_TTL_SECONDS, ActionTokenService } from './action-token.service';
import { OtpService } from './otp.service';
import { PhoneVerificationService } from './phone-verification.service';

const perMinute = (limit: number) => ({ default: { limit, ttl: 60_000 } });

/** OTP chỉ để chứng minh SĐT là thật — KHÔNG phải phương thức đăng nhập. */
@ApiTags('0. Xác thực & Phân quyền (Auth)')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class OtpController {
  constructor(
    private readonly otp: OtpService,
    private readonly actionTokens: ActionTokenService,
    private readonly phones: PhoneService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  private normalizedPhone(raw: string): string {
    const phone = this.phones.normalize(raw);
    if (!phone) throw authError('invalid_phone');
    return phone;
  }

  @Public()
  @Post('otp/send')
  @HttpCode(200)
  @Throttle(perMinute(5))
  @ApiOperation({
    summary: 'Gửi OTP 4 số qua Zalo (dự phòng SMS) để xác thực SĐT',
    description: 'Mỗi SĐT+mục đích chỉ được gửi lại sau OTP_RESEND_SECONDS. OTP chỉ được gửi qua nhà cung cấp đã cấu hình.',
  })
  async send(@Body() dto: SendOtpDto, @Req() req: Request) {
    const phone = this.normalizedPhone(dto.phone);
    await this.otp.send({ phone, purpose: dto.purpose, ...requestContext(req) });
    return { expiresInSeconds: this.otp.expiresInSeconds };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @Throttle(perMinute(10))
  @ApiOperation({
    summary: 'Khách thuê xác thực OTP → nhận action token dùng một lần (không có tài khoản/phiên)',
    description: 'Chỉ cho mục đích TENANT_VIEWING / TENANT_DEPOSIT_SIGN. PHONE_VERIFY xác thực ở `POST /auth/phone/verify`.',
  })
  async verify(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    const phone = this.normalizedPhone(dto.phone);
    const verified = await this.otp.verify({ phone, purpose: dto.purpose, code: dto.code, ...requestContext(req) });
    const actionToken = this.actionTokens.issue({ phone, purpose: dto.purpose, otpId: verified.id });
    return { actionToken, expiresInSeconds: ACTION_TOKEN_TTL_SECONDS };
  }

  @Roles('landlord', 'field_host')
  @Post('phone/verify')
  @HttpCode(200)
  @Throttle(perMinute(10))
  @ApiCookieAuth('session-cookie')
  @ApiOperation({
    summary: 'Chủ nhà / Field Host xác thực SĐT của mình bằng OTP (mục đích PHONE_VERIFY)',
    description: 'Gọi `POST /auth/otp/send` với purpose=PHONE_VERIFY trước. OTP đúng thì SĐT được gắn vào hồ sơ.',
  })
  async verifyPhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyPhoneDto, @Req() req: Request) {
    const phone = this.normalizedPhone(dto.phone);
    await this.phoneVerification.verifyAndBind(user.id, phone, dto.code, requestContext(req));
    return { verified: true };
  }
}
