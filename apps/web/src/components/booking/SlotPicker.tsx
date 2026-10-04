"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { isSameDay } from "@/lib/mock/format";
import { slotsForDay } from "@/lib/mock/selectors";
import { SLOT_TIMES } from "@/lib/mock/slots";
import {
  CALENDAR_WEEKDAYS,
  canNavigateMonth,
  findEarliestInBounds,
  formatEarliestLabel,
  formatMonthTitle,
  formatSelectedDateLong,
  getCalendarMatrix,
  getMonthBounds,
} from "./slotPick";
import styles from "./SlotPicker.module.css";

export interface SlotPickerProps {
  now: number;                 // > 0; caller tự chặn khi useNow() chưa có giá trị
  value: string | null;        // ISO slot đang chọn
  onChange: (iso: string | null) => void;  // đổi ngày ⇒ onChange(null)
  busySlots?: string[];
}

export function SlotPicker({ now, value, onChange, busySlots }: SlotPickerProps) {
  const bounds = useMemo(() => getMonthBounds(now), [now]);

  // Tháng và năm đang xem trên lịch
  const [viewYear, setViewYear] = useState<number>(() =>
    value ? new Date(value).getFullYear() : bounds.currentYear
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    value ? new Date(value).getMonth() : bounds.currentMonth
  );

  // Ngày đang được chọn để xem khung giờ
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    value ? new Date(value) : bounds.startOfToday
  );

  const activeSelectedDate = useMemo(() => {
    if (value) return new Date(value);
    return selectedDate;
  }, [value, selectedDate]);

  // Khả năng chuyển tháng
  const canPrev = canNavigateMonth("prev", viewYear, viewMonth, bounds);
  const canNext = canNavigateMonth("next", viewYear, viewMonth, bounds);

  const handlePrevMonth = () => {
    if (!canPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Ma trận các ngày trong tháng đang xem
  const matrix = useMemo(
    () => getCalendarMatrix(viewYear, viewMonth, bounds),
    [viewYear, viewMonth, bounds]
  );

  // Bản đồ kiểm tra ngày có slot trống không (để hiện dot chỉ báo)
  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const cell of matrix) {
      if (!cell.isDisabled) {
        const hasAvail = slotsForDay(cell.date, now, busySlots).some((s) => s.available);
        const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
        map.set(key, hasAvail);
      }
    }
    return map;
  }, [matrix, now, busySlots]);

  // Tìm slot trống sớm nhất trong toàn bộ cửa sổ (từ hôm nay đến hết tháng sau)
  const earliest = findEarliestInBounds(bounds.startOfToday, bounds.endOfMaxMonth, now, busySlots);

  const handleEarliestClick = () => {
    if (!earliest) return;
    setViewYear(earliest.date.getFullYear());
    setViewMonth(earliest.date.getMonth());
    setSelectedDate(earliest.date);
    onChange(earliest.slot.iso);
  };

  const handleSelectCell = (d: Date) => {
    // Ngày thuộc tháng liền kề (ô đệm) ⇒ tự nhảy lịch sang đúng tháng của ngày đó,
    // để khách bấm được ngày tháng sau ngay khi đang xem tháng hiện tại.
    if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setSelectedDate(d);
    onChange(null);
  };

  // Danh sách slot cho ngày đang chọn
  const currentSlots = useMemo(
    () => slotsForDay(activeSelectedDate, now, busySlots),
    [activeSelectedDate, now, busySlots],
  );

  const availableCount = currentSlots.filter((s) => s.available).length;

  return (
    <div className={styles.container}>
      {earliest && (
        <div className={styles.chipRow}>
          <button
            type="button"
            className={styles.earliestChip}
            onClick={handleEarliestClick}
            aria-label="Chọn slot sớm nhất"
          >
            <Sparkles size={14} />
            <span>{formatEarliestLabel(earliest.date, earliest.slot.time, now)}</span>
          </button>
        </div>
      )}

      {/* Khối Date Picker Tháng */}
      <div className={styles.calendarCard}>
        <div className={styles.calHeader}>
          <span className={styles.monthTitle}>
            {formatMonthTitle(viewYear, viewMonth)}
          </span>
          <div className={styles.navBtns}>
            <button
              type="button"
              className={styles.navBtn}
              disabled={!canPrev}
              onClick={handlePrevMonth}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              disabled={!canNext}
              onClick={handleNextMonth}
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className={styles.weekdaysRow}>
          {CALENDAR_WEEKDAYS.map((wd) => (
            <span key={wd} className={styles.weekdayCol}>
              {wd}
            </span>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {matrix.map((cell, idx) => {
            const isSelected = isSameDay(cell.date, activeSelectedDate);
            const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
            const hasAvail = availabilityMap.get(key);

            return (
              <button
                key={`${key}-${idx}`}
                type="button"
                disabled={cell.isDisabled}
                className={`${styles.dayBtn} ${isSelected ? styles.daySelected : ""} ${
                  cell.isToday ? styles.dayToday : ""
                } ${!cell.isCurrentMonth ? styles.dayOtherMonth : ""}`}
                onClick={() => handleSelectCell(cell.date)}
              >
                <span>{cell.dayNumber}</span>
                {!cell.isDisabled && hasAvail && <span className={styles.dayDot} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Khối Khung giờ của ngày đang chọn */}
      <div className={styles.slotsSection}>
        <div className={styles.selectedDateHeader}>
          <span className={styles.selectedDateTitle}>
            {formatSelectedDateLong(activeSelectedDate, now)}
          </span>
          <span className={styles.availBadge}>
            {availableCount > 0 ? `Còn ${availableCount} giờ` : "Hết giờ hôm nay"}
          </span>
        </div>

        {(["morning", "afternoon"] as const).map((part) => {
          const partSlots = currentSlots.filter((o) =>
            (SLOT_TIMES[part] as readonly string[]).includes(o.time)
          );
          if (partSlots.length === 0) return null;
          return (
            <div key={part}>
              <h4 className={styles.part}>
                {part === "morning" ? "Buổi sáng" : "Buổi chiều"}
              </h4>
              <div className={styles.slots}>
                {partSlots.map((o) => (
                  <button
                    key={o.iso}
                    type="button"
                    disabled={!o.available}
                    aria-pressed={value === o.iso}
                    className={`${styles.slot} ${value === o.iso ? styles.slotSel : ""}`}
                    onClick={() => onChange(o.iso)}
                  >
                    <b className="tnum">{o.time}</b>
                    {!o.available && (
                      <span className="xs">
                        {o.reason === "busy" ? "Đã có người" : "Quá gần giờ"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <p className={styles.hint}>
          Khung giờ xem phòng: sáng 08:30–11:30, chiều 14:00–18:00. Field Host nội khu có thẻ thang máy sẽ đón bạn đúng giờ tại sảnh.
        </p>
      </div>
    </div>
  );
}
