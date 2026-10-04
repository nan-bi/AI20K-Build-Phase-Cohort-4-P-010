import { api } from "@/lib/apiClient";
import { useApiQuery, invalidateApiPattern, type Query } from "@/lib/query/useApiQuery";
import type { HostRoleCode } from "@/lib/auth/portals";
import { knownErrorMessage } from "@/components/auth/authApi";

/** `GET /host/me` — hồ sơ của chính Field Host (không có số thẻ, không có mật khẩu). */
export interface HostMe {
  hostId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isPhoneVerified: boolean;
  assignedZone: string;
  roles: HostRoleCode[];
  dutyStatus: "ONLINE_AVAILABLE" | "BUSY_VIEWING" | "OFF_DUTY";
  rating: number;
  joinedAt: string;
}

export const hostApi = {
  me: () => api.get<HostMe>("/host/me"),
  sendPhoneOtp: (phone: string) =>
    api.post<{ expiresInSeconds: number; devCode?: string }>("/auth/otp/send", { phone, purpose: "PHONE_VERIFY" }),
  verifyPhone: (phone: string, code: string) => api.post<{ verified: boolean }>("/auth/phone/verify", { phone, code }),
};

export const invalidateHostMe = () => invalidateApiPattern("host-me");

export const useHostMe = (): Query<HostMe> =>
  useApiQuery<HostMe>({
    key: "host-me",
    fetch: hostApi.me,
    errorText: (res) => knownErrorMessage(res.code, res.message || "Không tải được hồ sơ."),
  });
