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
