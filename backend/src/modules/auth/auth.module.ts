import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthAuditService } from './auth-audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard, GoogleCallbackGuard } from './google/google-auth.guard';
import { GoogleStrategy } from './google/google.strategy';
import { ActionTokenService } from './otp/action-token.service';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { PhoneVerificationService } from './otp/phone-verification.service';
import { SmsFallbackSender } from './otp/senders/sms-fallback.sender';
import { ZaloZnsSender } from './otp/senders/zalo-zns.sender';
import { PhoneService } from './phone/phone.service';
import { resolveJwtSecret } from './secrets';
import { AuthSessionService } from './session/auth-session.service';
import { ProfileProvisioningService } from './session/profile-provisioning.service';
import { RoleIdService } from './session/role-ids.service';
import { SessionCookieService } from './session/session-cookies.service';
import { SESSION_TOKEN_ISSUER, SessionTokenService } from './session/session-token.service';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config, config.get('NODE_ENV')),
        signOptions: { algorithm: 'HS256', issuer: SESSION_TOKEN_ISSUER },
        verifyOptions: { algorithms: ['HS256'], issuer: SESSION_TOKEN_ISSUER },
      }),
    }),
  ],
  controllers: [AuthController, OtpController],
  providers: [
    AuthService,
    AuthSessionService,
    ProfileProvisioningService,
    RoleIdService,
    SessionCookieService,
    SessionTokenService,
    GoogleStrategy,
    GoogleAuthGuard,
    GoogleCallbackGuard,
    AuthAuditService,
    PhoneService,
    OtpService,
    ActionTokenService,
    PhoneVerificationService,
    ZaloZnsSender,
    SmsFallbackSender,
  ],
  // Guard toàn cục (AppModule) cần AuthSessionService + SessionCookieService; các module nghiệp vụ
  // (booking, deposit...) dùng PhoneService / OtpService / ActionTokenService khi chuyển sang OTP thật.
  exports: [
    AuthSessionService,
    SessionCookieService,
    AuthService,
    PhoneService,
    OtpService,
    PhoneVerificationService,
    ActionTokenService,
    AuthAuditService,
    RoleIdService,
  ],
})
export class AuthModule {}
