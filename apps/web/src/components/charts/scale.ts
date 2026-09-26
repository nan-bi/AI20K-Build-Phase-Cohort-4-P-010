/** Chọn bước chia trục "đẹp" (1, 2, 5 × 10^n) để nhãn trục là số tròn. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  const raw = max / ticks || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return { step, max: Math.ceil(max / step) * step };
}
