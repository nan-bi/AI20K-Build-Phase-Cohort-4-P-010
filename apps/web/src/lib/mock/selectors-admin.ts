import type { Booking, Consignment, MockState } from "./types";

/** Yêu cầu ký gửi theo id — dùng cho `/admin/inventory/[id]` khi id không khớp một Unit có sẵn. */
export function consignmentById(state: MockState, id: string): Consignment | undefined {
  return state.consignments.find((c) => c.id === id);
}

/** Lịch xem gần nhất của một căn, mới nhất trước — dùng cho hồ sơ căn ở cổng Admin. */
export function unitBookings(state: MockState, unitId: string): Booking[] {
  return state.bookings.filter((b) => b.unitId === unitId).sort((a, b) => b.slot.localeCompare(a.slot));
}
