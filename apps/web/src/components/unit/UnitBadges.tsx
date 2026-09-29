"use client";

import { Flame, Lock, Sparkles } from "lucide-react";
import { isBargain, savingsPct } from "@/lib/mock/cost";
import { HOT_THRESHOLD, unitInterest, unitStatus } from "@/lib/mock/selectors";
import { useMock } from "@/lib/mock/store";
import type { Unit } from "@/lib/mock/units";

/** Huy hiệu động của căn: Căn hời phân khu (≥10% dưới giá TB toà) · HOT (≥3 lịch xem) · Đang giữ chỗ. */
export function UnitBadges({ unit }: { unit: Unit }) {
  const state = useMock();
  const status = unitStatus(state, unit);
  const interest = unitInterest(state, unit);
  return (
    <>
      {status === "holding" && (
        <span className="badge badge-ink">
          <Lock size={12} /> Đang giữ căn
        </span>
      )}
      {status === "rented" && <span className="badge badge-ink">Đã cho thuê</span>}
      {status === "available" && isBargain(unit) && (
        <span className="badge badge-amber">
          <Sparkles size={12} /> Căn hời −{savingsPct(unit)}%
        </span>
      )}
      {status === "available" && interest >= HOT_THRESHOLD && (
        <span className="badge badge-coral">
          <Flame size={12} /> HOT · {interest} người đang xem
        </span>
      )}
    </>
  );
}
