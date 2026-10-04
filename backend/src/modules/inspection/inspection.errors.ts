import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PHOTO_MIN_SIDE_PX } from './inspection.constants';

/**
 * Mã lỗi luồng thẩm định (01-CONTRACTS §8). Body `{ message, code }`; riêng `report_invalid` kèm `field` ở GỐC body
 * (HttpExceptionFilter chuyển tiếp `field`; `errors.field` giữ để tương thích). Web map câu tiếng Việt theo `code`.
 */
export type InspectionErrorCode =
  | 'inspection_not_found'
  | 'inspection_taken'
  | 'inspection_not_open'
  | 'inspection_bad_stage'
  | 'photo_invalid_type'
  | 'photo_too_small'
  | 'photo_too_large'
  | 'photo_quota'
  | 'photo_bad_slot'
  | 'report_invalid'
  | 'door_code_required'
  | 'door_code_missing'
  | 'storage_unavailable';

export const inspectionNotFound = () =>
  new NotFoundException({ message: 'Không tìm thấy ca thẩm định.', code: 'inspection_not_found' });

export const inspectionTaken = () =>
  new ConflictException({ message: 'Ca này đã có Inspector khác nhận.', code: 'inspection_taken' });

export const inspectionNotOpen = () =>
  new ConflictException({
    message: 'Ca vẫn đang dành cho Inspector được giao (chưa quá 4 giờ).',
    code: 'inspection_not_open',
  });

export const inspectionBadStage = () =>
  new ConflictException({ message: 'Trạng thái ca đã thay đổi. Đang tải lại…', code: 'inspection_bad_stage' });

export const photoInvalidType = () =>
  new BadRequestException({ message: 'Tệp không phải ảnh JPG, PNG hoặc WebP hợp lệ.', code: 'photo_invalid_type' });

export const photoTooSmall = () =>
  new UnprocessableEntityException({
    message: `Ảnh quá nhỏ (cạnh ngắn dưới ${PHOTO_MIN_SIDE_PX}px). Chụp gần hơn hoặc dùng camera sau.`,
    code: 'photo_too_small',
  });

export const photoTooLarge = () =>
  new PayloadTooLargeException({ message: 'Ảnh vượt quá 3MB.', code: 'photo_too_large' });

export const photoQuota = () =>
  new ConflictException({ message: 'Đã đủ số ảnh cho phép ở mục này.', code: 'photo_quota' });

export const photoBadSlot = () =>
  new BadRequestException({ message: 'Ô ảnh không hợp lệ.', code: 'photo_bad_slot' });

export const reportInvalid = (field: string, message: string) =>
  new BadRequestException({ message, code: 'report_invalid', field, errors: { field } });

export const doorCodeRequired = () =>
  new ConflictException({
    message: 'Căn khóa điện tử chưa có mã cửa. Nhập mã cửa thật của căn trước khi nộp "Đạt".',
    code: 'door_code_required',
  });

export const doorCodeMissing = () =>
  new ConflictException({
    message: 'Căn chưa có mã cửa hợp lệ. Liên hệ chủ nhà qua bộ phận hỗ trợ để lấy mã.',
    code: 'door_code_missing',
  });

export const storageUnavailable = () =>
  new ServiceUnavailableException({
    message: 'Kho lưu ảnh đang gặp sự cố, thử lại sau.',
    code: 'storage_unavailable',
  });

/** Lỗi `ServiceUnavailableException` thô từ `LandlordPhotoStorage` ⇒ `storage_unavailable` có mã. */
export function asStorageError(err: unknown): unknown {
  if (err instanceof HttpException && err.getStatus() === 503) return storageUnavailable();
  return err;
}
