const nf = new Intl.NumberFormat("vi-VN");

export const vnd = (n: number) => nf.format(Math.round(n));

export function vndShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const text = Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/0+$/, "").replace(".", ",");
    return `${text} triệu`;
  }
  return `${Math.round(n / 1000)} nghìn`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const fmtTime = (iso: string | number | Date) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtDate = (iso: string | number | Date) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const fmtDateTime = (iso: string | number | Date) => `${fmtTime(iso)} · ${fmtDate(iso)}`;

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export const weekday = (iso: string | number | Date) => WEEKDAYS[new Date(iso).getDay()];

export function isSameDay(a: string | number | Date, b: string | number | Date) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function dayLabel(iso: string | number | Date, now: number): string {
  if (isSameDay(iso, now)) return "Hôm nay";
  if (isSameDay(iso, now + 86_400_000)) return "Ngày mai";
  if (isSameDay(iso, now - 86_400_000)) return "Hôm qua";
  const d = new Date(iso);
  return `${weekday(d)}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function relTime(iso: string | number | Date, now: number): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60_000);
  let text: string;
  if (min < 1) return "vừa xong";
  if (min < 60) text = `${min} phút`;
  else if (min < 60 * 24) text = `${Math.round(min / 60)} giờ`;
  else text = `${Math.round(min / 1440)} ngày`;
  return diff < 0 ? `${text} trước` : `sau ${text}`;
}

export function fmtPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return raw;
}

export const normalizePhone = (raw: string) => raw.replace(/\D/g, "").replace(/^84/, "0");
export const isValidVnPhone = (raw: string) => /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(raw));

export function maskPhone(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length < 10) return raw;
  return `${d.slice(0, 4)} *** ${d.slice(7)}`;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((word) => word[0]?.toUpperCase()).join("");
