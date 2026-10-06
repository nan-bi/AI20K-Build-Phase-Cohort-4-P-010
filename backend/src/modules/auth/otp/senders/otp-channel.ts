/**
 * Trừu tượng hóa kênh gửi OTP: tích hợp Zalo ZNS thật (chưa có credentials) chỉ là thay 1 file,
 * Luồng gửi phải đi qua nhà cung cấp thật; không trả mã thử nghiệm qua log hoặc API.
 */
export interface OtpChannelSender {
  send(phone: string, code: string): Promise<void>;
}
