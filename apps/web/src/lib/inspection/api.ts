"use client";

import { api, type ApiResponse } from "@/lib/apiClient";
import { useApiQuery, refreshApi, type Query } from "@/lib/query/useApiQuery";
import { inspectionResErrorText } from "./logic";
import type { DoorAccessView, InspectionBoard, InspectionDetail, InspectionPhotoView, InspectionResult, PhotoUploadMeta, SubmitInspectionDto } from "./types";

const enc = encodeURIComponent;

export const inspectionApi = {
  board: () => api.get<InspectionBoard>("/host/inspections"),
  detail: (id: string) => api.get<InspectionDetail>(`/host/inspections/${enc(id)}`),
  accept: (id: string) => api.post<InspectionDetail>(`/host/inspections/${enc(id)}/accept`),
  claim: (id: string) => api.post<InspectionDetail>(`/host/inspections/${enc(id)}/claim`),
  doorCode: (id: string) => api.post<DoorAccessView>(`/host/inspections/${enc(id)}/door-code`),
  uploadPhoto: (id: string, file: File, meta: PhotoUploadMeta) => {
    const form = new FormData();
    form.append("file", file);
    form.append("slot", meta.slot);
    if (meta.room) form.append("room", meta.room);
    if (meta.takenAt) form.append("takenAt", meta.takenAt);
    if (typeof meta.sharpness === "number" && Number.isFinite(meta.sharpness)) form.append("sharpness", String(Math.round(meta.sharpness * 10) / 10));
    if (typeof meta.brightness === "number" && Number.isFinite(meta.brightness)) form.append("brightness", String(Math.round(meta.brightness * 10) / 10));
    return api.postForm<InspectionPhotoView>(`/host/inspections/${enc(id)}/photos`, form);
  },
  removePhoto: (id: string, photoId: string) => api.delete<{ removed: true }>(`/host/inspections/${enc(id)}/photos/${enc(photoId)}`),
  submit: (id: string, dto: SubmitInspectionDto) => api.post<InspectionResult>(`/host/inspections/${enc(id)}/submit`, dto),
};

export const BOARD_KEY = "inspection-board";
export const inspectionKey = (id: string) => `inspection:${id}`;

/** Làm mới đúng bảng (và chi tiết `id` nếu có) — không kéo theo query khác. */
export const refreshInspections = (id?: string) => {
  refreshApi(BOARD_KEY);
  if (id) refreshApi(inspectionKey(id));
};

/** Bảng kèm giờ máy lúc nhận — để tính độ lệch với `serverTime` (đồng hồ hạn theo giờ máy chủ). */
export type InspectionBoardView = InspectionBoard & { receivedAt: number };

/**
 * Bảng thẩm định. `poll=true` (30 giây) chỉ ở MỘT nơi (HostShell); các màn khác dùng chung khoá nên nhận cùng dữ liệu.
 * `enabled=false` (không có vai Thẩm định) ⇒ không gọi mạng.
 */
export function useInspectionBoard(enabled = true, poll = false): Query<InspectionBoardView> {
  return useApiQuery<InspectionBoardView>(
    {
      key: BOARD_KEY,
      fetch: async () => {
        const res = await inspectionApi.board();
        return res.ok ? { ...res, data: { ...res.data, receivedAt: Date.now() } } : (res as unknown as ApiResponse<InspectionBoardView>);
      },
      errorText: (res) => inspectionResErrorText(res, "Không tải được danh sách thẩm định."),
    },
    enabled,
    { pollMs: poll ? 30_000 : null },
  );
}

/** Chi tiết một hồ sơ — KHÔNG poll (ảnh/nháp đang thao tác, không được bị ghi đè). */
export function useInspection(id: string): Query<InspectionDetail> {
  return useApiQuery<InspectionDetail>({
    key: inspectionKey(id),
    fetch: () => inspectionApi.detail(id),
    errorText: (res) => inspectionResErrorText(res, "Không tải được hồ sơ thẩm định."),
  });
}
