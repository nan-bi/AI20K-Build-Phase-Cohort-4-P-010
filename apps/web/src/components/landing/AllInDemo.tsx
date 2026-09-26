"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AllInBar } from "@/components/unit/AllInBar";
import { allInCost, RATES, type Household } from "@/lib/mock/cost";
import { vnd, vndShort } from "@/lib/mock/format";
import { unitAddress, unitById } from "@/lib/mock/units";
import styles from "./Landing.module.css";

const unit = unitById("s2-12-1608")!;

function Step({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className={styles.step}>
      <div>
        <div className={styles.stepLabel}>{label}</div>
        <div className="muted xs">{hint}</div>
      </div>
      <div className={styles.stepCtl}>
        <button type="button" className="icon-btn" aria-label={`Giảm ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={16} />
        </button>
        <span className="num">{value}</span>
        <button type="button" className="icon-btn" aria-label={`Tăng ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/** Minh hoạ trực tiếp bảng All-in Cost: đổi số người và xe, tổng tiền đổi theo. */
export function AllInDemo() {
  const [hh, setHh] = useState<Household>({ persons: 2, motorbikes: 1, cars: 0 });
  const cost = allInCost(unit, hh);
  return (
    <div className={`card ${styles.demo}`}>
      <p className="muted small">
        Căn {unitAddress(unit)} · {unit.areaM2} m²
      </p>
      <div className={styles.demoTotal}>
        <span className={`num ${styles.demoNum}`}>{vnd(cost.total)}</span>
        <span className="muted">đ/tháng, đã gồm mọi phí</span>
      </div>
      <AllInBar cost={cost} variant="table" />
      <hr className="divider" />
      <Step label="Số người ở" hint={`Điện nước ${vndShort(RATES.utilityPerPerson)}/người`} value={hh.persons} min={1} max={6} onChange={(n) => setHh({ ...hh, persons: n })} />
      <Step label="Xe máy" hint={`${vndShort(RATES.motorbike)}/xe`} value={hh.motorbikes} min={0} max={3} onChange={(n) => setHh({ ...hh, motorbikes: n })} />
      <Step label="Ô tô" hint={`${vndShort(RATES.car)}/xe`} value={hh.cars} min={0} max={2} onChange={(n) => setHh({ ...hh, cars: n })} />
    </div>
  );
}
