/**
 * Kiểm chất lượng ảnh trên máy Host (SPEC-P02 §4). Ngưỡng MIRROR từ backend
 * `backend/src/modules/inspection/inspection.constants.ts` (01-CONTRACTS §4) — đổi một nơi phải đổi cả hai.
 * Server vẫn kiểm lại phần không thể giả (định dạng, cạnh ngắn); metric độ nét/độ sáng chỉ để chặn sớm.
 */
export const PHOTO_MIN_SIDE_PX = 200;
export const SHARPNESS_MIN = 60;
export const BRIGHTNESS_MIN = 40;
export const BRIGHTNESS_MAX = 235;
/** Ảnh hơi mờ nhưng còn đọc được (≥ 60% ngưỡng) cho phép "Vẫn dùng ảnh này". */
export const SHARPNESS_OVERRIDE_RATIO = 0.6;
/** Cạnh dài khi đo (thu nhỏ để đo nhanh, nhất quán giữa các máy). */
export const MEASURE_LONG_SIDE = 512;

export interface PhotoMetrics {
  width: number;
  height: number;
  sharpness: number;
  brightness: number;
}
export type QualityReason = "too_small" | "blurry" | "too_dark" | "too_bright";
export type QualityVerdict = { ok: true } | { ok: false; reason: QualityReason };

export const QUALITY_MESSAGE: Record<QualityReason, string> = {
  too_small: "Ảnh quá nhỏ — chụp gần hơn hoặc dùng camera sau",
  blurry: "Ảnh bị mờ — giữ máy chắc tay, lau ống kính rồi chụp lại",
  too_dark: "Ảnh quá tối — bật đèn phòng",
  too_bright: "Ảnh cháy sáng — tránh chụp ngược sáng",
};

/** Phương sai của đáp ứng nhân Laplacian 3×3 [0,1,0;1,-4,1;0,1,0] trên các điểm ảnh bên trong. Ảnh phẳng ⇒ 0. */
export function laplacianVariance(gray: Uint8ClampedArray, w: number, h: number): number {
  if (w < 3 || h < 3 || gray.length < w * h) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const r = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += r;
      sumSq += r * r;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function meanBrightness(gray: Uint8ClampedArray): number {
  if (gray.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < gray.length; i++) s += gray[i];
  return s / gray.length;
}

/** Thứ tự kiểm: too_small → too_dark → too_bright → blurry. */
export function judgePhoto(m: PhotoMetrics): QualityVerdict {
  if (Math.min(m.width, m.height) < PHOTO_MIN_SIDE_PX) return { ok: false, reason: "too_small" };
  if (m.brightness < BRIGHTNESS_MIN) return { ok: false, reason: "too_dark" };
  if (m.brightness > BRIGHTNESS_MAX) return { ok: false, reason: "too_bright" };
  if (m.sharpness < SHARPNESS_MIN) return { ok: false, reason: "blurry" };
  return { ok: true };
}

/** "Vẫn dùng ảnh này" chỉ với `blurry` khi ảnh còn đọc được; `too_small` (và tối/cháy) luôn chặn. */
export function canOverride(verdict: QualityVerdict, m: PhotoMetrics): boolean {
  return !verdict.ok && verdict.reason === "blurry" && m.sharpness >= SHARPNESS_OVERRIDE_RATIO * SHARPNESS_MIN;
}

/** Đo ảnh bằng canvas: thu về cạnh dài 512px, chuyển xám (0.299R+0.587G+0.114B). Chỉ chạy trên trình duyệt. */
export async function measurePhoto(file: File): Promise<PhotoMetrics> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") throw new Error("no_canvas");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MEASURE_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no_canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    return {
      width: bitmap.width,
      height: bitmap.height,
      sharpness: laplacianVariance(gray, w, h),
      brightness: meanBrightness(gray),
    };
  } finally {
    bitmap.close();
  }
}
