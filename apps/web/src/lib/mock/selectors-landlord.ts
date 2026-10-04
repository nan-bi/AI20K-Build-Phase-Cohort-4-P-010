import { activeLease, landlordUnits, unitStatus } from "./selectors";
import type { Mandate, MockState } from "./types";
import type { Unit, UnitStatus } from "./units";

/** Một dòng dữ liệu căn hộ của chủ nhà: gộp trạng thái căn, uỷ quyền và giá thuê hiện hành. */
export interface LandlordUnitRow {
  unit: Unit;
  status: UnitStatus;
  mandateStatus: Mandate["status"];
  mandateSignedAt?: string;
  rent: number;
}

/** Các căn đã ký gửi của chủ nhà, kèm trạng thái căn + uỷ quyền + giá thuê hiện hành (hợp đồng nếu có, gốc nếu chưa). */
export function landlordUnitRows(state: MockState, landlordId: string): LandlordUnitRow[] {
  return landlordUnits(state, landlordId).map((unit) => {
    const mandate = state.mandates[unit.id];
    const lease = activeLease(state, unit.id);
    return {
      unit,
      status: unitStatus(state, unit),
      mandateStatus: mandate?.status ?? "active",
      mandateSignedAt: mandate?.signedAt,
      rent: lease?.lease?.rent ?? unit.rent,
    };
  });
}

/** Hồ sơ ký gửi (chưa thành căn chính thức) của chủ nhà: draft/pending/approved/rejected. */
export function landlordConsignments(state: MockState, landlordId: string) {
  return state.consignments.filter((c) => c.landlordId === landlordId);
}

