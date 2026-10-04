"use client";

import { Clock, Flame, Lock, Sparkles } from "lucide-react";
import { isBargain, savingsPct } from "@/lib/mock/cost";
import { HOT_THRESHOLD } from "@/lib/mock/selectors";
import type { Unit } from "@/lib/mock/units";

/** Huy hiệu động của căn: Căn hời phân khu (≥10% dưới giá TB toà) · HOT (≥3 lịch xem) · Đang giữ chỗ · FOMO khách đang xem. */
export function UnitBadges({ unit }: { unit: Unit & { activeViewingAt?: string | null } }) {
  // Trạng thái và độ quan tâm 24h đến thẳng từ backend (DB), không suy từ dữ liệu mock trong trình duyệt.
  const status = unit.baseStatus;
  const interest = unit.interest24h;

  let activeViewingLabel: string | null = null;
  if (unit.activeViewingAt) {
    const d = new Date(unit.activeViewingAt);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      activeViewingLabel = `${hours}:${mins}`;
    }
  }

  return (
    <>
      {status === "holding" && (
        <span className="badge badge-ink">
          <Lock size={12} /> Đang giữ căn
        </span>
      )}
      {status === "rented" && <span className="badge badge-ink">Đã cho thuê</span>}
      {status === "available" && activeViewingLabel && (
        <span className="badge badge-coral">
          <Clock size={12} /> Đang có khách xem lúc {activeViewingLabel}
        </span>
      )}
      {status === "available" && isBargain(unit) && (
        <span className="badge badge-amber">
          <Sparkles size={12} /> Căn hời −{savingsPct(unit)}%
        </span>
      )}
      {status === "available" && !activeViewingLabel && interest >= HOT_THRESHOLD && (
        <span className="badge badge-coral">
          <Flame size={12} /> HOT · {interest} người đang xem
        </span>
      )}
    </>
  );
}
