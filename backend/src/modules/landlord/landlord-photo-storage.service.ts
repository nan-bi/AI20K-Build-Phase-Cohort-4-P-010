import { randomUUID } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export const PHOTO_BUCKET = 'consignment-photos';
/** Link xem ảnh sống 1 giờ — đủ cho một phiên xem hồ sơ, không để lộ ảnh vĩnh viễn nếu link bị chia sẻ. */
export const SIGNED_URL_TTL_SECONDS = 3600;

export type ImageType = { ext: 'jpg' | 'png' | 'webp'; mime: string };

/** Nhận diện ảnh theo NỘI DUNG (magic bytes), không tin `mimetype`/đuôi file do client gửi. */
export function sniffImage(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

/** Lưu ảnh ký gửi trong bucket PRIVATE của Supabase Storage; chỉ xem được qua signed URL do backend cấp. */
@Injectable()
export class LandlordPhotoStorage {
  private readonly logger = new Logger(LandlordPhotoStorage.name);
  private bucketReady = false;

  constructor(private readonly supabase: SupabaseService) {}

  private async bucket() {
    if (!this.supabase.isConfigured()) {
      throw new ServiceUnavailableException('Chưa cấu hình kho lưu ảnh (Supabase Storage). Liên hệ quản trị viên.');
    }
    const storage = this.supabase.getClient().storage;
    if (!this.bucketReady) {
      const { error } = await storage.createBucket(PHOTO_BUCKET, { public: false });
      // Bucket đã tồn tại là bình thường (lần chạy sau); lỗi khác thì ném ra khi upload.
      if (error && !/already exists|duplicate/i.test(error.message)) {
        this.logger.warn(`createBucket: ${error.message}`);
      }
      this.bucketReady = true;
    }
    return storage.from(PHOTO_BUCKET);
  }

  /** Tải một ảnh lên; trả đường dẫn lưu (dùng làm khóa khi xóa / ký URL). */
  async upload(landlordId: string, mandateId: string, buf: Buffer, type: ImageType): Promise<string> {
    return this.uploadAt(`${landlordId}/${mandateId}/${randomUUID()}.${type.ext}`, buf, type);
  }

  /** Tải ảnh lên ĐÚNG đường dẫn cho trước (ảnh thẩm định: `inspections/<mandateId>/<uuid>.<ext>`, hồ sơ 16). */
  async uploadAt(path: string, buf: Buffer, type: ImageType): Promise<string> {
    const bucket = await this.bucket();
    const { error } = await bucket.upload(path, buf, { contentType: type.mime, upsert: false });
    if (error) {
      this.logger.error(`Upload ảnh thất bại: ${error.message}`);
      throw new ServiceUnavailableException('Không lưu được ảnh, thử lại sau.');
    }
    return path;
  }

  /**
   * Tải nội dung ảnh về. File không tồn tại ⇒ `null`; mọi lỗi Storage khác ⇒ 503 (caller không được cache lỗi).
   */
  async download(path: string): Promise<Buffer | null> {
    const bucket = await this.bucket();
    const { data, error } = await bucket.download(path);
    if (error) {
      if (/not found|404|does not exist/i.test(error.message)) return null;
      this.logger.error(`Tải ảnh thất bại: ${error.message}`);
      throw new ServiceUnavailableException('Không đọc được ảnh, thử lại sau.');
    }
    return data ? Buffer.from(await data.arrayBuffer()) : null;
  }

  async remove(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const bucket = await this.bucket();
    const { error } = await bucket.remove(paths);
    if (error) this.logger.warn(`Xóa ảnh thất bại (${paths.length} file): ${error.message}`);
  }

  /** Ký URL xem ảnh theo lô; ảnh nào ký không được thì trả null (UI bỏ qua, không làm hỏng cả trang). */
  async signedUrls(paths: string[]): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>(paths.map((p) => [p, null]));
    if (!paths.length || !this.supabase.isConfigured()) return out;
    try {
      const bucket = await this.bucket();
      const { data, error } = await bucket.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
    } catch (err) {
      this.logger.warn(`Không ký được URL ảnh: ${(err as Error).message}`);
    }
    return out;
  }
}
