import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordPhotoStorage, sniffImage } from './landlord-photo-storage.service';
import {
  ConsignmentPhoto,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  consignmentStage,
  readConsignmentMeta,
  withConsignmentMeta,
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
    private readonly prisma: PrismaService,
    private readonly access: LandlordAccessService,
    private readonly storage: LandlordPhotoStorage,
    private readonly audit: AuditService,
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

  async add(landlordId: string, id: string, files: UploadedImage[]) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    const stage = consignmentStage(mandate);
    // Sau khi Host nhận ca thẩm định thì hồ sơ đã khóa — ảnh bổ sung phải qua Host/Admin.
    if (stage !== 'draft' && stage !== 'awaiting_host') {
      throw new ConflictException('Hồ sơ đang thẩm định hoặc đã chốt, không thể thêm ảnh.');
    }
    if (!files.length) throw new BadRequestException('Chưa chọn ảnh nào.');

    const meta = readConsignmentMeta(mandate.doorAccessConfig);
    if (!meta) throw new NotFoundException('Hồ sơ ký gửi không có dữ liệu biểu mẫu.');
    const existing = meta.photos ?? [];
    if (existing.length + files.length > MAX_PHOTOS) {
      throw new BadRequestException(`Tối đa ${MAX_PHOTOS} ảnh mỗi hồ sơ (hiện có ${existing.length}).`);
    }

    // Kiểm tra TOÀN BỘ trước khi tải lên: một file hỏng thì không file nào được lưu.
    const checked = files.map((f) => {
      const name = displayName(f.originalname);
      if (f.size > MAX_PHOTO_BYTES) throw new BadRequestException(`Ảnh "${name}" vượt quá ${MAX_PHOTO_BYTES / 1024 / 1024}MB.`);
      const type = sniffImage(f.buffer);
      if (!type) throw new BadRequestException(`"${name}" không phải ảnh JPG, PNG hoặc WebP.`);
      return { f, name, type };
    });

    const uploaded: ConsignmentPhoto[] = [];
    try {
      for (const { f, name, type } of checked) {
        const path = await this.storage.upload(landlordId, mandate.id, f.buffer, type);
        uploaded.push({ id: randomUUID(), path, name, size: f.size, mime: type.mime, uploadedAt: new Date().toISOString() });
      }
      await this.prisma.exclusiveMandate.update({
        where: { id: mandate.id },
        data: { doorAccessConfig: withConsignmentMeta(mandate.doorAccessConfig, { ...meta, photos: [...existing, ...uploaded] }) as object },
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
    return this.withUrls([...existing, ...uploaded]);
  }

  async remove(landlordId: string, id: string, photoId: string) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    const stage = consignmentStage(mandate);
    if (stage !== 'draft' && stage !== 'awaiting_host') {
      throw new ConflictException('Hồ sơ đang thẩm định hoặc đã chốt, không thể xóa ảnh.');
    }
    const meta = readConsignmentMeta(mandate.doorAccessConfig);
    const photo = meta?.photos?.find((p) => p.id === photoId);
    if (!meta || !photo) throw new NotFoundException('Không tìm thấy ảnh.');

    const rest = (meta.photos ?? []).filter((p) => p.id !== photoId);
    await this.prisma.exclusiveMandate.update({
      where: { id: mandate.id },
      data: { doorAccessConfig: withConsignmentMeta(mandate.doorAccessConfig, { ...meta, photos: rest }) as object },
    });
    await this.storage.remove([photo.path]);
    return this.withUrls(rest);
  }
}
