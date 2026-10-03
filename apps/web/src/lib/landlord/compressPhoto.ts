import { MAX_PHOTO_BYTES } from "./photos";

/** Các mức nén thử lần lượt (cạnh dài tối đa px, chất lượng JPEG) cho tới khi ảnh nhỏ hơn MAX_PHOTO_BYTES. */
export const COMPRESS_STEPS: { maxSide: number; quality: number }[] = [
  { maxSide: 1600, quality: 0.82 },
  { maxSide: 1280, quality: 0.7 },
  { maxSide: 1024, quality: 0.6 },
];

/** Ảnh JPEG/WebP đã nhỏ hơn mức này và không quá lớn về kích thước thì giữ nguyên, khỏi nén lại làm giảm chất lượng. */
const KEEP_BELOW_BYTES = 400 * 1024;

/** Kích thước sau khi thu nhỏ sao cho cạnh dài ≤ `maxSide`, giữ tỉ lệ; không bao giờ phóng to. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
}

export const toJpegName = (name: string) => name.replace(/\.[^./\\]+$/, "") + ".jpg";

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Nén ảnh trên trình duyệt trước khi tải lên: thu nhỏ cạnh dài còn ≤1600px rồi xuất JPEG. Ảnh điện thoại 3–8MB
 * thường còn 200–500KB — để dung lượng Supabase (bản free có hạn) chứa được nhiều hồ sơ hơn hàng chục lần.
 * Trả về file gốc nếu không nén được (trình duyệt không hỗ trợ, ảnh hỏng) hoặc nén không có lợi.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    // Mặc định trình duyệt đã xoay ảnh theo EXIF (ảnh chụp dọc không bị nằm ngang).
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const small = Math.max(bitmap.width, bitmap.height) <= COMPRESS_STEPS[0].maxSide;
    if (small && file.size <= KEEP_BELOW_BYTES && (file.type === "image/jpeg" || file.type === "image/webp")) return file;

    let best: Blob | null = null;
    for (const step of COMPRESS_STEPS) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, step.maxSide);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      // JPEG không có kênh trong suốt: nền trắng để PNG trong suốt không bị đen.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await toBlob(canvas, step.quality);
      if (!blob) return file;
      best = blob;
      if (blob.size <= MAX_PHOTO_BYTES) break;
    }
    if (!best || (best.size >= file.size && file.size <= MAX_PHOTO_BYTES)) return file;
    return new File([best], toJpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
