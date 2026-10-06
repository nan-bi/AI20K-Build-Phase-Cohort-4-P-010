"use client";

import { api, type ApiResponse } from "@/lib/apiClient";
import { useApiQuery, invalidateApiPattern, refreshApi, type Query } from "@/lib/query/useApiQuery";
import type { HostRoleCode } from "@/lib/auth/portals";
import { knownErrorMessage } from "@/components/auth/authApi";
import { hostErrorText } from "./logic";
import type { DoorAccessView, HostBoard, HostDuty, HostViewingDetail } from "./types";

/** Bảng kèm giờ máy Sale lúc nhận — để tính độ lệch với `serverTime` (đồng hồ SLA theo giờ máy chủ). */
export type HostBoardView = HostBoard & { receivedAt: number };

/** `GET /host/me` — hồ sơ của chính Field Host (không có số thẻ, không có mật khẩu). */
export interface HostMe {
  hostId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isPhoneVerified: boolean;
  assignedZone: string;
  roles: HostRoleCode[];
  dutyStatus: HostDuty;
  rating: number;
  joinedAt: string;
}

const enc = encodeURIComponent;

export const hostApi = {
  me: () => api.get<HostMe>("/host/me"),
  sendPhoneOtp: (phone: string) =>
    api.post<{ expiresInSeconds: number }>("/auth/otp/send", { phone, purpose: "PHONE_VERIFY" }),
  verifyPhone: (phone: string, code: string) => api.post<{ verified: boolean }>("/auth/phone/verify", { phone, code }),

  // ── Lịch & yêu cầu (hồ sơ 15) ──
  board: () => api.get<HostBoard>("/host/board"),
  accept: (ticketId: string) => api.post<HostViewingDetail>(`/host/tickets/${enc(ticketId)}/accept`),
  reject: (ticketId: string, reason: string) => api.post<{ rejected: true }>(`/host/tickets/${enc(ticketId)}/reject`, { reason }),
  claim: (ticketId: string) => api.post<HostViewingDetail>(`/host/tickets/${enc(ticketId)}/claim`),
  viewing: (ref: string) => api.get<HostViewingDetail>(`/host/viewings/${enc(ref)}`),
  remind: (ref: string) => api.post<HostViewingDetail>(`/host/viewings/${enc(ref)}/remind`),
  receive: (ref: string) => api.post<HostViewingDetail>(`/host/viewings/${enc(ref)}/receive`),
  openDoor: (ref: string) => api.post<{ viewing: HostViewingDetail; door: DoorAccessView }>(`/host/viewings/${enc(ref)}/open-door`),
  doorCode: (ref: string) => api.post<DoorAccessView>(`/host/viewings/${enc(ref)}/door-code`),
  noShow: (ref: string) => api.post<HostViewingDetail>(`/host/viewings/${enc(ref)}/no-show`),
  startDeposit: (ref: string) => api.post<HostViewingDetail>(`/host/viewings/${enc(ref)}/start-deposit`),
  notInterested: (ref: string, reason: string) => api.post<HostViewingDetail>(`/host/viewings/${enc(ref)}/not-interested`, { reason }),
  emergency: (ref: string, kind: "smart_lock" | "physical_key", note?: string) =>
    api.post<{ recorded: true; message: string }>(`/host/viewings/${enc(ref)}/emergency`, { kind, note }),
  setDuty: (status: "ONLINE_AVAILABLE" | "OFF_DUTY") => api.patch<{ dutyStatus: HostDuty }>("/host/me/duty", { status }),
};

export const invalidateHostMe = () => invalidateApiPattern("host-me");
export const BOARD_KEY = "host-board";
export const viewingKey = (ref: string) => `host-viewing:${ref}`;
/** Làm mới đúng bảng (và ca `ref` nếu có) — KHÔNG kéo theo các query khác. */
export const refreshHost = (ref?: string) => {
  refreshApi(BOARD_KEY);
  if (ref) refreshApi(viewingKey(ref));
};

export const useHostMe = (): Query<HostMe> =>
  useApiQuery<HostMe>({
    key: "host-me",
    fetch: hostApi.me,
    errorText: (res) => knownErrorMessage(res.code, res.message || "Không tải được hồ sơ."),
  });

/**
 * Bảng "Lịch & yêu cầu". `poll=true` chỉ ở MỘT nơi (HostShell, luôn có mặt): các nơi khác dùng chung khoá nên cùng
 * nhận dữ liệu mới từ cùng một request. `enabled=false` (Host không có vai Sale) ⇒ không gọi mạng.
 */
export function useHostBoard(enabled = true, poll = false): Query<HostBoardView> {
  return useApiQuery<HostBoardView>(
    {
      key: BOARD_KEY,
      fetch: async () => {
        const res = await hostApi.board();
        return res.ok ? { ...res, data: { ...res.data, receivedAt: Date.now() } } : (res as unknown as ApiResponse<HostBoardView>);
      },
      errorText: (res) => hostErrorText(res, "Không tải được bảng lịch."),
    },
    enabled,
    { pollMs: poll ? 15_000 : null },
  );
}

const LIVE = new Set(["confirmed", "lobby", "receiving", "viewing", "closing"]);

/** Ca xem — poll 5 giây khi ca đang diễn ra, 30 giây khi khác (hẹn sau khi đã có phản hồi trước). */
export function useHostViewing(ref: string): Query<HostViewingDetail> {
  return useApiQuery<HostViewingDetail>(
    {
      key: viewingKey(ref),
      fetch: () => hostApi.viewing(ref),
      errorText: (res) => hostErrorText(res, "Không tải được ca xem phòng."),
    },
    true,
    { pollMs: (d) => (d && LIVE.has(d.status) ? 5_000 : 30_000) },
  );
}
