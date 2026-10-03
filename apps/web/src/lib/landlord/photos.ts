/** Giới hạn ảnh đính kèm hồ sơ ký gửi — PHẢI khớp backend (landlord.mappers.ts: MAX_PHOTOS, MAX_PHOTO_BYTES). */
export const MAX_PHOTOS = 8;
/** Trần dung lượng mỗi ảnh SAU KHI nén (lưu trên Storage). */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
/** Trần ảnh gốc cho phép chọn: ảnh điện thoại thường 3–8MB, được nén xuống dưới MAX_PHOTO_BYTES trước khi tải. */
export const MAX_RAW_PHOTO_BYTES = 20 * 1024 * 1024;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const OK_TYPES = new Set(PHOTO_ACCEPT.split(","));

export interface PickedFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface PhotoCheck<F extends PickedFile> {
  accepted: F[];
  errors: string[];
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")}MB`;

/**
 * Lọc các file người dùng vừa chọn, TRƯỚC khi nén (kiểm tra sớm cho nhanh; backend vẫn kiểm tra lại theo nội dung).
 * `current` là các file đã chọn/đã tải: dùng để chống trùng và tính chỗ còn trống trong giới hạn MAX_PHOTOS.
 */
export function checkPhotoFiles<F extends PickedFile>(current: PickedFile[], picked: F[], alreadyUploaded = 0): PhotoCheck<F> {
  const accepted: F[] = [];
  const errors: string[] = [];
  const keyOf = (f: PickedFile) => `${f.name.replace(/\.[^.]+$/, "")}|${f.lastModified}`; // bỏ đuôi + không dùng size: ảnh đã nén đổi cả hai
  const seen = new Set(current.map(keyOf));
  let room = MAX_PHOTOS - alreadyUploaded - current.length;

  for (const f of picked) {
    const key = keyOf(f);
    if (seen.has(key)) continue; // chọn lại cùng một ảnh thì bỏ qua, không báo lỗi
    if (!OK_TYPES.has(f.type)) {
      errors.push(/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name) ? `"${f.name}": ảnh HEIC chưa hỗ trợ — chọn JPG hoặc PNG.` : `"${f.name}" không phải ảnh JPG, PNG hoặc WebP.`);
      continue;
    }
    if (f.size > MAX_RAW_PHOTO_BYTES) {
      errors.push(`"${f.name}" nặng ${mb(f.size)}, quá lớn (tối đa ${mb(MAX_RAW_PHOTO_BYTES)} ảnh gốc).`);
      continue;
    }
    if (room <= 0) {
      errors.push(`Chỉ đính kèm tối đa ${MAX_PHOTOS} ảnh — bỏ qua "${f.name}".`);
      continue;
    }
    seen.add(key);
    accepted.push(f);
    room -= 1;
  }
  return { accepted, errors };
}

/** Ảnh đã nén mà vẫn quá MAX_PHOTO_BYTES thì không tải lên được (nén xong mới biết). */
export const tooBigAfterCompress = (f: PickedFile) =>
  f.size > MAX_PHOTO_BYTES ? `"${f.name}" vẫn nặng ${mb(f.size)} sau khi nén, tối đa ${mb(MAX_PHOTO_BYTES)} — hãy chọn ảnh khác.` : null;
