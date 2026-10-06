export const SLOT_TIMES = {
  morning: ["08:30", "09:30", "10:30"],
  afternoon: ["14:30", "15:30", "16:30", "17:30"],
} as const;

export const ALL_SLOT_TIMES = [...SLOT_TIMES.morning, ...SLOT_TIMES.afternoon];
export const MIN_LEAD_MS = 30 * 60_000;

export function slotDate(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const slot = new Date(day);
  slot.setHours(hours, minutes, 0, 0);
  return slot;
}

export interface SlotOption {
  time: string;
  iso: string;
  available: boolean;
  reason?: "past" | "busy";
}

/** Slot capacity comes from the live busy-slots API; this function applies only time rules. */
export function slotsForDay(day: Date, now: number, busySlots: readonly string[] = []): SlotOption[] {
  return ALL_SLOT_TIMES.map((time) => {
    const slot = slotDate(day, time);
    const iso = slot.toISOString();
    if (slot.getTime() < now + MIN_LEAD_MS) return { time, iso, available: false, reason: "past" as const };
    if (busySlots.includes(iso)) return { time, iso, available: false, reason: "busy" as const };
    return { time, iso, available: true };
  });
}
