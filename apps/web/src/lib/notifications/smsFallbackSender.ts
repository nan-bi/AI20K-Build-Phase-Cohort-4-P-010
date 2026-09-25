import type { OtpChannelSender } from "./otpChannel";

/**
 * SMS fallback channel — used when Zalo delivery fails (PRD documents
 * "Zalo/SMS" throughout). No provider is wired up yet (see
 * SMS_FALLBACK_PROVIDER / SMS_FALLBACK_API_KEY in .env.example); this sender
 * throws until a real provider (e.g. eSMS.vn, or a VN-capable Twilio
 * alternative) is chosen and implemented.
 */
export class SmsFallbackSender implements OtpChannelSender {
  async send(_phone: string, _code: string): Promise<void> {
    throw new Error(
      "SmsFallbackSender not implemented: no SMS provider configured yet.",
    );
  }
}
