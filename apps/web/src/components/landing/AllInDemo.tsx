"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AllInBar } from "@/components/unit/AllInBar";
import { allInCost, RATES, type Household } from "@/lib/pricing/cost";
import { vnd, vndShort } from "@/lib/format";
import { unitAddress } from "@/lib/units";
import { useCatalog } from "@/lib/tenant/catalog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function Step({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Giảm ${label.toLowerCase()}`}
        >
          <Minus size={14} />
        </Button>
        <span className="w-4 text-center font-medium font-mono text-sm">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Tăng ${label.toLowerCase()}`}
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}

/** Minh hoạ trực tiếp bảng All-in Cost: đổi số người và xe, tổng tiền đổi theo. */
export function AllInDemo() {
  const [hh, setHh] = useState<Household>({ persons: 2, motorbikes: 1, cars: 0 });
  const { available } = useCatalog();

  const unit = [...available].sort((a, b) => a.rent - b.rent)[Math.floor(available.length / 2)];

  if (!unit) {
    return <div className="animate-pulse bg-muted rounded-2xl min-h-[320px] w-full" aria-hidden />;
  }

  const cost = allInCost(unit, hh);

  return (
    <div className="flex flex-col h-full bg-card p-6 gap-6 rounded-2xl">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {unitAddress(unit)} · {unit.areaM2} m²
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-4xl font-bold tracking-tight text-foreground font-mono">
            {vnd(cost.total)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">đ/tháng, đã gồm mọi phí</span>
        </div>
      </div>

      <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
        <AllInBar cost={cost} variant="table" />
      </div>

      <div className="flex flex-col mt-2">
        <Step label="Số người ở" hint={`Điện nước ${vndShort(RATES.utilityPerPerson)}/người`} value={hh.persons} min={1} max={6} onChange={(n) => setHh({ ...hh, persons: n })} />
        <Separator />
        <Step label="Xe máy" hint={`${vndShort(RATES.motorbike)}/xe`} value={hh.motorbikes} min={0} max={3} onChange={(n) => setHh({ ...hh, motorbikes: n })} />
        <Separator />
        <Step label="Ô tô" hint={`${vndShort(RATES.car)}/xe`} value={hh.cars} min={0} max={2} onChange={(n) => setHh({ ...hh, cars: n })} />
      </div>
    </div>
  );
}
