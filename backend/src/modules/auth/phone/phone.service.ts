import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { deriveKey, resolveMasterSecret } from '../secrets';
import { normalizeVnPhone } from './phone';

/**
 * Bảo vệ SĐT theo SAD v2: `phoneEnc` = AES-256-GCM (đọc lại được khi cần gửi tin),
 * `phoneHash` = HMAC-SHA256 (blind index để tra cứu/unique mà không lưu plaintext).
 */
@Injectable()
export class PhoneService {
  private readonly logger = new Logger(PhoneService.name);
  private readonly aesKey: Buffer;
  private readonly hmacKey: Buffer;

  constructor(config: ConfigService) {
    const master = resolveMasterSecret(config, config.get('NODE_ENV'));
    if (!config.get('AES_SECRET_KEY')) {
      this.logger.warn('AES_SECRET_KEY chưa cấu hình — đang dùng khóa dev mặc định (chỉ dùng khi phát triển).');
    }
    this.aesKey = deriveKey(master, 'phone:aes-256-gcm');
    this.hmacKey = deriveKey(master, 'phone:hmac-blind-index');
  }

  /** E.164 hoặc null nếu không hợp lệ. */
  normalize(raw: string): string | null {
    return normalizeVnPhone(raw);
  }

  /** Blind index (64 ký tự hex) của SĐT đã chuẩn hóa E.164. */
  hash(e164: string): string {
    return createHmac('sha256', this.hmacKey).update(e164).digest('hex');
  }

  encrypt(e164: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.aesKey, iv);
    const ciphertext = Buffer.concat([cipher.update(e164, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, ciphertext] = payload.split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext) {
      throw new Error('Unsupported phone ciphertext format');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.aesKey, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  }
}
