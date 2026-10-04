import type { ImageType } from '../landlord/landlord-photo-storage.service';

export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Đọc kích thước ảnh từ HEADER (không giải mã ảnh, không thư viện native — hồ sơ 16, B7/B8).
 * Hàm THUẦN: `type` là kết quả `sniffImage` (magic bytes). Không đọc được ⇒ null (caller báo `photo_invalid_type`).
 */
export function readImageSize(buf: Buffer, type: ImageType): ImageSize | null {
  switch (type.ext) {
    case 'jpg':
      return jpegSize(buf);
    case 'png':
      return pngSize(buf);
    case 'webp':
      return webpSize(buf);
    default:
      return null;
  }
}

const valid = (width: number, height: number): ImageSize | null => (width > 0 && height > 0 ? { width, height } : null);

/** Quét marker tới SOFn (C0–CF trừ C4 DHT, C8 JPG, CC DAC): [len(2) precision(1) height(2) width(2)]. */
function jpegSize(buf: Buffer): ImageSize | null {
  let i = 2; // sau SOI (FF D8)
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) return null; // không còn đúng cấu trúc marker
    let marker = buf[i + 1];
    while (marker === 0xff && i + 2 < buf.length) {
      i += 1; // byte đệm 0xFF giữa các marker
      marker = buf[i + 1];
    }
    i += 2;
    // Marker không có độ dài: TEM (01), RSTn (D0–D7), SOI (D8), EOI (D9).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (i + 1 >= buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (i + 7 > buf.length) return null;
      return valid(buf.readUInt16BE(i + 5), buf.readUInt16BE(i + 3));
    }
    if (marker === 0xda) return null; // bắt đầu dữ liệu quét mà chưa gặp SOF ⇒ hỏng
    i += len;
  }
  return null;
}

/** IHDR phải là chunk đầu: 8 byte chữ ký + length(4) + 'IHDR' + width(4) + height(4). */
function pngSize(buf: Buffer): ImageSize | null {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return valid(buf.readUInt32BE(16), buf.readUInt32BE(20));
}

function webpSize(buf: Buffer): ImageSize | null {
  if (buf.length < 30) return null;
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') {
    // 24-bit little-endian (canvas width − 1, height − 1)
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return valid(w, h);
  }
  if (kind === 'VP8 ') {
    // frame tag(3) + start code 9D 01 2A, rồi width/height 14 bit little-endian
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return valid(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
  }
  if (kind === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const b0 = buf[21];
    const b1 = buf[22];
    const b2 = buf[23];
    const b3 = buf[24];
    const w = 1 + (b0 | ((b1 & 0x3f) << 8));
    const h = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10));
    return valid(w, h);
  }
  return null;
}
