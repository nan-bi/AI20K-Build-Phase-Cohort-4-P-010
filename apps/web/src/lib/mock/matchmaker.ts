import { allInCost, DEFAULT_HOUSEHOLD, isBargain, savingsPct, type CostBreakdown } from "./cost";
import { vnd, vndShort } from "./format";
import type { CriteriaState } from "./types";
import {
  FURNISHING_LABEL,
  ITEM_LABEL,
  LAYOUT_LABEL,
  UNITS,
  ZONES,
  unitAddress,
  zoneById,
  type Furnishing,
  type ItemKey,
  type LayoutKind,
  type Unit,
  type UnitStatus,
  type ZoneId,
} from "./units";

export const emptyCriteria = (): CriteriaState => ({
  layouts: [],
  zones: [],
  buildings: [],
  items: [],
  household: { ...DEFAULT_HOUSEHOLD },
});

export const FLOOR_LABEL = { low: "Tầng thấp (1–10)", mid: "Tầng trung (11–20)", high: "Tầng cao (21+)" } as const;

const floorBand = (floor: number): "low" | "mid" | "high" => (floor <= 10 ? "low" : floor <= 20 ? "mid" : "high");

// ─── Phân tích câu chat ──────────────────────────────────────────────────────────────────────

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

function parseBudget(text: string): number | undefined {
  const t = fold(text);
  const values: number[] = [];
  // 7tr5 · 7,5 triệu · 8 trieu · 8tr
  for (const m of t.matchAll(/(\d{1,2})(?:[.,](\d{1,2}))?\s*(?:tr|trieu)\s*(\d)?(?![a-z])/g)) {
    const whole = Number(m[1]);
    const frac = m[2] ? Number(`0.${m[2]}`) : m[3] ? Number(`0.${m[3]}`) : 0;
    values.push((whole + frac) * 1_000_000);
  }
  // 10.000.000 · 8000000
  for (const m of t.matchAll(/\b(\d{1,3}(?:[.,]\d{3}){2,}|\d{7,8})\b/g)) {
    values.push(Number(m[1].replace(/[.,]/g, "")));
  }
  const plausible = values.filter((v) => v >= 3_000_000 && v <= 60_000_000);
  return plausible.length ? Math.max(...plausible) : undefined;
}

const LAYOUT_PATTERNS: [LayoutKind, RegExp][] = [
  ["Studio", /studio|stu\b/],
  ["1PN", /\b1\s*(pn|n2?\b|phong\s*ngu\b|ngu\b)|mot phong ngu/],
  ["2PN", /\b2\s*(pn|n2?\b|phong\s*ngu\b|ngu\b)|hai phong ngu/],
  ["3PN", /\b3\s*(pn|n2?\b|phong\s*ngu\b|ngu\b)|ba phong ngu/],
];

const ITEM_PATTERNS: [ItemKey, RegExp][] = [
  ["ac", /dieu hoa|may lanh/],
  ["fridge", /tu lanh/],
  ["washer", /may giat/],
  ["kitchen", /\bbep\b|hut mui/],
  ["heater", /nong lanh/],
  ["bed", /giuong|nem\b/],
  ["wardrobe", /tu quan ao|tu do/],
  ["sofa", /sofa/],
  ["tv", /\btv\b|tivi|smart tv/],
  ["curtain", /\brem\b/],
  ["balcony", /ban cong|logia|lo gia/],
];

const ZONE_PATTERNS: [ZoneId, RegExp][] = [
  ["sapphire1", /sapphire\s*1\b|\bs1\b/],
  ["sapphire2", /sapphire\s*2\b|\bs2\b/],
  ["zenpark", /zenpark|zen park|\bzr\b/],
  ["pavilion", /pavilion/],
  ["masteri", /masteri|waterfront/],
];

export interface ParsedQuery {
  patch: CriteriaState;
  hasSearchSignal: boolean;
}

