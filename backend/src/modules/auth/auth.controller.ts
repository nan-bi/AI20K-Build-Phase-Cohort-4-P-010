import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PORTALS } from './auth.constants';
import { AuthService, LoginOutcome, RequestContext } from './auth.service';
import { LoginDto, PortalQueryDto, SignupDto, VerifyRfidDto } from './dto/auth.dto';
import { GoogleAuthGuard, GoogleCallbackGuard } from './google/google-auth.guard';
import { GoogleIdentity } from './google/google.strategy';
import { AuthenticatedUser } from './session/authenticated-user';
import { SessionCookieService } from './session/session-cookies.service';

const perMinute = (limit: number) => ({ default: { limit, ttl: 60_000 } });

export const requestContext = (req: Request): RequestContext => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

/**
 * Đăng nhập là việc của backend: FE chỉ hiển thị form và gọi các endpoint này. Phiên nằm trong cookie
 * httpOnly (`vs_access`) — response không bao giờ chứa token. API client có thể gửi
 * `Authorization: Bearer <access token>` thay cho cookie. Email + mật khẩu (băm scrypt trong `profiles`) và
 * Google (Passport) đều phát JWT phiên do backend ký; không dùng Supabase Auth, không có refresh token.
 */
@ApiTags('0. Xác thực & Phân quyền (Auth)')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookieService,
  ) {}

  private loginBody({ user, needsRfidVerification, hostId }: LoginOutcome) {
    return { user, needsRfidVerification, ...(hostId ? { hostId } : {}) };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle(perMinute(10))
  @ApiOperation({
    summary: 'Đăng nhập email + mật khẩu vào một cổng (tenant / landlord / host / admin)',
    description:
      'Set cookie phiên httpOnly. Field Host lần đầu trả `needsRfidVerification` + `hostId`: phiên đã có ' +
      'nhưng chỉ dùng được `POST /auth/verify-rfid` cho tới khi nhập đúng thẻ RFID.',
  })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.auth.login(dto, requestContext(req));
    this.cookies.set(res, outcome.tokens);
    return this.loginBody(outcome);
  }

  @Public()
  @Post('signup')
  @HttpCode(200)
  @Throttle(perMinute(5))
  @ApiOperation({
    summary: 'Đăng ký tài khoản (tenant / landlord / host được mời) bằng email + mật khẩu',
    description:
      'Không xác nhận email: đăng ký xong đăng nhập luôn (set cookie phiên, response giống `POST /auth/login`). ' +
      'Email đã có tài khoản (kể cả Google) → 409 `email_already_registered`. ' +
      'Host chỉ đăng ký được nếu Admin đã mời email đó. Admin không có đăng ký.',
  })
  async signup(@Body() dto: SignupDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.auth.signup(dto, requestContext(req));
    this.cookies.set(res, outcome.tokens);
    return this.loginBody(outcome);
  }

  @Public()
  @Post('demo-login')
  @HttpCode(200)
  @Throttle(perMinute(10))
  @ApiOperation({ summary: 'Đăng nhập 1-chạm bằng tài khoản demo (chỉ khi AUTH_DEMO_MODE=true)' })
  async demoLogin(@Body() dto: PortalQueryDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const outcome = await this.auth.demoLogin(dto.portal, requestContext(req));
    this.cookies.set(res, outcome.tokens);
    return this.loginBody(outcome);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @Throttle(perMinute(20))
  @ApiOperation({
    summary: 'Bắt đầu đăng nhập Google (redirect 302 sang Google qua Passport, luôn hiện màn chọn tài khoản)',
    description:
      'Mở bằng điều hướng trình duyệt (không phải fetch). Kết thúc ở `GET /auth/google/callback`. ' +
      '**"Try it out" ở Swagger sẽ báo lỗi CORS** (fetch bị redirect sang accounts.google.com) — hãy mở ' +
      '`/api/v1/auth/google?portal=tenant` trong tab mới, đăng nhập xong quay lại đây gọi `GET /auth/session` ' +
      '(cookie `vs_access` dùng chung `localhost`).',
  })
  @ApiQuery({ name: 'portal', enum: PORTALS })
  google() {
    // Guard đã redirect sang Google; handler không bao giờ chạy.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  @Throttle(perMinute(20))
  @ApiOperation({ summary: 'Callback Google: tạo/nạp hồ sơ, ký JWT phiên, set cookie, redirect về FE' })
  async googleCallback(@Query('state') state: string | undefined, @Req() req: Request, @Res() res: Response) {
    const result = await this.auth.completeGoogle(
      { identity: (req.user as GoogleIdentity | null) ?? null, state, nonce: this.cookies.readOAuthState(req) },
      requestContext(req),
    );
    this.cookies.clearOAuthState(res);
    if (result.ok) {
      this.cookies.set(res, result.outcome.tokens);
      this.cookies.setGoogleHint(res, { name: result.outcome.user.fullName, email: result.outcome.user.email });
    }
    return res.redirect(302, result.redirectUrl);
  }

  @Public()
  @Get('session')
  @ApiCookieAuth('session-cookie')
  @ApiOperation({
    summary: 'Phiên hiện tại (user hoặc null)',
    description: 'FE/proxy gọi endpoint này để biết đã đăng nhập chưa và ở cổng nào. Không bao giờ trả token.',
  })
  async session(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, clear } = await this.auth.resolveSession(this.cookies.readAccessToken(req));
    if (clear) this.cookies.clear(res);
    res.setHeader('Cache-Control', 'no-store');
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng xuất: xoá cookie phiên (idempotent)' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookies.clear(res);
    return { loggedOut: true };
  }

  @Post('verify-rfid')
  @HttpCode(200)
  @Throttle(perMinute(5))
  @ApiCookieAuth('session-cookie')
  @ApiOperation({
    summary: 'Field Host nhập mã thẻ RFID Admin đã cấp để hoàn tất đăng nhập lần đầu',
    description: 'Tạo bản ghi FieldHost và nhận lời mời. Sau bước này Host mới dùng được các API của Field Host.',
  })
  async verifyRfid(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyRfidDto, @Req() req: Request) {
    await this.auth.verifyRfid(user, dto, requestContext(req));
    return { verified: true };
  }
}
