"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { QUALITY_MESSAGE } from "@/lib/inspection/photoQuality";
import type { UploadItem } from "@/lib/inspection/useInspectionUploads";
import type { InspectionPhotoView } from "@/lib/inspection/types";
import { ROOM_LABEL } from "@/lib/inspection/logic";
import styles from "./Inspection.module.css";

interface PhotoStripProps {
  slot: string;
  /** Ảnh đã trên server của slot này. */
  photos: InspectionPhotoView[];
  uploads: UploadItem[];
  previews: Record<string, string>;
  /** Tối đa ảnh cho slot (1–4 mỗi dòng; 12 niêm yết). */
  max: number;
  totalLeft: number;
  removing: ReadonlySet<string>;
  label?: string;
  /** Hiện "đã có/tối đa" trên nút thêm (tắt ở khối ảnh niêm yết vì số đếm nằm ngoài). */
  showCount?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (photoId: string) => void;
  onRetry: (localId: string) => void;
  onForce: (localId: string) => void;
  onDismiss: (localId: string) => void;
}

const STATUS_TEXT: Record<UploadItem["status"], string> = {
  measuring: "Đang đo ảnh…",
  blocked: "Bị chặn",
  queued: "Chờ tải…",
  uploading: "Đang tải…",
  error: "Lỗi tải",
};

/** Dải 1–N ảnh của một dòng/khối: chụp (camera sau) hoặc chọn nhiều ảnh, mỗi ảnh có trạng thái riêng. */
export function PhotoStrip({ slot, photos, uploads, previews, max, totalLeft, removing, label = "Thêm ảnh", showCount = true, onAdd, onRemove, onRetry, onForce, onDismiss }: PhotoStripProps) {
  const input = useRef<HTMLInputElement>(null);
  const used = photos.length + uploads.length;
  const left = Math.max(0, Math.min(max - used, totalLeft));

  return (
    <div className={styles.strip} data-slot={slot}>
      {photos.map((p) => {
        const src = p.url ?? previews[p.id] ?? null;
        return (
          <div key={p.id} className={styles.thumb}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element -- link ký tạm thời / blob cục bộ, không dùng next/image
              <img src={src} alt={`Ảnh ${slot}${p.room ? ` · ${ROOM_LABEL[p.room]}` : ""}`} loading="lazy" />
            ) : (
              <span className="muted xs">Ảnh đã lên</span>
            )}
            {p.room && <span className={styles.thumbTag}>{ROOM_LABEL[p.room]}</span>}
            <button type="button" className={styles.thumbX} aria-label="Xoá ảnh" disabled={removing.has(p.id)} onClick={() => onRemove(p.id)}>
              <X size={13} />
            </button>
          </div>
        );
      })}

      {uploads.map((u) => {
        const bad = u.status === "blocked" || u.status === "error";
        const busy = u.status === "measuring" || u.status === "queued" || u.status === "uploading";
        return (
          <div key={u.localId} className={`${styles.thumb} ${busy ? styles.thumbBusy : ""} ${bad ? styles.thumbBad : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob cục bộ */}
              <img src={u.previewUrl} alt={u.name} />
              <span className={`${styles.thumbTag} ${bad ? styles.thumbTagBad : ""}`}>{STATUS_TEXT[u.status]}</span>
              {u.status !== "uploading" && (
                <button type="button" className={styles.thumbX} aria-label="Bỏ ảnh này" onClick={() => onDismiss(u.localId)}>
                  <X size={13} />
                </button>
              )}
          </div>
        );
      })}

      {left > 0 && (
        <>
          <button type="button" className={styles.addBtn} onClick={() => input.current?.click()}>
            <Camera size={20} />
            <span>{label}</span>
            {showCount && (
              <span className="muted xs">
                {used}/{max}
              </span>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className={styles.fileInput}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, left);
              e.target.value = "";
              if (files.length) onAdd(files);
            }}
          />
        </>
      )}
      {left === 0 && used < max && (
        <span className="muted xs" style={{ alignSelf: "center" }}>
          Đã đủ hạn mức ảnh của hồ sơ.
        </span>
      )}

      {uploads.some((u) => u.status === "blocked" || u.status === "error") && (
        <div className={styles.stripNotes} role="alert">
          {uploads
            .filter((u) => u.status === "blocked" || u.status === "error")
            .map((u) => (
              <div key={u.localId} className={styles.note}>
                <span>{u.status === "blocked" && u.reason ? QUALITY_MESSAGE[u.reason] : (u.message ?? "Không tải được ảnh.")}</span>
                {u.status === "blocked" && u.canOverride && (
                  <button type="button" className={`btn btn-quiet ${styles.noteBtn}`} onClick={() => onForce(u.localId)}>
                    Vẫn dùng ảnh này
                  </button>
                )}
                {u.status === "error" && u.retryable && (
                  <button type="button" className={`btn btn-quiet ${styles.noteBtn}`} onClick={() => onRetry(u.localId)}>
                    Thử lại
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
