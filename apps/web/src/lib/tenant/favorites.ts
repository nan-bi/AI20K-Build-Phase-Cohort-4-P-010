"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useSession } from "@/lib/auth/client";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { tenantApi, errorText } from "./api";
import { invalidateTenantFavorites, tenantQueries } from "./queries";
import { toUnit } from "./adapters";

/**
 * Căn đã lưu của khách thuê, lấy từ DB qua `/me/favorites`. Khách chưa đăng nhập bấm tim ⇒ chuyển sang đăng nhập
 * (không lưu tạm vào trình duyệt như bản mock cũ, để danh sách luôn khớp với tài khoản).
 */
export function useFavorites() {
  const { user } = useSession();
  const router = useRouter();
  const signedIn = user?.portal === "tenant";
  const query = useApiQuery(tenantQueries.favorites(signedIn));
  const [busy, setBusy] = useState<string | null>(null);

  const units = useMemo(
    () => (query.state.status === "ready" ? query.state.data.map(toUnit) : []),
    [query.state],
  );
  const codes = useMemo(() => new Set(units.map((u) => u.code.toUpperCase())), [units]);
  const loading = query.state.status === "loading";

  const isSaved = useCallback((code: string) => codes.has(code.toUpperCase()), [codes]);

  const toggle = useCallback(
    async (code: string) => {
      if (!signedIn) {
        const here = window.location.pathname + window.location.search;
        router.push(`/login?next=${encodeURIComponent(here)}`);
        return;
      }
      const wasSaved = codes.has(code.toUpperCase());
      setBusy(code);
      const res = wasSaved ? await tenantApi.removeFavorite(code) : await tenantApi.addFavorite(code);
      setBusy(null);
      if (!res.ok) {
        toast(errorText(res, "Không cập nhật được danh sách đã lưu."), "info");
        return;
      }
      invalidateTenantFavorites();
      toast(wasSaved ? "Đã bỏ khỏi danh sách lưu" : "Đã lưu căn này", wasSaved ? "info" : "success");
    },
    [signedIn, codes, router],
  );

  return { units, count: units.length, loading, isSaved, toggle, busy, signedIn, reload: query.reload };
}
