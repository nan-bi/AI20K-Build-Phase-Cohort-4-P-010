import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { HostActor } from '../host-viewings/host-viewings.types';
import { ConsignmentMetaStore } from '../landlord/consignment-meta.store';
import { LandlordPhotoStorage, sniffImage } from '../landlord/landlord-photo-storage.service';
import { InspectionPhoto, ListingRoom, readConsignmentMeta } from '../landlord/landlord.mappers';
import { readImageSize } from './image-size';
import {
  INSPECTION_PHOTOS_MAX,
  INSPECTION_STORAGE_DIR,
  LISTING_PHOTOS_MAX,
  PHOTOS_PER_LINE_MAX,
  PHOTO_MAX_BYTES,
  PHOTO_MIN_SIDE_PX,
} from './inspection.constants';
import {
  asStorageError,
  inspectionNotFound,
  photoBadSlot,
  photoInvalidType,
  photoQuota,
  photoTooLarge,
  photoTooSmall,
} from './inspection.errors';
import { assertCaseOwner, mutateInspection, parseIso, parseMetric, parseSlot, toPhotoView } from './inspection.helpers';
import type { InspectionPhotoView } from './inspection.types';

const ROOMS: readonly ListingRoom[] = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony', 'view', 'other'];

/** Phần của file multer mà service cần. */
export interface InspectionUpload {
  size: number;
  buffer: Buffer;
}

export interface InspectionPhotoFields {
  slot?: string;
  room?: string;
  takenAt?: string;
  sharpness?: string;
  brightness?: string;
}

/**
 * Ảnh thẩm định (SPEC-P02 §1–2). Server kiểm theo NỘI DUNG (magic bytes + kích thước đọc từ header); độ nét/độ sáng/giờ
 * chụp do máy Host gửi chỉ lưu tham khảo, KHÔNG dùng để chặn (B7). Ảnh nằm ở bucket private
 * `inspections/<mandateId>/<uuid>.<ext>`; bằng chứng hạng mục không bao giờ ra route công khai (B5).
 */
@Injectable()
export class InspectionPhotoService {
  private readonly logger = new Logger(InspectionPhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: ConsignmentMetaStore,
    private readonly storage: LandlordPhotoStorage,
  ) {}

  /** E6 — tải MỘT ảnh. Dừng ở lỗi đầu tiên theo thứ tự bảng SPEC-P02 §1. */
  async add(actor: HostActor, id: string, file: InspectionUpload | undefined, fields: InspectionPhotoFields): Promise<InspectionPhotoView> {
    // 1. Quyền + stage, đọc NGOÀI khóa cho rẻ (bản có hiệu lực là bước 7).
    const mandate = await this.prisma.exclusiveMandate.findUnique({ where: { id } });
    const meta0 = mandate ? readConsignmentMeta(mandate.doorAccessConfig) : null;
    if (!mandate || !meta0) throw inspectionNotFound();
    assertCaseOwner(mandate, meta0, actor.hostId);

    // 2. Ô ảnh
    const slot = parseSlot(fields.slot);
    if (!slot) throw photoBadSlot();
    let room: ListingRoom | undefined;
    if (slot === 'listing') {
      room = ROOMS.find((r) => r === fields.room);
      if (!room) throw photoBadSlot();
    }

    // 3–5. Nội dung ảnh
    if (!file?.buffer?.length) throw photoInvalidType();
    if (file.size > PHOTO_MAX_BYTES || file.buffer.length > PHOTO_MAX_BYTES) throw photoTooLarge();
    const type = sniffImage(file.buffer);
    if (!type) throw photoInvalidType();
    const size = readImageSize(file.buffer, type);
    if (!size) throw photoInvalidType();
    if (Math.min(size.width, size.height) < PHOTO_MIN_SIDE_PX) throw photoTooSmall();

    // 6. Tải Storage NGOÀI khóa (chậm); mọi lỗi sau đó ⇒ xóa file vừa tải.
    const photoId = randomUUID();
    const path = `${INSPECTION_STORAGE_DIR}/${id}/${photoId}.${type.ext}`;
    try {
      await this.storage.uploadAt(path, file.buffer, type);
    } catch (err) {
      throw asStorageError(err);
    }

    // 7. Ghi meta trong khóa: kiểm lại quyền/stage + hạn mức rồi thêm.
    const photo: InspectionPhoto = {
      id: photoId,
      path,
      slot,
      ...(room ? { room } : {}),
      mime: type.mime,
      size: file.size,
      width: size.width,
      height: size.height,
      sharpness: parseMetric(fields.sharpness),
      brightness: parseMetric(fields.brightness),
      takenAt: parseIso(fields.takenAt),
      uploadedAt: new Date().toISOString(), // giờ MÁY CHỦ — mốc timestamp chính thức
      hostId: actor.hostId,
    };
    try {
      await mutateInspection(this.store, id, async (locked, meta) => {
        assertCaseOwner(locked, meta, actor.hostId);
        const existing = meta.inspection?.photos ?? [];
        const sameSlot = existing.filter((p) => p.slot === slot).length;
        const cap = slot === 'listing' ? LISTING_PHOTOS_MAX : PHOTOS_PER_LINE_MAX;
        if (sameSlot >= cap || existing.length >= INSPECTION_PHOTOS_MAX) throw photoQuota();
        return {
          meta: { ...meta, inspection: { ...meta.inspection, photos: [...existing, photo] } },
          result: true,
        };
      });
    } catch (err) {
      await this.removeFiles([path]); // không để file mồ côi trong Storage
      throw err;
    }

    const urls = await this.storage.signedUrls([path]);
    return toPhotoView(photo, urls);
  }

  /** E7 — xóa ảnh khi còn `inspecting`. Bỏ khỏi meta trong khóa, SAU commit mới xóa file (lỗi xóa file chỉ log). */
  async remove(actor: HostActor, id: string, photoId: string): Promise<{ removed: true }> {
    const found = await mutateInspection(this.store, id, async (locked, meta) => {
      assertCaseOwner(locked, meta, actor.hostId);
      const existing = meta.inspection?.photos ?? [];
      const photo = existing.find((p) => p.id === photoId);
      if (!photo) throw inspectionNotFound();
      return {
        meta: { ...meta, inspection: { ...meta.inspection, photos: existing.filter((p) => p.id !== photoId) } },
        result: photo,
      };
    });
    await this.removeFiles([found.path]);
    return { removed: true };
  }

  private async removeFiles(paths: string[]): Promise<void> {
    try {
      await this.storage.remove(paths);
    } catch (err) {
      this.logger.warn(`Không xóa được file ảnh ${paths.join(',')}: ${(err as Error).message}`);
    }
  }
}
