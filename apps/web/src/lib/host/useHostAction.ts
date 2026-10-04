"use client";

import { useCallback, useState } from "react";
import type { ApiResponse } from "@/lib/apiClient";
import { toast } from "@/components/ui/Toast";
import { primeApiData } from "@/lib/query/useApiQuery";
import { refreshHost, viewingKey } from "./api";
import { hostErrorText, STALE_CODES } from "./logic";
import type { HostViewingDetail } from "./types";

/**
 * Chạy một hành động của Sale: khoá nút trong lúc chờ, toast kết quả. Thành công ⇒ nếu phản hồi đã chứa ca mới
 * (`pick`) thì GHI THẲNG vào cache (không gọi lại API, màn đổi bước ngay), ngược lại tải lại ca; bảng luôn được làm
 * mới. Lỗi "dữ liệu đã cũ" (`bad_status`, `ticket_taken`…) ⇒ tải lại. Trả phản hồi để caller xử lý tiếp.
 */
export function useHostAction(ref?: string) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(call: () => Promise<ApiResponse<T>>, okText?: string, pick?: (data: T) => HostViewingDetail | null): Promise<ApiResponse<T>> => {
      setBusy(true);
      const res = await call();
      setBusy(false);
      if (res.ok) {
        if (okText) toast(okText, "success");
        const next = pick?.(res.data) ?? null;
        if (next) primeApiData(viewingKey(next.ref), next);
        refreshHost(next ? undefined : ref);
      } else {
        toast(hostErrorText(res));
        if (STALE_CODES.has(res.code ?? "")) refreshHost(ref);
      }
      return res;
    },
    [ref],
  );
  return { busy, run };
}