/** Trích tiêu chí tìm căn từ một câu tiếng Việt (bỏ dấu, chịu lỗi gõ tắt như "2n2", "7tr5"). */
export function parseQuery(text: string, base: CriteriaState): ParsedQuery {
  const t = fold(text);
  const c: CriteriaState = { ...base, layouts: [...base.layouts], zones: [...base.zones], buildings: [...base.buildings], items: [...base.items], household: { ...base.household } };
  let signal = false;

  const budget = parseBudget(text);
  if (budget) {
    c.budget = budget;
    signal = true;
  }

  const layouts = LAYOUT_PATTERNS.filter(([, re]) => re.test(t)).map(([k]) => k);
  if (layouts.length) {
    c.layouts = layouts;
    signal = true;
  }

  const buildings = [...text.toUpperCase().matchAll(/\b(S[12]\.\d{2}|ZR[12]|R1\.02|P[34]|H[12]|M[23])\b/g)].map((m) => m[1]);
  const knownBuildings = buildings.filter((b) => ZONES.some((z) => z.buildings.includes(b)));
  if (knownBuildings.length) {
    c.buildings = [...new Set(knownBuildings)];
    signal = true;
  }
  const zones = ZONE_PATTERNS.filter(([, re]) => re.test(t)).map(([k]) => k);
  if (zones.length && !knownBuildings.length) {
    c.zones = zones;
    signal = true;
  }

  if (/tang cao|tang tren cao|view cao/.test(t)) {
    c.floor = "high";
    signal = true;
  } else if (/tang thap/.test(t)) {
    c.floor = "low";
    signal = true;
  } else if (/tang trung/.test(t)) {
    c.floor = "mid";
    signal = true;
  }

  if (/full do|full noi that|day du noi that/.test(t)) {
    c.furnishing = "full";
    signal = true;
  } else if (/nha trong|khong do/.test(t)) {
    c.furnishing = "empty";
    signal = true;
  } else if (/noi that co ban/.test(t)) {
    c.furnishing = "basic";
    signal = true;
  }

  const items = ITEM_PATTERNS.filter(([, re]) => re.test(t)).map(([k]) => k);
  if (items.length) {
    c.items = [...new Set([...c.items, ...items])];
    signal = true;
  }

  if (/thu cung|nuoi (cho|meo)|\bpet\b/.test(t)) {
    c.pets = true;
    signal = true;
  }

  const persons = t.match(/(\d)\s*(nguoi|ng\b|ban)/);
  if (persons) c.household.persons = Math.min(6, Number(persons[1]));
  else if (/mot minh|1 minh/.test(t)) c.household.persons = 1;
  else if (/vo chong|cap doi|hai nguoi/.test(t)) c.household.persons = 2;
  else if (/gia dinh/.test(t)) c.household.persons = 3;

  const bikes = t.match(/(\d)\s*xe may/);
  if (bikes) c.household.motorbikes = Math.min(4, Number(bikes[1]));
  if (/o to|oto|xe hoi/.test(t)) c.household.cars = Math.max(1, c.household.cars);

  return { patch: c, hasSearchSignal: signal };
}

// ─── Tìm & xếp hạng ─────────────────────────────────────────────────────────────────────────

export interface MatchResult {
  unit: Unit;
  cost: CostBreakdown;
  savings: number;
  score: number;
  reasons: string[];
}

export function hasCriteria(c: CriteriaState): boolean {
  return !!(c.budget || c.layouts.length || c.zones.length || c.buildings.length || c.floor || c.furnishing || c.items.length || c.pets);
}

export interface StatusLookup {
  (u: Unit): UnitStatus;
}

function passes(u: Unit, c: CriteriaState, ignoreBudget = false): boolean {
  if (c.layouts.length && !c.layouts.includes(u.layout)) return false;
  if (c.buildings.length) {
    if (!c.buildings.includes(u.building)) return false;
  } else if (c.zones.length && !c.zones.includes(u.zoneId)) return false;
  if (c.floor && floorBand(u.floor) !== c.floor) return false;
  if (c.furnishing && u.furnishing !== c.furnishing) return false;
  if (c.items.length && !c.items.every((i) => u.items.includes(i))) return false;
  if (c.pets && !u.petFriendly) return false;
  if (!ignoreBudget && c.budget && allInCost(u, c.household).total > c.budget) return false;
  return true;
}

