export const SLOT_TIMES = [
  '08:30',
  '09:30',
  '10:30',
  '14:30',
  '15:30',
  '16:30',
  '17:30',
];

/**
 * Kiểm tra xem slot UTC có khớp đúng khung giờ SLOT_TIMES theo giờ Việt Nam (UTC+7) không.
 */
export function isValidSlotTimeVN(date: Date): boolean {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const hours = vnTime.getUTCHours().toString().padStart(2, '0');
  const minutes = vnTime.getUTCMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  return SLOT_TIMES.includes(timeStr);
}

/**
 * Sinh danh sách toàn bộ các slot hợp lệ giữa from và to (theo giờ VN).
 */
export function generateAllSlotsBetween(fromDate: Date, toDate: Date): string[] {
  const slots: string[] = [];
  const current = new Date(fromDate.getTime());

  // Lùi về đầu ngày giờ VN
  const vnCurrent = new Date(current.getTime() + 7 * 60 * 60 * 1000);
  vnCurrent.setUTCHours(0, 0, 0, 0);
  let iterTime = vnCurrent.getTime() - 7 * 60 * 60 * 1000;

  while (iterTime <= toDate.getTime()) {
    const vnDate = new Date(iterTime + 7 * 60 * 60 * 1000);
    const y = vnDate.getUTCFullYear();
    const m = vnDate.getUTCMonth();
    const d = vnDate.getUTCDate();

    for (const timeStr of SLOT_TIMES) {
      const [h, min] = timeStr.split(':').map(Number);
      const slotUtc = new Date(Date.UTC(y, m, d, h - 7, min, 0, 0));
      if (slotUtc.getTime() >= fromDate.getTime() && slotUtc.getTime() <= toDate.getTime()) {
        slots.push(slotUtc.toISOString());
      }
    }
    iterTime += 24 * 60 * 60 * 1000;
  }

  return slots;
}
