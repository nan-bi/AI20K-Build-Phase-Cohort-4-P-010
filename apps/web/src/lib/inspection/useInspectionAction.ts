"use client";

import { useCallback, useState } from "react";
import type { ApiResponse } from "@/lib/apiClient";
import { requestPhoneVerify } from "@/components/host/PhoneVerifyGate";
import { toast } from "@/components/ui/Toast";
import { primeApiData } from "@/lib/query/useApiQuery";
import { inspectionKey, refreshInspections } from "./api";
import { inspectionResErrorText, STALE_CODES } from "./logic";
import type { InspectionDetail } from "./types";

/**
 * Chạy một hành động của Inspector: khoá nút trong lúc chờ, toast kết quả. Thành công ⇒ nếu phản hồi chứa chi tiết mới
 * (`pick`) thì ghi thẳng vào cache; bảng luôn được làm mới. Lỗi "dữ liệu đã cũ" ⇒ tải lại.
 */
export function useInspectionAction(id?: string) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async function exec<T>(call: () => Promise<ApiResponse<T>>, okText?: string, pick?: (data: T) => InspectionDetail | null): Promise<ApiResponse<T>> {
      setBusy(true);
      const res = await call();
      setBusy(false);
      if (res.code === "phone_not_verified") {
        // Chưa xác thực SĐT: hộp thoại xác thực tại chỗ, xong tự chạy lại thao tác này (không toast lỗi, không rời màn).
        requestPhoneVerify(() => void exec(call, okText, pick));
        return res;
      }
      if (res.ok) {
        if (okText) toast(okText, "success");
        const next = pick?.(res.data) ?? null;
        if (next) primeApiData(inspectionKey(next.id), next);
        refreshInspections(next ? undefined : id);
      } else {
        toast(inspectionResErrorText(res));
        if (STALE_CODES.has(res.code ?? "")) refreshInspections(id);
      }
      return res;
    },
    [id],
  );
  return { busy, run };
}
