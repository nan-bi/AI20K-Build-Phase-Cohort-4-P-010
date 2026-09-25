/**
 * Vietnamese phone number normalization to E.164 (+84...).
 *
 * Accepts common local input shapes:
 *   0912345678        -> +84912345678
 *   84912345678       -> +84912345678
 *   +84912345678      -> +84912345678 (already normalized)
 * Rejects anything that doesn't end up as a plausible 9-10 digit VN mobile
 * number after normalization.
 */
export function normalizeVnPhone(raw: string): string | null {
  const digitsOnly = raw.trim().replace(/[\s().-]/g, "");

  let national: string | null = null;

  if (/^\+84\d{9,10}$/.test(digitsOnly)) {
    return digitsOnly;
  }
  if (/^84\d{9,10}$/.test(digitsOnly)) {
    national = digitsOnly.slice(2);
  } else if (/^0\d{9}$/.test(digitsOnly)) {
    national = digitsOnly.slice(1);
  }

  if (!national) return null;
  return `+84${national}`;
}

export function isValidVnPhone(raw: string): boolean {
  return normalizeVnPhone(raw) !== null;
}
