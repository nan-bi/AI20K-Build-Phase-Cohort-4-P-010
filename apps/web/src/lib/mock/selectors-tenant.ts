import { isOpenBooking } from "./selectors";
import type { Booking, MockState } from "./types";

/** Lịch xem của một khách thuê, mới nhất trước — dùng cho `/account/bookings`. */
export function tenantBookings(state: MockState, phone: string): Booking[] {
  return state.bookings
    .filter((b) => b.tenant.phone === phone)
    .slice()
    .sort((a, b) => new Date(b.slot).getTime() - new Date(a.slot).getTime());
}

export const tenantUpcomingBookings = (state: MockState, phone: string): Booking[] =>
  tenantBookings(state, phone).filter(isOpenBooking);

export const tenantPastBookings = (state: MockState, phone: string): Booking[] =>
  tenantBookings(state, phone).filter((b) => !isOpenBooking(b));

/** Lịch có ít nhất một khoản cọc/thoả thuận/hợp đồng — dùng cho `/account/contracts`. */
export function tenantContracts(state: MockState, phone: string): Booking[] {
  return tenantBookings(state, phone).filter((b) => b.deposit || b.agreement || b.lease);
}

/** Trạng thái eKYC mới nhất của khách (nếu có), dùng cho Section "Xác minh danh tính" ở `/account`. */
export function tenantLatestKyc(state: MockState, phone: string) {
  return tenantBookings(state, phone).find((b) => b.kyc)?.kyc;
}
