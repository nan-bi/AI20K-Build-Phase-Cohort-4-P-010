import type { OtpChannelSender } from "./otpChannel";

/**
 * Development-only OTP "delivery" — logs the code to the server console
 * instead of calling any external provider. Lets the whole send/verify flow
 * be tested end-to-end with zero Zalo/SMS credentials. Must never be used
 * when APP_ENV !== "development" (see sendOtpChannel() in lib/auth/otp.ts,
 * which is the only place that selects this sender).
 */
export class ConsoleOtpSender implements OtpChannelSender {
  async send(phone: string, code: string): Promise<void> {
    console.log(`[dev-otp] phone=${phone} code=${code}`);
  }
}