export function searchUnits(c: CriteriaState, statusOf: StatusLookup, units: Unit[] = UNITS): MatchResult[] {
  const out: MatchResult[] = [];
  for (const unit of units) {
    if (statusOf(unit) !== "available") continue;
    if (!passes(unit, c)) continue;
    const cost = allInCost(unit, c.household);
    const sv = savingsPct(unit);
    const reasons: string[] = [];
    if (isBargain(unit)) reasons.push(`Rẻ hơn mặt bằng toà ${sv}% cùng layout`);
    else if (sv > 0) reasons.push(`Thấp hơn giá trung bình toà ${sv}%`);
    if (c.budget) reasons.push(`All-in ${vndShort(cost.total)}, dưới ngân sách ${vndShort(c.budget - cost.total)}`);
    const matched = c.items.filter((i) => unit.items.includes(i));
    if (matched.length) reasons.push(`Có ${matched.map((i) => ITEM_LABEL[i].toLowerCase()).join(", ")} như bạn cần`);
    if (c.pets && unit.petFriendly) reasons.push("Chủ nhà cho nuôi thú cưng");
    if (c.floor) reasons.push(`${FLOOR_LABEL[c.floor]} — tầng ${unit.floor}`);
    reasons.push(`${unit.view} · hướng ${unit.direction}`);
    const score = sv * 1.2 + (c.budget ? 10 * (1 - cost.total / c.budget) : 0) + matched.length * 2 + (isBargain(unit) ? 6 : 0) + (unit.interest24h >= 3 ? 1 : 0);
    out.push({ unit, cost, savings: sv, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Khi không có kết quả: gợi ý cách nới điều kiện để có căn. */
export function relaxHint(c: CriteriaState, statusOf: StatusLookup, units: Unit[] = UNITS): string {
  const cheapest = units.filter((u) => statusOf(u) === "available" && passes(u, c, true))
    .map((u) => ({ u, total: allInCost(u, c.household).total }))
    .sort((a, b) => a.total - b.total)[0];
  if (cheapest && c.budget) {
    const gap = cheapest.total - c.budget;
    return `Căn rẻ nhất khớp các điều kiện còn lại là ${unitAddress(cheapest.u)} với All-in ${vnd(cheapest.total)}đ/tháng, cao hơn ngân sách ${vndShort(gap)}. Bạn thử nâng ngân sách hoặc bớt một điều kiện nhé.`;
  }
  return "Chưa có căn nào khớp đủ các điều kiện này. Bạn thử bớt tầng, đồ dùng hoặc mở rộng phân khu nhé.";
}

// ─── Tóm tắt tiêu chí thành các "chip" ───────────────────────────────────────────────────────

export interface CriteriaChip {
  key: string;
  label: string;
  /** Hàm gỡ chip khỏi tiêu chí. */
  clear: (c: CriteriaState) => CriteriaState;
}

export function criteriaChips(c: CriteriaState): CriteriaChip[] {
  const chips: CriteriaChip[] = [];
  if (c.budget) chips.push({ key: "budget", label: `All-in ≤ ${vndShort(c.budget)}`, clear: (x) => ({ ...x, budget: undefined }) });
  if (c.layouts.length) chips.push({ key: "layouts", label: c.layouts.map((l) => (l === "Studio" ? "Studio" : LAYOUT_LABEL[l])).join(" / "), clear: (x) => ({ ...x, layouts: [] }) });
  if (c.buildings.length) chips.push({ key: "buildings", label: `Toà ${c.buildings.join(", ")}`, clear: (x) => ({ ...x, buildings: [] }) });
  if (c.zones.length) chips.push({ key: "zones", label: c.zones.map((z) => zoneById(z).short).join(", "), clear: (x) => ({ ...x, zones: [] }) });
  if (c.floor) chips.push({ key: "floor", label: FLOOR_LABEL[c.floor], clear: (x) => ({ ...x, floor: undefined }) });
  if (c.furnishing) chips.push({ key: "furnishing", label: FURNISHING_LABEL[c.furnishing as Furnishing], clear: (x) => ({ ...x, furnishing: undefined }) });
  if (c.items.length) chips.push({ key: "items", label: c.items.map((i) => ITEM_LABEL[i]).join(", "), clear: (x) => ({ ...x, items: [] }) });
  if (c.pets) chips.push({ key: "pets", label: "Nuôi thú cưng", clear: (x) => ({ ...x, pets: undefined }) });
  return chips;
}

/** Câu tự nhiên dựng từ bộ lọc khi khách chỉ bấm "Tìm căn" mà không gõ gì. */
export function sentenceFromCriteria(c: CriteriaState): string {
  const parts: string[] = ["Tìm giúp mình"];
  parts.push(c.layouts.length ? c.layouts.map((l) => (l === "Studio" ? "Studio" : `căn ${l.replace("PN", " phòng ngủ")}`)).join(" hoặc ") : "căn hộ");
  if (c.buildings.length) parts.push(`ở toà ${c.buildings.join(", ")}`);
  else if (c.zones.length) parts.push(`ở ${c.zones.map((z) => zoneById(z).short).join(", ")}`);
  if (c.budget) parts.push(`tổng chi phí tối đa ${vndShort(c.budget)}/tháng`);
  if (c.floor) parts.push(FLOOR_LABEL[c.floor].split(" (")[0].toLowerCase());
  if (c.items.length) parts.push(`có ${c.items.map((i) => ITEM_LABEL[i].toLowerCase()).join(", ")}`);
  if (c.pets) parts.push("cho nuôi thú cưng");
  return parts.join(" ") + ".";
}

// ─── Hỏi đáp nhanh (không phải tìm căn) ─────────────────────────────────────────────────────

interface Faq {
  test: RegExp;
  answer: string;
}

const FAQS: Faq[] = [
  {
    test: /all.?in|chi phi|phi gi|gia gom|bao gom|phat sinh/,
    answer:
      "All-in Cost là tổng chi phí thực tế mỗi tháng, gồm 4 khoản: tiền thuê + phí quản lý (diện tích × 9.500đ) + phí gửi xe (150.000đ/xe máy, 1.250.000đ/ô tô) + dự toán điện nước (300.000đ/người). Mọi căn trên VinStay đều hiển thị đủ 4 khoản, nên không có phụ phí ẩn khi vào ở.",
  },
  {
    test: /coc|dat coc|giu cho|2 trieu|2tr|hoan/,
    answer:
      "Cọc giữ chỗ là 2.000.000đ, thanh toán qua VietQR sau khi bạn xem phòng và ưng ý. Căn được khoá giữ chỗ mặc định 48 giờ (tuỳ căn 12–72 giờ) cho bạn. Khi ký hợp đồng thuê, đúng 2.000.000đ này được chuyển 100% thành Tiền cọc bảo đảm tài sản, không trừ vào tiền thuê tháng đầu, và hoàn lại khi thanh lý sau khi đối soát hiện trạng.",
  },
  {
    test: /phi quan ly|bql|ban quan ly/,
    answer:
      "Phí quản lý của Vinhomes tính theo diện tích thông thủy, khoảng 9.500đ/m². Ví dụ căn 45m² là 427.500đ/tháng. Khoản này đã nằm sẵn trong All-in Cost của từng căn.",
  },
  {
    test: /xem nha|xem phong|dat lich|hen|lich xem/,
    answer:
      "Bạn chọn khung giờ (sáng 08:30–11:30 hoặc chiều 14:00–18:00), xác thực số điện thoại bằng mã 4 số gửi qua Zalo, rồi Field Host của khu sẽ nhận lịch trong 3 phút. Trước giờ hẹn 10 phút mình nhắn Zalo kèm nút “Tôi đã có mặt tại sảnh”, Host xuống sảnh đón và đưa bạn lên phòng trong khoảng 60 giây.",
  },
  {
    test: /hop dong|ky so|cccd|can cuoc|ocr/,
    answer:
      "Sau khi cọc, bạn chụp 2 mặt CCCD một lần duy nhất. AI đọc thông tin trong khoảng 5 giây và tự điền Thỏa thuận đặt cọc; bạn ký bằng mã OTP Zalo. Dữ liệu được mã hoá AES-256 theo Nghị định 13/2023/NĐ-CP và ảnh gốc không gửi cho môi giới hay chủ nhà.",
  },
  {
    test: /tho|sua chua|hong hoc|bao tri/,
    answer:
      "VinStay và Field Host không nhận sửa chữa. Khi có sự cố, Host giới thiệu danh bạ thợ ngoài uy tín tại Ocean Park; bạn và thợ tự thoả thuận giá và trách nhiệm trực tiếp.",
  },
  {
    test: /^(xin )?chao|^hello|^hi\b|cam on/,
    answer: "Chào bạn! Bạn cho mình biết ngân sách mỗi tháng và loại căn muốn thuê nhé, mình lọc trong khoảng 30 giây.",
  },
];

export function faqAnswer(text: string): string | undefined {
  const t = fold(text);
  return FAQS.find((f) => f.test.test(t))?.answer;
}

export const CLARIFY_REPLY =
  "Mình chưa bắt được đủ thông tin để lọc căn. Bạn cho mình thêm ngân sách tối đa mỗi tháng và loại căn (Studio, 1, 2 hoặc 3 phòng ngủ) nhé. Ví dụ: “Studio dưới 8 triệu ở Masteri”.";

export const SAMPLE_PROMPTS = [
  "Studio dưới 8 triệu, có điều hòa và tủ lạnh",
  "Căn 2 phòng ngủ ở Sapphire 2, ngân sách 11 triệu, 2 người",
  "Chi phí All-in gồm những gì?",
  "1 phòng ngủ cho nuôi mèo, tầng cao, khoảng 9 triệu",
];

export function searchReply(total: number, kept: number, c: CriteriaState, top: MatchResult | undefined): string {
  if (!kept) return "";
  const budgetText = c.budget ? ` có All-in Cost không vượt ${vnd(c.budget)}đ` : " khớp điều kiện của bạn";
  const lead = `Mình đã quét ${total} căn đang mở tại Ocean Park 1 và giữ lại ${kept} căn${budgetText}.`;
  const pick = top
    ? ` Mình nghiêng về ${unitAddress(top.unit)}: All-in ${vnd(top.cost.total)}đ/tháng${top.savings > 0 ? `, thấp hơn mặt bằng toà ${top.savings}%` : ""}. Danh sách bên phải đã xếp theo độ khớp và mức tiết kiệm — bạn có thể đặt lịch xem ngay trong thẻ căn.`
    : "";
  return lead + pick;
}

// ─── Điều phối một lượt hội thoại ─────────────────────────────────────────────────────────────

export type Interpretation =
  | { kind: "search"; criteria: CriteriaState; results: MatchResult[]; total: number; reply: string }
  | { kind: "answer"; reply: string };

/** Hiểu một tin nhắn: tìm căn (kèm kết quả) hoặc trả lời câu hỏi thường gặp, hoặc hỏi lại cho rõ. */
export function interpret(text: string, base: CriteriaState, searched: boolean, statusOf: StatusLookup, units: Unit[] = UNITS): Interpretation {
  const { patch, hasSearchSignal } = parseQuery(text, base);
  let signal = hasSearchSignal;
  const t = fold(text);

  // Câu tiếp nối sau khi đã có kết quả: "rẻ hơn nữa", "tăng ngân sách"
  if (searched && patch.budget) {
    if (/re hon|thap hon|giam/.test(t) && !hasSearchSignal) {
      patch.budget = Math.round((patch.budget * 0.9) / 100_000) * 100_000;
      signal = true;
    } else if (/cao hon|tang ngan sach|nang ngan sach/.test(t) && !hasSearchSignal) {
      patch.budget = Math.round((patch.budget * 1.15) / 100_000) * 100_000;
      signal = true;
    }
  }

  const faq = faqAnswer(text);
  const wantsSearch = signal || (!faq && hasCriteria(patch));

  if (!wantsSearch) return { kind: "answer", reply: faq ?? CLARIFY_REPLY };

  const total = units.filter((u) => statusOf(u) === "available").length;
  const results = searchUnits(patch, statusOf, units);
  const reply = results.length ? searchReply(total, results.length, patch, results[0]) : `Mình đã quét ${total} căn đang mở nhưng chưa có căn nào khớp. ${relaxHint(patch, statusOf, units)}`;
  return { kind: "search", criteria: patch, results, total, reply };
}
