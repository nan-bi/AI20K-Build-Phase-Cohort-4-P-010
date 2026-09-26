/**
 * Trừu tượng hóa kênh gửi OTP: tích hợp Zalo ZNS thật (chưa có credentials) chỉ là thay 1 file,
 * và toàn bộ luồng gửi/xác thực test được ngay với ConsoleOtpSender.
 */
export interface OtpChannelSender {
  send(phone: string, code: string): Promise<void>;
}
