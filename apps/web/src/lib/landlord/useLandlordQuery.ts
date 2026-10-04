"use client";

import { useApiQuery as useBaseApiQuery, type ApiQueryDef, type Query } from "../query/useApiQuery";
import { errorText } from "./api";
import type { QueryDef } from "./queries";

export {
  prefetchApi as prefetchLandlord,
  invalidateApiData as invalidateLandlordData,
  setApiCacheOwner as setLandlordCacheOwner,
  type QueryState,
  type Query,
} from "../query/useApiQuery";

/**
 * Tải dữ liệu từ API chủ nhà qua cache stale-while-revalidate.
 */
export function useLandlordQuery<T>(def: QueryDef<T>): Query<T> {
  const wrappedDef: ApiQueryDef<T> = {
    ...def,
    errorText: (res) => errorText(res, "Không tải được dữ liệu."),
  };
  return useBaseApiQuery(wrappedDef);
}
