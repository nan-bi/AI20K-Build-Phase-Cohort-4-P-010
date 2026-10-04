import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ConsignmentMetaStore } from './consignment-meta.store';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordPhotoStorage, sniffImage } from './landlord-photo-storage.service';
import {
  ConsignmentPhoto,
  ConsignmentStage,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  consignmentStage,
  readConsignmentMeta,
} from './landlord.mappers';

/** Phần của file multer mà service cần (không phụ thuộc kiểu `Express.Multer.File`). */
export interface UploadedImage {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/** Tên file chỉ để hiển thị: bỏ đường dẫn và ký tự điều khiển, giới hạn độ dài. KHÔNG dùng để dựng đường dẫn lưu. */
export function displayName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (clean || 'anh').slice(0, 80);
}

/** Ảnh tham khảo của chủ nhà gắn vào hồ sơ ký gửi (lưu Supabase Storage private, metadata trong ExclusiveMandate.doorAccessConfig). */
@Injectable()
export class LandlordPhotoService {
  constructor(
    private readonly access: LandlordAccessService,
    private readonly storage: LandlordPhotoStorage,
    private readonly audit: AuditService,
    private readonly metaStore: ConsignmentMetaStore,
  ) {}

  /** Danh sách ảnh kèm URL xem có hạn; ảnh ký URL lỗi thì `url: null`. */
  async list(landlordId: string, id: string) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    return this.withUrls(readConsignmentMeta(mandate.doorAccessConfig)?.photos ?? []);
  }

  async withUrls(photos: ConsignmentPhoto[]) {
    const urls = await this.storage.signedUrls(photos.map((p) => p.path));
    return photos.map((p) => ({ id: p.id, name: p.name, size: p.size, uploadedAt: p.uploadedAt, url: urls.get(p.path) ?? null }));
  }

  /** Ký URL xem (1 giờ) theo đường dẫn lưu — dùng cho ảnh thẩm định hiển thị ở hồ sơ của chủ nhà. */
  signPaths(paths: string[]) {
    return this.storage.signedUrls(paths);
  }

  async add(landlordId: string, id: string, files: UploadedImage[]) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    // Kiểm sớm (rẻ) để khỏi tải file lên rồi mới bị từ chối; bản kiểm có hiệu lực nằm TRONG khóa dòng bên dưới.
    this.assertEditable(consignmentStage(mandate), 'thêm');
    if (!files.length) throw new BadRequestException('Chưa chọn ảnh nào.');

    const meta = readConsignmentMeta(mandate.doorAccessConfig);
    if (!meta) throw new NotFoundException('Hồ sơ ký gửi không có dữ liệu biểu mẫu.');
    this.assertQuota(meta.photos ?? [], files.length);

    // Kiểm tra TOÀN BỘ trước khi tải lên: một file hỏng thì không file nào được lưu.
    const checked = files.map((f) => {
      const name = displayName(f.originalname);
      if (f.size > MAX_PHOTO_BYTES) throw new BadRequestException(`Ảnh "${name}" vượt quá ${MAX_PHOTO_BYTES / 1024 / 1024}MB.`);
      const type = sniffImage(f.buffer);
      if (!type) throw new BadRequestException(`"${name}" không phải ảnh JPG, PNG hoặc WebP.`);
      return { f, name, type };
    });

    // Tải Storage NGOÀI khóa (chậm, không giữ khóa dòng); lỗi ở bất kỳ bước nào ⇒ xóa file vừa tải.
    const uploaded: ConsignmentPhoto[] = [];
    let all: ConsignmentPhoto[];
    try {
      for (const { f, name, type } of checked) {
        const path = await this.storage.upload(landlordId, mandate.id, f.buffer, type);
        uploaded.push({ id: randomUUID(), path, name, size: f.size, mime: type.mime, uploadedAt: new Date().toISOString() });
      }
      all = await this.metaStore.mutate(mandate.id, async (locked, current) => {
        // Re-check TRONG khóa: Inspector có thể đã nhận ca giữa lúc ta tải ảnh (sửa H9).
        this.assertEditable(consignmentStage(locked), 'thêm');
        const existing = current.photos ?? [];
        this.assertQuota(existing, uploaded.length);
        const next = [...existing, ...uploaded];
        return { meta: { ...current, photos: next }, result: next };
      });
    } catch (err) {
      // Không để lại file mồ côi trong Storage khi một bước giữa chừng thất bại.
      await this.storage.remove(uploaded.map((p) => p.path));
      throw err;
    }

    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'CONSIGNMENT_PHOTOS_ADDED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
      newValue: { count: uploaded.length },
    });
    return this.withUrls(all);
  }

  async remove(landlordId: string, id: string, photoId: string) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    this.assertEditable(consignmentStage(mandate), 'xóa');

    const { rest, photo } = await this.metaStore.mutate(mandate.id, async (locked, meta) => {
      this.assertEditable(consignmentStage(locked), 'xóa');
      const found = meta.photos?.find((p) => p.id === photoId);
      if (!found) throw new NotFoundException('Không tìm thấy ảnh.');
      const left = (meta.photos ?? []).filter((p) => p.id !== photoId);
      return { meta: { ...meta, photos: left }, result: { rest: left, photo: found } };
    });
    await this.storage.remove([photo.path]);
    return this.withUrls(rest);
  }

  /** Sau khi Inspector nhận ca thẩm định thì hồ sơ đã khóa — ảnh bổ sung phải qua Inspector. */
  private assertEditable(stage: ConsignmentStage, verb: 'thêm' | 'xóa') {
    if (stage !== 'draft' && stage !== 'awaiting_host') {
      throw new ConflictException(`Hồ sơ đang thẩm định hoặc đã chốt, không thể ${verb} ảnh.`);
    }
  }

  private assertQuota(existing: ConsignmentPhoto[], adding: number) {
    if (existing.length + adding > MAX_PHOTOS) {
      throw new BadRequestException(`Tối đa ${MAX_PHOTOS} ảnh mỗi hồ sơ (hiện có ${existing.length}).`);
    }
  }
}
