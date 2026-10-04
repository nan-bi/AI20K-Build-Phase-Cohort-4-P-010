"use client";

import { useMemo } from "react";
import { useApiQuery } from "@/lib/query/useApiQuery";
import { toUnit, type UnitWithExtras } from "./adapters";
import { tenantQueries } from "./queries";

/** Catalog công khai THẬT (API A1) đã đổi sang kiểu `Unit` của UI. Dùng chung cache với `/units`. */
/** `enabled=false` ⇒ không tải danh sách (trang chỉ cần 1 căn không nên kéo cả catalog). */
export function useCatalog(enabled = true) {
  const query = useApiQuery(tenantQueries.units(), enabled);
  const units = useMemo<UnitWithExtras[]>(
    () => (query.state.status === "ready" ? query.state.data.map(toUnit) : []),
    [query.state],
  );
  return {
    units,
    available: useMemo(() => units.filter((u) => u.baseStatus === "available"), [units]),
    loading: query.state.status === "loading",
    error: query.state.status === "error" ? query.state.message : null,
    reload: query.reload,
  };
}

/** Các căn còn trống cùng layout, giá sát nhất — gợi ý khi căn đang xem bị giữ chỗ hoặc đã cho thuê. */
export function similarUnits<T extends { code: string; layout: string; rent: number; baseStatus?: string }>(
  units: T[],
  unit: { code: string; layout: string; rent: number },
  n = 3,
): T[] {
  return units
    .filter((u) => u.code !== unit.code && u.layout === unit.layout && u.baseStatus === "available")
    .sort((a, b) => Math.abs(a.rent - unit.rent) - Math.abs(b.rent - unit.rent))
    .slice(0, n);
}
