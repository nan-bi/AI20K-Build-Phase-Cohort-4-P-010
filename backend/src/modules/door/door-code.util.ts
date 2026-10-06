/**
 * Phân loại `door_access_keys.vault_secret_ref` (hồ sơ 15, SPEC-P02 §2–§3). Thuần hàm, không phụ thuộc Nest/DB
 * để script `rekey-door-codes` dùng chung với service.
 */
export type DoorRefKind = 'aes' | 'placeholder' | 'plain_pin' | 'missing';

export const PIN_PATTERN = /^\d{4,10}$/;
const AES_PREFIX = 'aes:';
const PLAIN_PIN = /^vault:(?:enc|aes256):pin:(\d{4,10})$/;
const PLACEHOLDER = /^vault:aes256:door_pin:/;

/** `aes:<ciphertext>` hợp lệ về hình thức (chưa giải mã) · chuỗi giữ chỗ seed · PIN để trần · thiếu. */
export function classifyDoorRef(ref: string | null | undefined): DoorRefKind {
  if (!ref) return 'missing';
  if (ref.startsWith(AES_PREFIX) && ref.length > AES_PREFIX.length) return 'aes';
  if (PLAIN_PIN.test(ref)) return 'plain_pin';
  if (PLACEHOLDER.test(ref)) return 'placeholder';
  return 'missing';
}

/** PIN để trần trong `vault:*:pin:<digits>`; loại khác ⇒ null. */
export function extractPlainPin(ref: string | null | undefined): string | null {
  const m = ref ? PLAIN_PIN.exec(ref) : null;
  return m ? m[1] : null;
}

export function stripAesPrefix(ref: string): string {
  return ref.slice(AES_PREFIX.length);
}

export function withAesPrefix(ciphertext: string): string {
  return `${AES_PREFIX}${ciphertext}`;
}

export type RekeyDecision =
  | { action: 'keep' }
  | { action: 'rekey'; pin: string }
  | { action: 'skip'; reason: 'placeholder' | 'missing' | 'unreadable_aes' };

/**
 * Quyết định cho một dòng `door_access_keys` ELECTRONIC_PIN (script `rekey-door-codes`):
 *  - `aes:` đọc được ⇒ giữ nguyên (idempotent);
 *  - PIN để trần ⇒ mã hoá lại GIỮ NGUYÊN số;
 *  - chuỗi giữ chỗ / thiếu / `aes:` không giải mã được ⇒ bỏ qua để tránh ghi một PIN giả.
 */
export function planRekey(ref: string | null | undefined, aesReadable: boolean): RekeyDecision {
  const kind = classifyDoorRef(ref);
  if (kind === 'aes' && aesReadable) return { action: 'keep' };
  if (kind === 'aes') return { action: 'skip', reason: 'unreadable_aes' };
  const plain = extractPlainPin(ref);
  if (kind === 'plain_pin' && plain) return { action: 'rekey', pin: plain };
  return { action: 'skip', reason: kind === 'placeholder' ? 'placeholder' : 'missing' };
}
