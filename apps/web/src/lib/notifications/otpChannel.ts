/**
 * Delivery abstraction for OTP codes. Kept as a small interface so the real
 * Zalo ZNS integration (no credentials exist yet) is a one-file swap later,
 * and so the whole send/verify flow is testable today without any external
 * credentials via ConsoleOtpSender.
 */
export interface OtpChannelSender {
  send(phone: string, code: string): Promise<void>;
}
