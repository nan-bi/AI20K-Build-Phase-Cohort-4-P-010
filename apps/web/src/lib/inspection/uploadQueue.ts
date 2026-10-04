import type { ApiResponse } from "@/lib/apiClient";
import { COMPRESS_STEPS, fitWithin, toJpegName } from "@/lib/landlord/compressPhoto";
import type { InspectionPhotoView } from "./types";

/** Hàng chờ tải ảnh (SPEC-P03 §1): tối đa 3 song song; lỗi tạm thời giữ lại cho "Thử lại". */
export const UPLOAD_CONCURRENCY = 3;

/** Bộ giới hạn đồng thời: `run(fn)` chạy ngay nếu còn chỗ, không thì xếp hàng theo thứ tự đến. */
export class TaskLimiter {
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(private readonly max = UPLOAD_CONCURRENCY) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
}

export type UploadOutcome =
  | { ok: true; view: InspectionPhotoView }
  | { ok: false; code?: string; message?: string; status: number; retryable: boolean };

/** Lỗi tạm thời (mạng, kho ảnh, 5xx) ⇒ giữ trong hàng cho "Thử lại"; lỗi nội dung ảnh thì không. */
export function isRetryableUpload(res: Pick<ApiResponse<unknown>, "status" | "code">): boolean {
  return res.status === 0 || res.code === "storage_unavailable" || res.status >= 500;
}

/**
 * Gửi ảnh; `photo_too_large` ⇒ nén lại mức `COMPRESS_STEPS[2]` rồi thử ĐÚNG 1 lần nữa (SPEC-P03 §1).
 * `send`/`recompress` được tiêm vào để test không cần mạng/canvas.
 */
export async function uploadWithRecovery(args: {
  file: File;
  send: (file: File) => Promise<ApiResponse<InspectionPhotoView>>;
  recompress: (file: File) => Promise<File>;
}): Promise<UploadOutcome> {
  let res = await args.send(args.file);
  if (!res.ok && res.code === "photo_too_large") {
    let smaller: File;
    try {
      smaller = await args.recompress(args.file);
    } catch {
      smaller = args.file;
    }
    res = await args.send(smaller);
  }
  if (res.ok) return { ok: true, view: res.data };
  return { ok: false, code: res.code, message: res.message, status: res.status, retryable: isRetryableUpload(res) };
}

/** Nén lại ở mức thấp nhất (`COMPRESS_STEPS[2]`): cạnh dài 1024px, JPEG 0.6. Chỉ chạy trên trình duyệt. */
export async function recompressLowest(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  const step = COMPRESS_STEPS[2];
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, step.maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", step.quality));
    return blob ? new File([blob], toJpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified }) : file;
  } finally {
    bitmap.close();
  }
}
