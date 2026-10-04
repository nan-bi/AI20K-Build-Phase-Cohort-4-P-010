import { INSPECT_SLA_HOURS, MAX_PHOTO_BYTES } from '../landlord/landlord.mappers';

/**
 * Hằng số luồng thẩm định (hồ sơ 16, 01-CONTRACTS §4). Web chép `SHARPNESS_MIN`, `BRIGHTNESS_*`, `PHOTO_MIN_SIDE_PX`
 * ở `apps/web/src/lib/inspection/photoQuality.ts` — sửa ở đây thì sửa cả bên đó.
 */
export { INSPECT_SLA_HOURS };
/** Sau ngần này giờ chưa nhận ⇒ ca vào Open Pool cho mọi Inspector. */
export const INSPECT_OFFER_HOURS = 4;
/** Cạnh NGẮN tối thiểu của ảnh (ảnh độ phân giải thấp vẫn nhận). */
export const PHOTO_MIN_SIDE_PX = 200;
export const PHOTO_MAX_BYTES = MAX_PHOTO_BYTES;
/** Số ảnh tối đa mỗi hạng mục. */
export const PHOTOS_PER_LINE_MAX = 4;
export const LISTING_PHOTOS_MIN = 4;
export const LISTING_PHOTOS_MAX = 12;
/** Tổng ảnh tối đa mỗi hồ sơ. */
export const INSPECTION_PHOTOS_MAX = 100;
/** Ngưỡng do máy Host tính (canvas) — server chỉ lưu tham khảo, KHÔNG chặn theo chúng (B7). */
export const SHARPNESS_MIN = 60;
export const BRIGHTNESS_MIN = 40;
export const BRIGHTNESS_MAX = 235;
/** Hạn hiển thị PIN (giây), giống hồ sơ 15. */
export const DOOR_REVEAL_TTL_SECONDS = 600;
/** Tối đa 10 hạng mục phát sinh `X1..X10`. */
export const MAX_EXTRA_LINES = 10;
export const CATALOG_SIZE = 32;
/** Số mốc xem mã cửa giữ lại trong meta. */
export const DOOR_REVEALED_KEEP = 20;
/** `done` của bảng Inspector: số ca gần nhất. */
export const BOARD_DONE_LIMIT = 20;
/** Thời hạn ủy quyền khi niêm yết (tháng). */
export const LISTING_MANDATE_MONTHS = 12;
/** Tiền tố URL ảnh niêm yết công khai (lưu trong `UnitMedia.url`). */
export const LISTING_MEDIA_PREFIX = '/api/v1/media/listing/';
/** Ảnh niêm yết nằm trong bucket private tại `inspections/<mandateId>/<file>`. */
export const INSPECTION_STORAGE_DIR = 'inspections';
