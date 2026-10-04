export interface ParsedSetCookie {
  name: string;
  value: string;
  expired: boolean;
}

/** Tách `name=value` và trạng thái xoá từ một header Set-Cookie (proxy cần cập nhật cookie của request đang xử lý). */
export function parseSetCookie(raw: string): ParsedSetCookie | null {
  const [pair, ...attrs] = raw.split(";").map((part) => part.trim());
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  const value = pair.slice(eq + 1);
  const expired =
    value === "" ||
    attrs.some((a) => /^max-age=0$/i.test(a) || (/^expires=/i.test(a) && Date.parse(a.slice(8)) < Date.now()));
  return { name: pair.slice(0, eq), value, expired };
}

/**
 * Dựng lại header `cookie` của request đang xử lý sau khi backend đặt/xoá cookie (làm mới phiên).
 * Làm việc trên chuỗi cookie THÔ (đã mã hoá phần trăm như trình duyệt gửi). Không dùng `request.cookies.getAll()`:
 * Next giải mã giá trị (vd. `vs_google_hint` chứa tên "Phương Nam"), ghép lại thành chuỗi có ký tự ngoài Latin-1 và
 * `Headers.set` ném "Cannot convert argument to a ByteString".
 */
export function rebuildCookieHeader(rawCookieHeader: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const part of rawCookieHeader.split(";")) {
    const piece = part.trim();
    const eq = piece.indexOf("=");
    if (eq > 0) jar.set(piece.slice(0, eq), piece.slice(eq + 1));
  }
  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (!parsed) continue;
    if (parsed.expired) jar.delete(parsed.name);
    else jar.set(parsed.name, parsed.value);
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
