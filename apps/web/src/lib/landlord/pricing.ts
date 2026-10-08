import type { ApiResponse } from "@/lib/apiClient";
import type { PricingProposal } from "./types";

/** So sánh đề xuất giá của Inspector với bản chủ khai (số nguyên VNĐ). */
export function pricingDiff(p: Pick<PricingProposal, "rent" | "securityDeposit" | "original">) {
  return {
    rentChanged: Math.round(p.rent) !== Math.round(p.original.rent),
    depositChanged: Math.round(p.securityDeposit) !== Math.round(p.original.securityDeposit),
    rentDelta: Math.round(p.rent) - Math.round(p.original.rent),
    depositDelta: Math.round(p.securityDeposit) - Math.round(p.original.securityDeposit),
  };
}

export type PricingDecisionOutcome =
  | { kind: "done" }
  /** 409 PRICING_NOT_PENDING: hồ sơ đã đổi trạng thái (tab khác / đã quyết) ⇒ tải lại. */
  | { kind: "reload"; message: string }
  /** 403 NOT_OWNER ⇒ về danh sách. */
  | { kind: "leave"; message: string }
  | { kind: "error"; message: string };

/** Hành vi bắt buộc của caller cho từng mã lỗi (01 §6). */
export function pricingDecisionOutcome(res: Pick<ApiResponse<unknown>, "ok" | "status" | "code" | "message">): PricingDecisionOutcome {
  if (res.ok) return { kind: "done" };
  if (res.status === 409 || res.code === "PRICING_NOT_PENDING") {
    return { kind: "reload", message: "Hồ sơ không còn chờ bạn duyệt giá. Đang tải lại…" };
  }
  if (res.status === 403 || res.code === "NOT_OWNER") {
    return { kind: "leave", message: "Hồ sơ này không thuộc về bạn." };
  }
  return { kind: "error", message: res.message || "Không gửi được quyết định, thử lại sau." };
}
