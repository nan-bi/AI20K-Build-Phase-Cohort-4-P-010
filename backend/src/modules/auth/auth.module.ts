import { Module } from '@nestjs/common';
import { AuthAuditService } from './auth-audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HostInvitesController } from './host-invites/host-invites.controller';
import { HostInvitesService } from './host-invites/host-invites.service';
import { ActionTokenService } from './otp/action-token.service';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';
import { PhoneVerificationService } from './otp/phone-verification.service';
import { ConsoleOtpSender } from './otp/senders/console-otp.sender';
import { SmsFallbackSender } from './otp/senders/sms-fallback.sender';
import { ZaloZnsSender } from './otp/senders/zalo-zns.sender';
import { PhoneService } from './phone/phone.service';
import { AuthSessionService } from './session/auth-session.service';
import { ProfileProvisioningService } from './session/profile-provisioning.service';
import { SessionCookieService } from './session/session-cookies.service';

@Module({
  controllers: [AuthController, OtpController, HostInvitesController],
  providers: [
    AuthService,
    AuthSessionService,
    ProfileProvisioningService,
    SessionCookieService,
    AuthAuditService,
    HostInvitesService,
    PhoneService,
    OtpService,
    ActionTokenService,
    PhoneVerificationService,
    ZaloZnsSender,
    SmsFallbackSender,
    ConsoleOtpSender,
  ],
  // Guard toàn cục (AppModule) cần AuthSessionService + SessionCookieService; các module nghiệp vụ
  // (booking, deposit...) dùng PhoneService / OtpService / ActionTokenService khi chuyển sang OTP thật.
  exports: [AuthSessionService, SessionCookieService, AuthService, PhoneService, OtpService, ActionTokenService, AuthAuditService],
})
export class AuthModule {}
