/** Khung giờ xem phòng khớp ca trực Field Host (PRD §3.2): sáng 08:30–11:30, chiều 14:00–18:00. */
export const SLOT_TIMES = {
  morning: ["08:30", "09:30", "10:30"],
  afternoon: ["14:30", "15:30", "16:30", "17:30"],
} as const;

export const ALL_SLOT_TIMES: string[] = [...SLOT_TIMES.morning, ...SLOT_TIMES.afternoon];

/** Đặt sát giờ tối thiểu 30 phút để Host kịp nhận (SLA 3 phút) và di chuyển. */
export const MIN_LEAD_MS = 30 * 60_000;

export function slotDate(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Cửa sổ đặt lịch xem phòng mặc định: 14 ngày có khung giờ khả dụng. */
export const BOOKING_WINDOW_DAYS = 14;

/** Các ngày gần nhất còn ít nhất một khung giờ đặt được (mặc định 3 ngày, tối đa theo span). */
export function bookableDays(now: number, span = 3): Date[] {
  const days: Date[] = [];
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; days.length < span && i < span + 7; i++) {
    const day = new Date(base.getTime() + i * 86_400_000);
    const hasSlot = ALL_SLOT_TIMES.some((t) => slotDate(day, t).getTime() >= now + MIN_LEAD_MS);
    if (hasSlot) days.push(day);
  }
  return days;
}

/** N khung giờ sắp tới, dùng cho dữ liệu seed. */
export function upcomingSlots(now: number, count: number): string[] {
  const out: string[] = [];
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; out.length < count && i < 14; i++) {
    const day = new Date(base.getTime() + i * 86_400_000);
    for (const t of ALL_SLOT_TIMES) {
      const d = slotDate(day, t);
      if (d.getTime() >= now + MIN_LEAD_MS && out.length < count) out.push(d.toISOString());
    }
  }
  return out;
}
