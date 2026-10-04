import type { ApiQueryDef } from "@/lib/query/useApiQuery";
import { invalidateApiPattern } from "@/lib/query/useApiQuery";
import { tenantApi, errorText, type UnitFilter } from "./api";
import type {
  DepositTermsDoc,
  TenantBooking,
  TenantContract,
  TenantUnit,
} from "./types";

export const tenantQueries = {
  units: (filter?: UnitFilter): ApiQueryDef<TenantUnit[]> => {
    const key = `tenant:units:${filter?.zone || ""}:${filter?.layout || ""}:${filter?.maxRent || ""}:${filter?.q || ""}`;
    return {
      key,
      fetch: () => tenantApi.units(filter),
      errorText: (res) => errorText(res, "Không tải được danh sách căn hộ."),
    };
  },

  unit: (code: string): ApiQueryDef<TenantUnit> => ({
    key: `tenant:unit:${code.toUpperCase()}`,
    fetch: () => tenantApi.unit(code),
    errorText: (res) => errorText(res, "Không tải được thông tin căn hộ."),
  }),

  busySlots: (code: string, from?: string, to?: string): ApiQueryDef<{ slots: string[] }> => ({
    key: `tenant:busy-slots:${code.toUpperCase()}:${from || ""}:${to || ""}`,
    fetch: () => tenantApi.busySlots(code, from, to),
    errorText: (res) => errorText(res, "Không tải được lịch bận của căn hộ."),
  }),

  bookings: (): ApiQueryDef<TenantBooking[]> => ({
    key: "tenant:bookings",
    fetch: tenantApi.myBookings,
    errorText: (res) => errorText(res, "Không tải được danh sách lịch hẹn."),
  }),

  booking: (ref: string): ApiQueryDef<TenantBooking> => ({
    key: `tenant:booking:${ref.toUpperCase()}`,
    fetch: () => tenantApi.bookingByRef(ref),
    errorText: (res) => errorText(res, "Không tìm thấy lịch hẹn trong tài khoản của bạn."),
  }),

  contracts: (): ApiQueryDef<TenantContract[]> => ({
    key: "tenant:contracts",
    fetch: tenantApi.myContracts,
    errorText: (res) => errorText(res, "Không tải được danh sách hợp đồng."),
  }),

  /** `signedIn=false` ⇒ không gọi API (khách vãng lai không có danh sách yêu thích), trả rỗng. */
  favorites: (signedIn: boolean): ApiQueryDef<TenantUnit[]> =>
    signedIn
      ? {
          key: "tenant:favorites",
          fetch: tenantApi.favorites,
          errorText: (res) => errorText(res, "Không tải được danh sách căn đã lưu."),
        }
      : {
          key: "tenant:favorites:anon",
          fetch: async () => ({ ok: true, status: 200, data: [] }),
        },

  depositTerms: (unitCode?: string): ApiQueryDef<DepositTermsDoc> => ({
    key: `tenant:terms:${unitCode ? unitCode.toUpperCase() : "default"}`,
    fetch: () => tenantApi.depositTerms(unitCode),
    errorText: (res) => errorText(res, "Không tải được điều khoản đặt cọc."),
  }),
};

export function invalidateTenantUnits() {
  invalidateApiPattern("tenant:units");
}

export function invalidateTenantUnit(code: string) {
  invalidateApiPattern(`tenant:unit:${code.toUpperCase()}`);
}

export function invalidateTenantBookings() {
  invalidateApiPattern("tenant:bookings");
}

export function invalidateTenantBooking(ref: string) {
  invalidateApiPattern(`tenant:booking:${ref.toUpperCase()}`);
}

export function invalidateTenantContracts() {
  invalidateApiPattern("tenant:contracts");
}

export function invalidateTenantTerms(unitCode?: string) {
  invalidateApiPattern(`tenant:terms:${unitCode ? unitCode.toUpperCase() : "default"}`);
}

export function invalidateTenantFavorites() {
  invalidateApiPattern("tenant:favorites");
}
