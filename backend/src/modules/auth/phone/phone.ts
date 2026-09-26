/**
 * Chuẩn hóa số điện thoại VN về E.164 (+84...).
 *
 *   0912345678   -> +84912345678
 *   84912345678  -> +84912345678
 *   +84912345678 -> +84912345678 (đã chuẩn)
 * Trả về null nếu không giống số di động VN hợp lệ sau khi chuẩn hóa.
 */
export function normalizeVnPhone(raw: string): string | null {
  const digitsOnly = (raw ?? '').trim().replace(/[\s().-]/g, '');

  if (/^\+84\d{9,10}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  let national: string | null = null;
  if (/^84\d{9,10}$/.test(digitsOnly)) {
    national = digitsOnly.slice(2);
  } else if (/^0\d{9}$/.test(digitsOnly)) {
    national = digitsOnly.slice(1);
  }

  return national ? `+84${national}` : null;
}

export function isValidVnPhone(raw: string): boolean {
  return normalizeVnPhone(raw) !== null;
}
