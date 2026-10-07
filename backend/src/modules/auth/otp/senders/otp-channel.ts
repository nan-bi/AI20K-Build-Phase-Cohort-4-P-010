/**
 * Trừu tượng hóa kênh gửi OTP: tích hợp Zalo ZNS thật (chưa có credentials) chỉ là thay 1 file,
 * Production phải đi qua nhà cung cấp thật; riêng dev/demo có ConsoleOtpSender (cờ OTP_ECHO_DEV_CODE, tắt ở production).
 */
export interface OtpChannelSender {
  send(phone: string, code: string): Promise<void>;
}
