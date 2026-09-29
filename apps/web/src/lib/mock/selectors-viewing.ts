import type { MockState } from "./types";
import { maskPhone } from "./format";

export interface ViewingLogEntry {
  bookingId: string;
  ref: string;
  unitId: string;
  hostId: string;
  tenantName: string;
  tenantPhone: string;
  tenantPhoneMasked: string; // chủ nhà CHỈ render tenantPhoneMasked
  startedAt: string;        // receivingAt
  doorOpenedAt?: string;    // viewingAt
  endedAt?: string;         // viewEndedAt
  durationMin?: number;     // round((endedAt − startedAt)/60000)
  outcome: "in_progress" | "deposit" | "not_decided" | "no_show" | "cancelled";
  note?: string;            // closedReason
}

/**
 * Trích xuất nhật ký lượt xem từ các booking có receivingAt (SPEC-P01 §5).
 * Dữ liệu dẫn xuất thuần túy, sắp xếp theo thời gian bắt đầu giảm dần.
 */
export function viewingLog(
  state: MockState,
  filter: { unitId?: string; hostId?: string } = {}
): ViewingLogEntry[] {
  const matching = state.bookings.filter((b) => {
    if (!b.receivingAt) return false;
    if (filter.unitId && b.unitId !== filter.unitId) return false;
    if (filter.hostId && b.hostId !== filter.hostId) return false;
    return true;
  });

  matching.sort((a, b) => {
    const timeA = Date.parse(a.receivingAt!);
    const timeB = Date.parse(b.receivingAt!);
    return timeB - timeA;
  });

  return matching.map((b) => {
    let outcome: ViewingLogEntry["outcome"] = "in_progress";
    if (b.status === "receiving" || b.status === "viewing") {
      outcome = "in_progress";
    } else if (b.deposit) {
      outcome = "deposit";
    } else if (b.status === "completed") {
      outcome = "not_decided";
    } else if (b.status === "no_show") {
      outcome = "no_show";
    } else if (b.status === "cancelled" || b.status === "rejected") {
      outcome = "cancelled";
    }

    const startedAt = b.receivingAt!;
    const doorOpenedAt = b.viewingAt;
    const endedAt = b.viewEndedAt;
    let durationMin: number | undefined;
    if (endedAt) {
      const ms = Date.parse(endedAt) - Date.parse(startedAt);
      durationMin = Math.max(0, Math.round(ms / 60_000));
    }

    return {
      bookingId: b.id,
      ref: b.ref,
      unitId: b.unitId,
      hostId: b.hostId,
      tenantName: b.tenant.name,
      tenantPhone: b.tenant.phone,
      tenantPhoneMasked: maskPhone(b.tenant.phone),
      startedAt,
      doorOpenedAt,
      endedAt,
      durationMin,
      outcome,
      note: b.closedReason,
    };
  });
}
