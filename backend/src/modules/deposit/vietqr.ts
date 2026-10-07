export interface VietQrConfig {
  bankId: string;
  accountNo: string;
  accountName: string;
  bankName?: string;
}

export interface VietQrPaymentDetails extends VietQrConfig {
  qrUrl: string;
}

export function getVietQrConfig(): VietQrConfig | null {
  const bankId = process.env.VIETQR_BANK_ID?.trim();
  const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim();
  const accountName = process.env.VIETQR_ACCOUNT_NAME?.trim();

  if (!bankId || !accountNo || !accountName) return null;
  if (/^0+$/.test(accountNo)) return null; // toàn số 0 = chưa có tài khoản nhận thật

  return {
    bankId,
    accountNo,
    accountName,
    bankName: process.env.VIETQR_BANK_NAME?.trim() || undefined,
  };
}

/** DEMO: cho phép giả lập "ngân hàng báo có" khi chưa có webhook thật. Không bao giờ bật ở production. Xoá khi tích hợp thật. */
export function isDemoToolsEnabled(): boolean {
  return process.env.DEMO_TOOLS === 'true' && process.env.NODE_ENV !== 'production';
}

export function isVietQrWebhookConfigured(): boolean {
  return Boolean(process.env.VIETQR_WEBHOOK_SECRET?.trim());
}

export function buildVietQrUrl(
  config: VietQrConfig,
  amount: number,
  transferContent: string,
): string {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: transferContent,
    accountName: config.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(config.bankId)}-${encodeURIComponent(config.accountNo)}-compact2.png?${params.toString()}`;
}

export function getVietQrPaymentDetails(
  amount: number,
  transferContent: string,
): VietQrPaymentDetails | null {
  const config = getVietQrConfig();
  if (!config || !isVietQrWebhookConfigured()) return null;

  return {
    ...config,
    qrUrl: buildVietQrUrl(config, amount, transferContent),
  };
}
