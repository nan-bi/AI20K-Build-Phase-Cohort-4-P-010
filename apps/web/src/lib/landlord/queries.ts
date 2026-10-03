import type { ApiResponse } from "@/lib/apiClient";
import { landlordApi } from "./api";

/** Một truy vấn có tên: `key` định danh bản ghi trong cache, `fetch` là cách lấy dữ liệu (luôn suy ra được từ `key`). */
export interface QueryDef<T> {
  key: string;
  fetch: () => Promise<ApiResponse<T>>;
}

/** Danh mục truy vấn của cổng Chủ nhà — mọi màn dùng chung `key` nên chia sẻ cache và tải trước được cho nhau. */
export const queries = {
  units: { key: "units", fetch: landlordApi.units } satisfies QueryDef<unknown>,
  consignments: { key: "consignments", fetch: landlordApi.consignments } satisfies QueryDef<unknown>,
  finance: { key: "finance", fetch: landlordApi.finance } satisfies QueryDef<unknown>,
  profile: { key: "profile", fetch: landlordApi.profile } satisfies QueryDef<unknown>,
  buildings: { key: "buildings", fetch: landlordApi.buildings } satisfies QueryDef<unknown>,
  unit: (id: string) => ({ key: `unit:${id}`, fetch: () => landlordApi.unit(id) }),
  consignment: (id: string) => ({ key: `consignment:${id}`, fetch: () => landlordApi.consignment(id) }),
};
