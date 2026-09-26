"use client";

import { Armchair, BedDouble, Layers, MapPin, Minus, Plus, Users, Wallet } from "lucide-react";
import { RATES } from "@/lib/mock/cost";
import { vndShort } from "@/lib/mock/format";
import { FLOOR_LABEL } from "@/lib/mock/matchmaker";
import type { CriteriaState } from "@/lib/mock/types";
import {
  ALL_ITEMS,
  FURNISHING_LABEL,
  ITEM_LABEL,
  LAYOUT_LABEL,
  UNITS,
  ZONES,
  type Furnishing,
  type LayoutKind,
} from "@/lib/mock/units";
import { PopoverChip } from "@/components/ui/Popover";
import styles from "./FilterTray.module.css";

interface FilterTrayProps {
  criteria: CriteriaState;
  onChange: (next: CriteriaState) => void;
  placement?: "top" | "bottom";
}

const BUDGET_MIN = 5_000_000;
const BUDGET_MAX = 25_000_000;
const LAYOUTS: LayoutKind[] = ["Studio", "1PN", "2PN", "3PN"];

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`${styles.pill} ${on ? styles.on : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Stepper({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className={styles.stepper}>
      <div>
        <div className={styles.stepLabel}>{label}</div>
        {hint && <div className="muted xs">{hint}</div>}
      </div>
      <div className={styles.stepCtl}>
        <button type="button" className="icon-btn" aria-label={`Giảm ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={16} />
        </button>
        <span className={`num ${styles.stepVal}`}>{value}</span>
        <button type="button" className="icon-btn" aria-label={`Tăng ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/** Các bộ lọc tổng quan dành riêng cho Vinhomes Ocean Park 1: ngân sách All-in, loại căn, phân khu/toà, tầng, đồ dùng, người ở. */
export function FilterTray({ criteria: c, onChange, placement = "bottom" }: FilterTrayProps) {
  const set = (patch: Partial<CriteriaState>) => onChange({ ...c, ...patch });
  const counts = Object.fromEntries(ZONES.map((z) => [z.id, UNITS.filter((u) => u.zoneId === z.id && u.baseStatus === "available").length]));
  const zoneBuildings = ZONES.filter((z) => c.zones.includes(z.id)).flatMap((z) => z.buildings);
  const hh = c.household;
  const itemCount = c.items.length + (c.furnishing ? 1 : 0) + (c.pets ? 1 : 0);
  const hhChanged = hh.persons !== 1 || hh.motorbikes !== 1 || hh.cars !== 0;

  return (
    <div className={styles.tray} role="group" aria-label="Bộ lọc tìm căn">
      <PopoverChip icon={<Wallet size={15} />} label={c.budget ? `≤ ${vndShort(c.budget)}` : "Ngân sách"} active={!!c.budget} title="Ngân sách tối đa mỗi tháng" placement={placement}>
        {(close) => (
          <div className={styles.panel}>
            <div className={`num ${styles.bigVal}`}>{c.budget ? vndShort(c.budget) : "Không giới hạn"}</div>
            <input
              type="range"
              className={styles.range}
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={500_000}
              value={c.budget ?? BUDGET_MAX}
              aria-label="Ngân sách tối đa"
              onChange={(e) => {
                const v = Number(e.target.value);
                set({ budget: v >= BUDGET_MAX ? undefined : v });
              }}
            />
            <div className={styles.rangeEnds}>
              <span>{vndShort(BUDGET_MIN)}</span>
              <span>{vndShort(BUDGET_MAX)}+</span>
            </div>
            <div className={styles.pills}>
              {[7, 9, 12, 15].map((m) => (
                <Pill key={m} on={c.budget === m * 1_000_000} onClick={() => set({ budget: m * 1_000_000 })}>
                  ≤ {m} triệu
                </Pill>
              ))}
              <Pill on={!c.budget} onClick={() => set({ budget: undefined })}>
                Không giới hạn
              </Pill>
            </div>
            <p className="muted xs">Tính theo All-in Cost: đã gồm phí quản lý, gửi xe và điện nước, không cộng thêm khi vào ở.</p>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>

      <PopoverChip icon={<BedDouble size={15} />} label={c.layouts.length ? c.layouts.map((l) => (l === "Studio" ? "Studio" : l)).join(" · ") : "Loại căn"} active={c.layouts.length > 0} title="Loại căn" placement={placement}>
        {(close) => (
          <div className={styles.panel}>
            <div className={styles.pills}>
              {LAYOUTS.map((l) => (
                <Pill key={l} on={c.layouts.includes(l)} onClick={() => set({ layouts: toggle(c.layouts, l) })}>
                  {LAYOUT_LABEL[l]}
                </Pill>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>

      <PopoverChip
        icon={<MapPin size={15} />}
        label={c.buildings.length ? `Toà ${c.buildings.join(", ")}` : c.zones.length ? c.zones.map((z) => ZONES.find((x) => x.id === z)!.short).join(", ") : "Khu vực & toà"}
        active={c.zones.length > 0 || c.buildings.length > 0}
        title="Phân khu và toà"
        placement={placement}
      >
        {(close) => (
          <div className={styles.panel}>
            <div className={styles.zoneList}>
              {ZONES.map((z) => {
                const on = c.zones.includes(z.id);
                return (
                  <label key={z.id} className={`${styles.zone} ${on ? styles.zoneOn : ""}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const zones = toggle(c.zones, z.id);
                        const keep = ZONES.filter((x) => zones.includes(x.id)).flatMap((x) => x.buildings);
                        set({ zones, buildings: c.buildings.filter((b) => keep.includes(b)) });
                      }}
                    />
                    <span>{z.name}</span>
                    <span className="muted xs">{counts[z.id]} căn</span>
                  </label>
                );
              })}
            </div>
            {zoneBuildings.length > 0 && (
              <div>
                <div className={styles.subLabel}>Thu hẹp theo toà</div>
                <div className={styles.pills}>
                  {zoneBuildings.map((b) => (
                    <Pill key={b} on={c.buildings.includes(b)} onClick={() => set({ buildings: toggle(c.buildings, b) })}>
                      {b}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>

      <PopoverChip icon={<Layers size={15} />} label={c.floor ? FLOOR_LABEL[c.floor].split(" (")[0] : "Tầng"} active={!!c.floor} title="Tầng cao" placement={placement}>
        {(close) => (
          <div className={styles.panel}>
            <div className={styles.pills}>
              <Pill on={!c.floor} onClick={() => set({ floor: undefined })}>
                Bất kỳ
              </Pill>
              {(Object.keys(FLOOR_LABEL) as (keyof typeof FLOOR_LABEL)[]).map((f) => (
                <Pill key={f} on={c.floor === f} onClick={() => set({ floor: f })}>
                  {FLOOR_LABEL[f]}
                </Pill>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>

      <PopoverChip icon={<Armchair size={15} />} label={itemCount ? `Nội thất · ${itemCount}` : "Nội thất & đồ dùng"} active={itemCount > 0} title="Nội thất và đồ dùng" placement={placement}>
        {(close) => (
          <div className={styles.panel}>
            <div className={styles.subLabel}>Mức nội thất</div>
            <div className={styles.pills}>
              <Pill on={!c.furnishing} onClick={() => set({ furnishing: undefined })}>
                Bất kỳ
              </Pill>
              {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((f) => (
                <Pill key={f} on={c.furnishing === f} onClick={() => set({ furnishing: f })}>
                  {FURNISHING_LABEL[f]}
                </Pill>
              ))}
            </div>
            <div className={styles.subLabel}>Phải có sẵn</div>
            <div className={styles.pills}>
              {ALL_ITEMS.map((i) => (
                <Pill key={i} on={c.items.includes(i)} onClick={() => set({ items: toggle(c.items, i) })}>
                  {ITEM_LABEL[i]}
                </Pill>
              ))}
              <Pill on={!!c.pets} onClick={() => set({ pets: c.pets ? undefined : true })}>
                Cho nuôi thú cưng
              </Pill>
            </div>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>

      <PopoverChip icon={<Users size={15} />} label={hhChanged ? `${hh.persons} người · ${hh.motorbikes + hh.cars} xe` : "Người ở & xe"} active={hhChanged} title="Người ở và phương tiện" align="end" placement={placement}>
        {(close) => (
          <div className={styles.panel}>
            <Stepper label="Số người ở" value={hh.persons} min={1} max={6} hint={`Điện nước ${vndShort(RATES.utilityPerPerson)}/người`} onChange={(n) => set({ household: { ...hh, persons: n } })} />
            <Stepper label="Xe máy" value={hh.motorbikes} min={0} max={4} hint={`${vndShort(RATES.motorbike)}/xe/tháng`} onChange={(n) => set({ household: { ...hh, motorbikes: n } })} />
            <Stepper label="Ô tô" value={hh.cars} min={0} max={2} hint={`${vndShort(RATES.car)}/xe/tháng`} onChange={(n) => set({ household: { ...hh, cars: n } })} />
            <label className="field">
              <span className="label">Dự kiến dọn vào</span>
              <input type="date" className="input" value={c.moveIn ?? ""} onChange={(e) => set({ moveIn: e.target.value || undefined })} />
            </label>
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={close}>
              Xong
            </button>
          </div>
        )}
      </PopoverChip>
    </div>
  );
}
