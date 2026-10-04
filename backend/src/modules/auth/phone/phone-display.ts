import type { PhoneService } from './phone.service';

/** Giải mã SĐT để HIỂN THỊ (dạng 0xxxxxxxxx). Thiếu hoặc giải mã lỗi ⇒ null, không làm hỏng response. */
export function decryptPhoneForDisplay(phones: PhoneService, phoneEnc: string | null | undefined): string | null {
  if (!phoneEnc) return null;
  try {
    const e164 = phones.decrypt(phoneEnc);
    return e164.startsWith('+84') ? `0${e164.slice(3)}` : e164;
  } catch {
    return null;
  }
}
