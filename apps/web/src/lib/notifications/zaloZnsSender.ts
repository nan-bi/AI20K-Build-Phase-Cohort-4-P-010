import type { OtpChannelSender } from "./otpChannel";

/**
 * Real Zalo ZNS (Zalo Notification Service) integration — deferred.
 *
 * PRD/UI_FLOW_SPEC specify Zalo as the primary OTP channel, but no ZNS App
 * ID / Secret Key / Template ID exist yet (see ZALO_ZNS_* in .env.example).
 * This sender always throws so callers fall back to SmsFallbackSender (or
 * ConsoleOtpSender in development) instead of silently pretending to send.
 *
 * To implement for real: call Zalo's ZNS "Send message" API
 * (https://developers.zalo.me/docs/zalo-notification-service) with
 * ZALO_ZNS_APP_ID / ZALO_ZNS_SECRET_KEY / ZALO_ZNS_TEMPLATE_ID_OTP, passing
 * `phone` and `code` as the template's data payload.
 */
export class ZaloZnsSender implements OtpChannelSender {
  async send(_phone: string, _code: string): Promise<void> {
    throw new Error(
      "ZaloZnsSender not implemented: ZALO_ZNS_* credentials are not configured yet.",
    );
  }
}
