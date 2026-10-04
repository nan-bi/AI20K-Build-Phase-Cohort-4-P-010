import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LandlordPhotoStorage } from '../landlord/landlord-photo-storage.service';
import { INSPECTION_STORAGE_DIR, LISTING_MEDIA_PREFIX } from './inspection.constants';

const FILE_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** LRU trong tiến trình: tối đa 64 ảnh / 32MB (SPEC-P02 §3). */
export const MEDIA_CACHE_MAX_ITEMS = 64;
export const MEDIA_CACHE_MAX_BYTES = 32 * 1024 * 1024;

export interface ListingImage {
  buf: Buffer;
  mime: string;
}

/**
 * Phục vụ ẢNH NIÊM YẾT công khai (E9) từ bucket private. Chỉ trả ảnh đã có `UnitMedia` của căn `isVerified`
 * (tức hồ sơ đã "đạt") — ảnh hạng mục / hồ sơ chưa đạt KHÔNG BAO GIỜ được trả (B5). Không thêm thư viện: LRU là `Map`
 * giữ thứ tự chèn. Lỗi Storage không bao giờ vào cache.
 */
@Injectable()
export class ListingMediaService {
  private readonly cache = new Map<string, ListingImage>();
  private bytes = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LandlordPhotoStorage,
  ) {}

  /** `null` ⇒ 404. Lỗi Storage ⇒ ném 503 (caller không cache). */
  async get(mandateId: string, file: string): Promise<ListingImage | null> {
    const m = FILE_RE.exec(file);
    if (!UUID_RE.test(mandateId) || !m) return null;
    const url = `${LISTING_MEDIA_PREFIX}${mandateId}/${file}`;

    const hit = this.cache.get(url);
    if (hit) {
      // Ảnh chỉ vào cache SAU khi đã qua kiểm UnitMedia của căn Verified ở lần tải đầu.
      this.cache.delete(url);
      this.cache.set(url, hit); // đưa lên cuối = mới dùng nhất
      return hit;
    }

    const media = await this.prisma.unitMedia.findFirst({ where: { url, unit: { isVerified: true } } });
    if (!media) return null;

    const buf = await this.storage.download(`${INSPECTION_STORAGE_DIR}/${mandateId}/${file}`);
    if (!buf) return null;
    const image: ListingImage = { buf, mime: MIME[m[2]] };
    this.remember(url, image);
    return image;
  }

  private remember(url: string, image: ListingImage): void {
    // Nhiều lượt xem đồng thời cùng URL lúc cache trống cùng gọi remember: trừ bản cũ trước khi ghi đè, kẻo sổ byte lệch.
    const old = this.cache.get(url);
    if (old) {
      this.bytes -= old.buf.length;
      this.cache.delete(url);
    }
    this.cache.set(url, image);
    this.bytes += image.buf.length;
    while (this.cache.size > MEDIA_CACHE_MAX_ITEMS || this.bytes > MEDIA_CACHE_MAX_BYTES) {
      const oldest = this.cache.keys().next().value as string;
      this.bytes -= this.cache.get(oldest)!.buf.length;
      this.cache.delete(oldest);
    }
  }
}
