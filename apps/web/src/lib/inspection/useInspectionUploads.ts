"use client";

import { useCallback, useState } from "react";
import { compressPhoto } from "@/lib/landlord/compressPhoto";
import { inspectionApi } from "./api";
import { inspectionErrorText } from "./logic";
import { canOverride, judgePhoto, measurePhoto, type PhotoMetrics, type QualityReason } from "./photoQuality";
import { recompressLowest, TaskLimiter, uploadWithRecovery } from "./uploadQueue";
import type { InspectionPhotoView, ListingRoom } from "./types";

export type UploadStatus = "measuring" | "blocked" | "queued" | "uploading" | "error";

/** Một ảnh đang trên đường lên (chưa có trên server). Ảnh đã lên thì rời hàng và vào `detail.photos`. */
export interface UploadItem {
  localId: string;
  slot: string;
  room?: ListingRoom;
  name: string;
  previewUrl: string;
  status: UploadStatus;
  reason?: QualityReason;
  /** `blocked` + mờ nhẹ ⇒ cho "Vẫn dùng ảnh này". */
  canOverride: boolean;
  message?: string;
  retryable: boolean;
  file?: File;
  metrics?: PhotoMetrics | null;
}

let seq = 0;
const newId = () => `up-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * Hàng chờ tải ảnh của một hồ sơ: nén → đo → (chặn / tải). Tối đa 3 ảnh tải song song.
 * `onUploaded` nhận ảnh đã lên server cùng URL xem trước cục bộ.
 */
export function useInspectionUploads(id: string, onUploaded: (view: InspectionPhotoView, previewUrl: string) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [limiter] = useState(() => new TaskLimiter());

  const patch = useCallback((localId: string, p: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...p } : it)));
  }, []);
  const drop = useCallback((localId: string) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }, []);

  const start = useCallback(
    async (item: Pick<UploadItem, "localId" | "slot" | "room" | "previewUrl">, file: File, metrics: PhotoMetrics | null) => {
      patch(item.localId, { status: "queued", message: undefined, file, metrics });
      const out = await limiter.run(async () => {
        patch(item.localId, { status: "uploading" });
        return uploadWithRecovery({
          file,
          send: (f) =>
            inspectionApi.uploadPhoto(id, f, {
              slot: item.slot,
              room: item.room,
              takenAt: Number.isFinite(file.lastModified) && file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null,
              sharpness: metrics?.sharpness ?? null,
              brightness: metrics?.brightness ?? null,
            }),
          recompress: recompressLowest,
        });
      });
      if (out.ok) {
        drop(item.localId);
        onUploaded(out.view, item.previewUrl);
      } else {
        patch(item.localId, { status: "error", retryable: out.retryable, message: inspectionErrorText(out.code, out.message) });
      }
    },
    [id, limiter, onUploaded, patch, drop],
  );

  const addFiles = useCallback(
    (slot: string, room: ListingRoom | undefined, files: File[]) => {
      for (const raw of files) {
        const base = { localId: newId(), slot, room, previewUrl: URL.createObjectURL(raw) };
        setItems((prev) => [...prev, { ...base, name: raw.name, status: "measuring", canOverride: false, retryable: false }]);
        void (async () => {
          let file = raw;
          try {
            file = await compressPhoto(raw);
          } catch {
            /* dùng ảnh gốc */
          }
          let metrics: PhotoMetrics | null = null;
          try {
            metrics = await measurePhoto(file);
          } catch {
            metrics = null; // không đo được ⇒ để server kiểm định dạng/kích thước
          }
          const verdict = metrics ? judgePhoto(metrics) : ({ ok: true } as const);
          if (!verdict.ok) {
            patch(base.localId, { status: "blocked", reason: verdict.reason, canOverride: canOverride(verdict, metrics!), file, metrics });
            return;
          }
          await start(base, file, metrics);
        })();
      }
    },
    [patch, start],
  );

  const retry = useCallback(
    (localId: string) => {
      const it = items.find((x) => x.localId === localId);
      if (it?.file) void start(it, it.file, it.metrics ?? null);
    },
    [items, start],
  );

  /** "Vẫn dùng ảnh này" — chỉ hợp lệ với ảnh mờ nhẹ (`canOverride`). */
  const force = retry;

  const dismiss = useCallback(
    (localId: string) => {
      const it = items.find((x) => x.localId === localId);
      if (it) URL.revokeObjectURL(it.previewUrl);
      drop(localId);
    },
    [items, drop],
  );

  return { items, addFiles, retry, force, dismiss };
}
