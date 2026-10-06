import { isSameDay, weekday } from "@/lib/format";
import { slotsForDay, type SlotOption } from "@/lib/booking/slots";

export const SHORT_WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** Thứ trong tuần theo chuẩn lịch Việt Nam / ISO (Thứ hai đầu tuần) */
export const CALENDAR_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** Giới hạn tháng: từ hôm nay đến hết ngày cuối cùng của tháng tiếp theo */
export interface MonthBounds {
  currentYear: number;
  currentMonth: number; // 0-indexed (0..11)
  maxYear: number;
  maxMonth: number;     // 0-indexed (tháng tiếp theo)
  startOfToday: Date;
  endOfMaxMonth: Date;
}

export function getMonthBounds(now: number): MonthBounds {
  const today = new Date(now);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const startOfToday = new Date(currentYear, currentMonth, today.getDate(), 0, 0, 0, 0);

  const maxMonth = (currentMonth + 1) % 12;
  const maxYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  // Ngày 0 của tháng maxMonth + 1 chính là ngày cuối cùng của maxMonth
  const endOfMaxMonth = new Date(maxYear, maxMonth + 1, 0, 23, 59, 59, 999);

  return { currentYear, currentMonth, maxYear, maxMonth, startOfToday, endOfMaxMonth };
}

export function canNavigateMonth(
  target: "prev" | "next",
  viewYear: number,
  viewMonth: number,
  bounds: MonthBounds
): boolean {
  if (target === "prev") {
    // Không thể lùi về trước tháng hiện tại
    return !(viewYear === bounds.currentYear && viewMonth === bounds.currentMonth);
  } else {
    // Không thể tiến quá tháng tiếp theo
    return !(viewYear === bounds.maxYear && viewMonth === bounds.maxMonth);
  }
}

export function formatMonthTitle(year: number, month: number): string {
  return `Tháng ${month + 1}, ${year}`;
}

/** Nhãn tiêu đề dài cho ngày đang chọn: "Hôm nay, 27/09/2026" hoặc "Thứ ba, 29/09/2026" */
export function formatSelectedDateLong(d: Date, now: number): string {
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (isSameDay(d, now)) return `Hôm nay, ${dateStr}`;
  if (isSameDay(d, now + 86_400_000)) return `Ngày mai, ${dateStr}`;
  return `${weekday(d)}, ${dateStr}`;
}

export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
  dayNumber: number;
}

/** Sinh ma trận 7 cột cho tháng được xem (bắt đầu từ Thứ Hai) */
export function getCalendarMatrix(
  year: number,
  month: number,
  bounds: MonthBounds
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const firstDay = new Date(year, month, 1);
  // Thứ 2 = 0, ..., Chủ nhật = 6
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Ô ngày bị vô hiệu khi ở quá khứ hoặc vượt tháng tối đa cho phép — áp cho MỌI ô
  // (kể cả ngày đệm của tháng liền kề) để ngày tháng sau vẫn chọn được ngay khi
  // đang xem tháng hiện tại (bấm ⇒ SlotPicker tự nhảy sang tháng đó).
  const disabledByBounds = (date: Date) =>
    date.getTime() < bounds.startOfToday.getTime() || date.getTime() > bounds.endOfMaxMonth.getTime();

  // Các ngày đệm từ tháng trước
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthTotalDays - i);
    cells.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isDisabled: disabledByBounds(date),
      dayNumber: date.getDate(),
    });
  }

  // Các ngày trong tháng xem
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const isToday = isSameDay(date, bounds.startOfToday);

    cells.push({
      date,
      isCurrentMonth: true,
      isToday,
      isDisabled: disabledByBounds(date),
      dayNumber: day,
    });
  }

  // Các ngày đệm sang tháng sau để lấp đầy hàng cuối (chia hết cho 7)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      cells.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isDisabled: disabledByBounds(date),
        dayNumber: day,
      });
    }
  }

  return cells;
}

/** Nhãn ngắn cho ngày: "Hôm nay", "Mai", hoặc "T2".."CN" */
export function formatShortDay(d: Date, now: number): string {
  if (isSameDay(d, now)) return "Hôm nay";
  if (isSameDay(d, now + 86_400_000)) return "Mai";
  return SHORT_WEEKDAYS[d.getDay()];
}

/** Nhãn chip sớm nhất: "Sớm nhất: Hôm nay · 14:30" / "Sớm nhất: Mai · 09:30" / "Sớm nhất: T5 02/10 · 14:30" */
export function formatEarliestLabel(d: Date, time: string, now: number): string {
  let dayPart: string;
  if (isSameDay(d, now)) {
    dayPart = "Hôm nay";
  } else if (isSameDay(d, now + 86_400_000)) {
    dayPart = "Mai";
  } else {
    dayPart = `${SHORT_WEEKDAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }
  return `Sớm nhất: ${dayPart} · ${time}`;
}

export interface DayInfo {
  date: Date;
  slots: SlotOption[];
  availableCount: number;
}

/** Mặc định chọn ngày khớp với value (nếu có) hoặc ngày đầu tiên còn giờ trống */
export function findDefaultDayIdx(days: { date: Date; availableCount: number }[], currentSlotIso?: string | null): number {
  if (currentSlotIso) {
    const idx = days.findIndex((d) => isSameDay(d.date, currentSlotIso));
    if (idx !== -1) return idx;
  }
  const firstAvailable = days.findIndex((d) => d.availableCount > 0);
  return firstAvailable !== -1 ? firstAvailable : 0;
}

/** Tìm slot trống sớm nhất trong danh sách các ngày */
export function findEarliestSlot(
  days: { date: Date; slots: SlotOption[] }[]
): { day: Date; dayIdx: number; slot: SlotOption } | null {
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const availableSlot = day.slots.find((s) => s.available);
    if (availableSlot) {
      return { day: day.date, dayIdx: i, slot: availableSlot };
    }
  }
  return null;
}

/** Chuyển ngày qua phím mũi tên ←/→, tự động bỏ qua ngày kín (disabled) */
export function getNextDayIdx(
  currentIdx: number,
  direction: "prev" | "next",
  days: { availableCount: number }[]
): number {
  if (direction === "prev") {
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (days[i].availableCount > 0) return i;
    }
    return currentIdx;
  } else {
    for (let i = currentIdx + 1; i < days.length; i++) {
      if (days[i].availableCount > 0) return i;
    }
    return currentIdx;
  }
}

/** Tìm slot khả dụng sớm nhất trong khoảng từ hôm nay đến hết tháng sau */
export function findEarliestInBounds(
  startOfToday: Date,
  endOfMaxMonth: Date,
  now: number,
  busySlots: readonly string[] = [],
): { date: Date; slot: SlotOption } | null {
  const start = startOfToday.getTime();
  const end = endOfMaxMonth.getTime();
  for (let t = start; t <= end; t += 86_400_000) {
    const d = new Date(t);
    const slots = slotsForDay(d, now, busySlots);
    const avail = slots.find((s) => s.available);
    if (avail) {
      return { date: d, slot: avail };
    }
  }
  return null;
}
