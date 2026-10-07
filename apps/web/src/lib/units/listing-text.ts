/**
 * Bản sao phía client của `backend/src/modules/property/listing-text.ts` (B7, SPEC-P01 §4).
 * Server vẫn là chốt chặn; test `listing-text.test.ts` chạy cùng bảng mẫu P1-3.
 */
export type ListingTextField = "title" | "highlights" | "description";
export type ListingTextReason = "phone" | "url" | "money";

export const LISTING_TEXT_FORBIDDEN = "LISTING_TEXT_FORBIDDEN";

export const LISTING_LIMITS = { title: 80, highlight: 60, highlights: 3, description: 600 } as const;

export const REASON_LABEL: Record<ListingTextReason, string> = {
  phone: "số điện thoại",
  url: "đường dẫn/liên kết",
  money: "số tiền",
};

const DIGIT_WORDS = new Map<string, string>([
  ["khong", "0"], ["linh", "0"], ["mot", "1"], ["hai", "2"], ["ba", "3"], ["bon", "4"],
  ["nam", "5"], ["lam", "5"], ["sau", "6"], ["bay", "7"], ["tam", "8"], ["chin", "9"],
]);

/** Giá trị chữ số của ký tự Unicode Nd (Arabic-Indic, Devanagari…): đếm lùi tới đầu dải 10 chữ số. */
function ndDigit(ch: string): string {
  let cp = ch.codePointAt(0) as number;
  let k = 0;
  while (/\p{Nd}/u.test(String.fromCodePoint(cp - 1))) {
    cp -= 1;
    k += 1;
  }
  return String(k % 10);
}

/**
 * Chuẩn hoá chống lách (hồ sơ 18, F1): NFKC (full-width, 𝟎𝟗, ²→2), bỏ ký tự điều khiển/zero-width, quy chữ số Unicode
 * về ASCII, bỏ dấu tiếng Việt, hạ chữ thường, gộp khoảng trắng.
 */
function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\n\r\t\v\f]/g, " ")
    .replace(/[\p{Cf}\p{Cc}︀-️]/gu, "")
    .replace(/\p{Nd}/gu, (c) => (/[0-9]/.test(c) ? c : ndDigit(c)))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const isPhoneDigits = (d: string): boolean => /\d{9,}/.test(d) || /0[35789]\d{8}/.test(d);

/** Dãy số điện thoại: mọi ký tự không phải chữ/số giữa các chữ số là phân cách; chữ cái đơn lẻ là nhiễu; số đọc bằng chữ tính là chữ số. */
function hasPhone(t: string): boolean {
  if (/\+\s*84/.test(t)) return true;
  let run = "";
  let streak = 0;
  let found = false;
  const flush = () => {
    if (isPhoneDigits(run)) found = true;
    run = "";
  };
  for (const tok of t.split(/[^a-z0-9]+/)) {
    if (!tok) continue;
    if (/^[0-9o]+$/.test(tok) && /\d/.test(tok)) {
      run += tok.replace(/o/g, "0");
      streak = 0;
    } else if (DIGIT_WORDS.has(tok)) {
      run += DIGIT_WORDS.get(tok);
      streak += 1;
      if (streak >= 8) found = true;
    } else if (tok.length === 1) {
      if (tok === "o") run += "0";
    } else {
      flush();
      streak = 0;
    }
  }
  flush();
  return found;
}

function hasUrl(t: string): boolean {
  if (/https?:\/\/|www\.|@/.test(t)) return true;
  if (/(?<![a-z])z[\s.\-_]*a[\s.\-_]*l[\s.\-_]*o(?![a-z])/.test(t)) return true;
  const c = t.replace(/\s*([.\/])\s*/g, "$1");
  if (/\b(zalo|fb|facebook|messenger|telegram|viber|whatsapp|tinyurl|shorturl|gmail|yahoo|hotmail|outlook)\b/.test(c)) return true;
  if (/\b(bit\.ly|goo\.gl|t\.co|is\.gd|cutt\.ly|rb\.gy|ow\.ly)\b/.test(c)) return true;
  return /[a-z0-9-]\.(?:com|vn|net|me|org|io|xyz|info|biz|app|link|ly|gl)(?![a-z0-9])/.test(t);
}

/** Từ chỉ khoảng cách/kích thước đứng trước số + `m` ⇒ `m` là mét. */
const DISTANCE_CTX = /\b(?:cach|gan|xa|cao|rong|dai|vong|sat|ban kinh|di bo)\b[^0-9]{0,30}$/;

function hasMoney(t: string): boolean {
  if (/\$\s*\d|\d\s*(?:\$|usd|dollar|dola)/.test(t)) return true;
  if (/\d\s*(?:t\s?r|trieu|k|d|vnd|cu|nghin|ngan|ty)(?![a-z])/.test(t)) return true;
  if (/\b(?:khong|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi|ruoi|tram|lam|nua)\s+(?:trieu|nghin|ngan|ty|cu|tr|k)\b/.test(t)) return true;
  // `m`: mét khi đứng sau số ≥ 1000 hoặc sau từ chỉ khoảng cách (cách/gần/xa/cao/rộng…); còn lại coi là triệu ("8m", "8.5 m").
  for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*m(?![a-z0-9])/g)) {
    if (Number(m[1].replace(",", ".")) >= 1000) continue;
    if (DISTANCE_CTX.test(t.slice(0, m.index))) continue;
    return true;
  }
  if (/\d{1,3}(?: \d{3}){2,}/.test(t)) return true;
  for (const m of t.matchAll(/\d[\d.,_]*/g)) {
    const n = Number(m[0].replace(/[.,_]/g, ""));
    if (n >= 100000) return true;
  }
  return false;
}

/** Trả lý do vi phạm đầu tiên, hoặc null nếu sạch (B7). */
export function detectListingTextViolation(value: string): ListingTextReason | null {
  const t = normalize(value);
  if (hasUrl(t)) return "url";
  if (hasPhone(t)) return "phone";
  if (hasMoney(t)) return "money";
  return null;
}

export function listingTextMessage(reason: ListingTextReason): string {
  return `Không ghi ${REASON_LABEL[reason]} trong nội dung giới thiệu.`;
}

export interface ListingDraft {
  title: string;
  highlights: string[];
  description: string;
}

/** Lỗi theo ô: key `title` | `description` | `highlights.<i>`. */
export function validateListing(draft: ListingDraft): Record<string, string> {
  const errs: Record<string, string> = {};
  const check = (key: string, value: string, max: number) => {
    if (value.length > max) {
      errs[key] = `Tối đa ${max} ký tự.`;
      return;
    }
    const r = value.trim() ? detectListingTextViolation(value) : null;
    if (r) errs[key] = listingTextMessage(r);
  };
  check("title", draft.title, LISTING_LIMITS.title);
  draft.highlights.forEach((h, i) => check(`highlights.${i}`, h, LISTING_LIMITS.highlight));
  check("description", draft.description, LISTING_LIMITS.description);
  return errs;
}

/** Chuyển lỗi 400 LISTING_TEXT_FORBIDDEN của server thành key ô. `field` highlights ⇒ ô đầu tiên vi phạm. */
export function serverFieldToKey(field: string | undefined, highlights: string[]): string | null {
  if (field === "title" || field === "description") return field;
  if (field === "highlights") {
    const i = highlights.findIndex((h) => h.trim() && detectListingTextViolation(h));
    return `highlights.${i >= 0 ? i : 0}`;
  }
  return null;
}
