"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { RATES } from "@/lib/mock/cost";
import { vndShort } from "@/lib/mock/format";
import { FLOOR_LABEL } from "@/lib/mock/matchmaker";
import type { CriteriaState } from "@/lib/mock/types";
import { FURNISHING_LABEL, LAYOUT_LABEL, UNITS, ZONES, type Furnishing, type LayoutKind } from "@/lib/mock/units";
import styles from "./FilterTray.module.css";

interface FilterTrayProps {
  criteria: CriteriaState;
  onChange: (next: CriteriaState) => void;
  /** Chip nhỏ gọn hơn — dùng khi đặt trong khung chat chật chỗ. */
  compact?: boolean;
}

const BUDGET_MIN = 5_000_000;
const BUDGET_MAX = 25_000_000;
const LAYOUTS: LayoutKind[] = ["Studio", "1PN", "2PN", "3PN"];
type FilterKey = "zone" | "layout" | "budget" | "floor" | "furnishing" | "household";

const EMPTY_CRITERIA: CriteriaState = {
  budget: undefined,
  layouts: [],
  zones: [],
  buildings: [],
  floor: undefined,
  furnishing: undefined,
  items: [],
  pets: undefined,
  household: { persons: 1, motorbikes: 1, cars: 0 },
  moveIn: undefined,
};

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`${styles.pill} ${on ? styles.on : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Chip({
  filterKey,
  label,
  value,
  openKey,
  onToggle,
  compact,
}: {
  filterKey: FilterKey;
  label: string;
  value: string;
  openKey: FilterKey | null;
  onToggle: (k: FilterKey) => void;
  compact?: boolean;
}) {
  const isOpen = openKey === filterKey;
  return (
    <button type="button" className={`${styles.chip} ${compact ? styles.chipSm : ""}`} aria-expanded={isOpen} onClick={() => onToggle(filterKey)}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
      <ChevronDown size={14} className={styles.caret} style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
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

/**
 * Bộ lọc gọn trong 1 tag "Bộ lọc" trên khung chat — bấm vào mới mở thẻ chứa các chip "nhãn + giá trị" (kiểu
 * Thành phố ▾ / Quận ▾), mỗi chip lại mở tiếp tuỳ chọn của riêng nó ngay trong thẻ đó.
 * (Hàng tag tiện ích "Điều hòa, Tủ lạnh, …" tạm ẩn theo yêu cầu — logic items/pets trong CriteriaState vẫn giữ nguyên để bật lại sau.)
 */
export function FilterTray({ criteria: c, onChange, compact }: FilterTrayProps) {
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
        setOpenKey(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setOpenKey(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const set = (patch: Partial<CriteriaState>) => onChange({ ...c, ...patch });
  const counts = Object.fromEntries(ZONES.map((z) => [z.id, UNITS.filter((u) => u.zoneId === z.id && u.baseStatus === "available").length]));
  const zoneBuildings = ZONES.filter((z) => c.zones.includes(z.id)).flatMap((z) => z.buildings);
  const hh = c.household;
  const hhChanged = hh.persons !== 1 || hh.motorbikes !== 1 || hh.cars !== 0;
  const zoneActive = c.zones.length > 0 || c.buildings.length > 0;
  const activeGroups = [!!c.budget, c.layouts.length > 0, zoneActive, !!c.floor, !!c.furnishing, hhChanged].filter(Boolean).length;

  const zoneValue = c.buildings.length ? `Toà ${c.buildings.join(", ")}` : c.zones.length ? c.zones.map((z) => ZONES.find((x) => x.id === z)!.short).join(", ") : "Tất cả";
  const layoutValue = c.layouts.length ? c.layouts.join(", ") : "Tất cả";
  const budgetValue = c.budget ? vndShort(c.budget) : "Không giới hạn";
  const floorValue = c.floor ? FLOOR_LABEL[c.floor].split(" (")[0] : "Bất kỳ";
  const furnishingValue = c.furnishing ? FURNISHING_LABEL[c.furnishing] : "Bất kỳ";
  const householdValue = hhChanged ? `${hh.persons} người · ${hh.motorbikes + hh.cars} xe` : "Mặc định";

  const toggleOpen = (k: FilterKey) => setOpenKey((prev) => (prev === k ? null : k));

  return (
    <div className={styles.tray} ref={root}>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.triggerSm : ""} ${activeGroups ? styles.triggerActive : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setOpenKey(null);
        }}
      >
        <SlidersHorizontal size={compact ? 13 : 15} />
        <span>{activeGroups ? `Bộ lọc · ${activeGroups}` : "Bộ lọc"}</span>
        <ChevronDown size={compact ? 12 : 14} className={styles.caret} style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>

      {open && (
        <div className={styles.card} role="region" aria-label="Bộ lọc tìm căn">
          <div className={`${styles.chipRow} ${styles.chipRowSticky}`}>
            <Chip filterKey="zone" label="Khu vực" value={zoneValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            <Chip filterKey="layout" label="Loại" value={layoutValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            <Chip filterKey="budget" label="Ngân sách" value={budgetValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            <Chip filterKey="floor" label="Tầng" value={floorValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            <Chip filterKey="furnishing" label="Nội thất" value={furnishingValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            <Chip filterKey="household" label="Người ở" value={householdValue} openKey={openKey} onToggle={toggleOpen} compact={compact} />
            {activeGroups > 0 && (
              <button type="button" className={styles.clearBtn} aria-label="Xoá mọi bộ lọc" onClick={() => onChange(EMPTY_CRITERIA)}>
                <X size={15} />
              </button>
            )}
          </div>

          {openKey && (
            <>
              <hr className={`divider ${styles.subDivider}`} />
              <div>
                {openKey === "budget" && (
                  <div className={styles.section}>
                    <div className={`num ${styles.bigVal}`}>{budgetValue}</div>
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
                    <p className="muted xs">Đã gồm phí quản lý, gửi xe và điện nước — không cộng thêm khi vào ở.</p>
                  </div>
                )}

                {openKey === "layout" && (
                  <div className={styles.pills}>
                    {LAYOUTS.map((l) => (
                      <Pill key={l} on={c.layouts.includes(l)} onClick={() => set({ layouts: toggle(c.layouts, l) })}>
                        {LAYOUT_LABEL[l]}
                      </Pill>
                    ))}
                  </div>
                )}

                {openKey === "floor" && (
                  <div className={styles.pills}>
                    <Pill on={!c.floor} onClick={() => set({ floor: undefined })}>
                      Bất kỳ
                    </Pill>
                    {(Object.keys(FLOOR_LABEL) as (keyof typeof FLOOR_LABEL)[]).map((f) => (
                      <Pill key={f} on={c.floor === f} onClick={() => set({ floor: c.floor === f ? undefined : f })}>
                        {FLOOR_LABEL[f]}
                      </Pill>
                    ))}
                  </div>
                )}

                {openKey === "furnishing" && (
                  <div className={styles.pills}>
                    <Pill on={!c.furnishing} onClick={() => set({ furnishing: undefined })}>
                      Bất kỳ
                    </Pill>
                    {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((f) => (
                      <Pill key={f} on={c.furnishing === f} onClick={() => set({ furnishing: c.furnishing === f ? undefined : f })}>
                        {FURNISHING_LABEL[f]}
                      </Pill>
                    ))}
                  </div>
                )}

                {openKey === "zone" && (
                  <div className={styles.section}>
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
                  </div>
                )}

                {openKey === "household" && (
                  <div className={styles.section}>
                    <Stepper label="Số người ở" value={hh.persons} min={1} max={6} hint={`Điện nước ${vndShort(RATES.utilityPerPerson)}/người`} onChange={(n) => set({ household: { ...hh, persons: n } })} />
                    <Stepper label="Xe máy" value={hh.motorbikes} min={0} max={4} hint={`${vndShort(RATES.motorbike)}/xe/tháng`} onChange={(n) => set({ household: { ...hh, motorbikes: n } })} />
                    <Stepper label="Ô tô" value={hh.cars} min={0} max={2} hint={`${vndShort(RATES.car)}/xe/tháng`} onChange={(n) => set({ household: { ...hh, cars: n } })} />
                    <label className="field">
                      <span className="label">Dự kiến dọn vào</span>
                      <input type="date" className="input" value={c.moveIn ?? ""} onChange={(e) => set({ moveIn: e.target.value || undefined })} />
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
