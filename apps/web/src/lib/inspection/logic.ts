import type { ApiResponse } from "@/lib/apiClient";
import type {
  DeclaredField,
  DraftError,
  DraftLine,
  InspectionCard,
  InspectionDetail,
  InspectionDraft,
  InspectionPhotoView,
  InventoryGroup,
  InventoryLineReport,
  ListingRoom,
  Liability,
  SubmitInspectionDto,
} from "./types";
import { detectListingTextViolation, listingTextMessage } from "@/lib/units/listing-text";
import { blankFacts, blankListing, blankPricing, toExtrasDto, validateExtras } from "./facts";

/**
 * Hàm THUẦN của cổng thẩm định (hồ sơ 16, SPEC-P03 §1) — không import mock, không DOM, test được trong Node.
 */

// ─── Nhãn hiển thị ──────────────────────────────────────────────────────────────────────────────

export const DECLARED_FIELDS: DeclaredField[] = ["identity", "layout", "areaM2", "furnishing", "lock"];
export const GROUPS: InventoryGroup[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const MAX_EXTRA_LINES = 10;
export const LOW_CONDITION = 60;
export const CONDITION_OPTIONS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

export const DECLARED_LABEL: Record<DeclaredField, string> = {
  identity: "Toà · Tầng · Căn",
  layout: "Loại căn",
  areaM2: "Diện tích",
  furnishing: "Nội thất",
  lock: "Loại khoá",
};

export const GROUP_LABEL: Record<InventoryGroup, string> = {
  I: "Khu vực Phòng khách & Sinh hoạt chung",
  II: "Khu vực Bếp & Bàn ăn",
  III: "Khu vực Phòng ngủ",
  IV: "Khu vực Phòng tắm & Vệ sinh (WC)",
  V: "Khu vực Ban công / Logia & Giặt phơi",
  VI: "Hệ thống Điều hòa không khí",
  VII: "Kết cấu hoàn thiện & Chiếu sáng",
  VIII: "Khóa, Thẻ từ & Điều khiển",
};

export const ROOM_LABEL: Record<ListingRoom, string> = {
  living_room: "Phòng khách",
  bedroom: "Phòng ngủ",
  kitchen: "Bếp",
  bathroom: "Phòng tắm",
  balcony: "Ban công",
  view: "View",
  other: "Khác",
};
export const ROOMS = Object.keys(ROOM_LABEL) as ListingRoom[];

export const FURNISHING_LABEL = { full: "Full nội thất", basic: "Nội thất cơ bản", empty: "Nhà trống" } as const;
export const FUNCTION_LABEL = {
  ac: "Điều hòa làm lạnh tốt, không rò nước sau 5 phút khởi động",
  kitchen: "Bếp từ / hồng ngoại nhận nồi sau 15 giây, phím cảm ứng nhạy",
  waterHeater: "Bình nước nóng hoạt động, nút ELCB chống giật nhảy bình thường",
  drainage: "Hệ thống cấp thoát nước, vòi rửa, lavabo kín, không rò rỉ ngấm tường",
} as const;

/** Backend có thể gửi `wear_or_misuse` (catalog cũ) — coi như hao mòn / lỗi dùng. */
export const liabilityLabel = (l: Liability | string): string => (l === "misuse" ? "Lỗi dùng" : "Hao mòn / Lỗi dùng");

type DeclaredSource = Pick<InspectionCard, "building" | "floor" | "door" | "layoutKind" | "areaM2" | "furnished" | "locks">;

export function declaredValue(c: DeclaredSource, f: DeclaredField): string {
  switch (f) {
    case "identity":
      return `${c.building} · Tầng ${c.floor} · Căn ${c.door ?? "—"}`;
    case "layout":
      return c.layoutKind;
    case "areaM2":
      return `${c.areaM2} m² tim tường`;
    case "furnishing":
      return c.furnished === false ? "Không nội thất" : "Có nội thất";
    case "lock":
      return c.locks.map((l) => (l === "smart" ? "Khoá thông minh" : "Khoá cơ")).join(" + ");
  }
}

// ─── Mã lỗi (01 §8) ─────────────────────────────────────────────────────────────────────────────

export const INSPECTION_ERRORS: Record<string, string> = {
  inspection_not_found: "Không tìm thấy hồ sơ thẩm định (hoặc không thuộc bạn).",
  inspection_taken: "Đã có Inspector khác nhận ca này.",
  inspection_not_open: "Ca vẫn đang dành cho Inspector được giao — chưa nhận ticket được.",
  inspection_bad_stage: "Trạng thái hồ sơ đã thay đổi. Đang tải lại…",
  photo_invalid_type: "Ảnh phải là JPG, PNG hoặc WebP.",
  photo_too_small: "Ảnh quá nhỏ, chụp lại gần hơn.",
  photo_too_large: "Ảnh quá nặng (tối đa 3MB) — chọn ảnh khác.",
  photo_quota: "Đã đủ số ảnh cho mục này.",
  photo_bad_slot: "Vị trí ảnh không hợp lệ (lỗi ứng dụng) — tải lại trang.",
  report_invalid: "Phiếu chưa hợp lệ — kiểm tra ô được tô đỏ.",
  door_code_required: "Căn khoá điện tử chưa có mã — nhập mã PIN thật của cửa trước khi nộp.",
  door_code_missing: "Chưa có mã cửa trong hệ thống — liên hệ chủ nhà qua hỗ trợ VinStay để lấy mã.",
  storage_unavailable: "Kho ảnh tạm thời lỗi — thử lại sau ít giây.",
  host_role_missing: "Tài khoản chưa được gán vai Thẩm định.",
};
export const INSPECTION_ERROR_CODES = Object.keys(INSPECTION_ERRORS);

/** Mã cho biết dữ liệu đang xem đã cũ ⇒ tải lại (không coi là lỗi chặn). */
export const STALE_CODES: ReadonlySet<string> = new Set(["inspection_taken", "inspection_bad_stage", "inspection_not_found"]);

/** Câu lỗi theo `code`; không có thì dùng `fallback`. */
export function inspectionErrorText(code: string | undefined, fallback = "Có lỗi xảy ra, vui lòng thử lại."): string {
  return (code && INSPECTION_ERRORS[code]) || fallback;
}

/** Từ phản hồi lỗi: `code` ⇒ `message` của backend ⇒ câu chung. */
export function inspectionResErrorText(res: Pick<ApiResponse<unknown>, "code" | "message" | "status">, fallback = "Có lỗi xảy ra, vui lòng thử lại."): string {
  if (res.code && INSPECTION_ERRORS[res.code]) return INSPECTION_ERRORS[res.code];
  if (res.status === 0) return "Mất kết nối máy chủ — kiểm tra mạng rồi thử lại.";
  return res.message || fallback;
}

// ─── Nháp ───────────────────────────────────────────────────────────────────────────────────────

export function blankLine(item: { code: string; group: InventoryGroup; name: string; liability: Liability }, present: boolean): DraftLine {
  return {
    code: item.code,
    group: item.group,
    name: item.name,
    liability: item.liability,
    present,
    qty: 1,
    condition: null,
    spec: "",
    note: "",
    compensation: "",
    photoIds: [],
  };
}

/** Quy tắc khởi tạo checklist theo loại hồ sơ và nội thất căn hộ. */
export function blankDraft(detail: Pick<InspectionDetail, "catalog" | "areaM2" | "furnished" | "layoutKind" | "floor" | "askRent" | "suggestedDeposit" | "declared">): InspectionDraft {
  const inventory = detail.catalog.map((item) => {
    const n = Number(item.code);
    if (n >= 25 && n <= 29) return blankLine(item, true); // sàn, tường, điện, cửa, thẻ: căn nào cũng có
    const declared = detail.declared?.inventoryCodes;
    // Chủ nhà đã chọn món có sẵn ⇒ tick đúng các món đó; hồ sơ cũ (không khai) ⇒ căn có nội thất thì tick 1–27.
    if (detail.furnished !== false && declared) return blankLine(item, declared.includes(item.code));
    return blankLine(item, detail.furnished === true && n >= 1 && n <= 27);
  });
  return {
    declared: {
      identity: { ok: true, actual: "" },
      layout: { ok: true, actual: "" },
      areaM2: { ok: true, actual: "" },
      furnishing: { ok: true, actual: "" },
      lock: { ok: true, actual: "" },
    },
    netAreaM2: String(detail.areaM2),
    furnishing: detail.furnished === false ? "empty" : "full",
    inventory,
    functions: { ac: true, kitchen: true, waterHeater: true, drainage: true },
    listingOrder: [],
    listingPhotoIds: [],
    recommendation: "approve",
    note: "",
    doorPin: "",
    facts: blankFacts(detail),
    pricing: blankPricing(detail),
    listing: blankListing(detail),
  };
}

const byUploaded = (a: InspectionPhotoView, b: InspectionPhotoView) => (a.uploadedAt < b.uploadedAt ? -1 : a.uploadedAt > b.uploadedAt ? 1 : 0);

/**
 * Gắn ảnh trên server vào nháp THEO `slot` (ảnh không nằm trong nháp): mỗi dòng nhận ảnh có `slot` = mã dòng (theo giờ
 * máy chủ), ảnh niêm yết theo thứ tự Host đã sắp (`listingOrder`) rồi tới ảnh mới. Trả bản mới, không sửa bản cũ.
 */
export function syncPhotos(draft: InspectionDraft, photos: InspectionPhotoView[]): InspectionDraft {
  const sorted = [...photos].sort(byUploaded);
  const inventory = draft.inventory.map((l) => ({ ...l, photoIds: sorted.filter((p) => p.slot === l.code).map((p) => p.id) }));
  const listing = sorted.filter((p) => p.slot === "listing").map((p) => p.id);
  const known = new Set(listing);
  const kept = draft.listingOrder.filter((id) => known.has(id));
  const keptSet = new Set(kept);
  const listingPhotoIds = [...kept, ...listing.filter((id) => !keptSet.has(id))];
  return { ...draft, inventory, listingPhotoIds };
}

/** Đổi chỗ ảnh niêm yết `index` lên (-1) hoặc xuống (+1); trả `listingOrder` mới (đã đầy đủ). */
export function moveListing(ids: string[], index: number, dir: -1 | 1): string[] {
  const j = index + dir;
  if (index < 0 || index >= ids.length || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export interface DraftProgress {
  presentLines: number;
  linesWithPhotos: number;
  listingCount: number;
  avgCondition: number;
  lowLines: number;
}

/** Tiến độ tính từ nháp (không gọi API). */
export function draftProgress(draft: InspectionDraft): DraftProgress {
  const present = draft.inventory.filter((l) => l.present);
  const scored = present.filter((l) => l.condition !== null);
  const sum = scored.reduce((a, l) => a + (l.condition ?? 0), 0);
  return {
    presentLines: present.length,
    linesWithPhotos: present.filter((l) => l.photoIds.length >= 1).length,
    listingCount: draft.listingPhotoIds.length,
    avgCondition: scored.length ? Math.round(sum / scored.length) : 0,
    lowLines: scored.filter((l) => (l.condition ?? 0) < LOW_CONDITION).length,
  };
}

// ─── Kiểm hợp lệ (cùng luật V1–V11, SPEC-P01 §4.2) ──────────────────────────────────────────────

const PIN_RE = /^\d{4,8}$/;

/** Lỗi ĐẦU TIÊN theo thứ tự V1→V11; `field` cùng dạng backend (`inventory.7.photoIds`, `listingPhotoIds`…). */
export function validateDraft(draft: InspectionDraft, detail: Pick<InspectionDetail, "areaM2" | "doorKind" | "doorCodeOnFile" | "limits">): DraftError | null {
  // V1
  for (let i = 0; i < DECLARED_FIELDS.length; i++) {
    const d = draft.declared[DECLARED_FIELDS[i]];
    const actual = d.actual.trim();
    if (!d.ok && (actual.length < 1 || actual.length > 80)) {
      return { field: `declared.${i}`, message: `Nhập giá trị thực tế của “${DECLARED_LABEL[DECLARED_FIELDS[i]]}” (1–80 ký tự).` };
    }
  }
  // V2 + V3 (cấu trúc dòng)
  const inv = draft.inventory;
  if (inv.length < 32 || inv.length > 32 + MAX_EXTRA_LINES) {
    return { field: "inventory.0", message: "Bảng kê phải có 32 hạng mục chuẩn và tối đa 10 hạng mục phát sinh." };
  }
  for (let i = 32; i < inv.length; i++) {
    const name = inv[i].name.trim();
    if (inv[i].code !== `X${i - 31}` || name.length < 1 || name.length > 60) {
      return { field: `inventory.${i}.name`, message: `Hạng mục phát sinh ${inv[i].code} cần có tên (1–60 ký tự).` };
    }
    const nameViolation = detectListingTextViolation(name); // F8: tên X ra trang công khai
    if (nameViolation) return { field: `inventory.${i}.name`, message: `Tên hạng mục ${inv[i].code}: ${listingTextMessage(nameViolation)}` };
  }
  const perLineMax = detail.limits.perLineMax;
  for (let i = 0; i < inv.length; i++) {
    const l = inv[i];
    const label = `${l.code}. ${l.name || "hạng mục"}`;
    if (!l.present) {
      // V6: dòng không có mặt ⇒ không ảnh (toSubmitDto gửi rỗng) — không phải lỗi người dùng.
      continue;
    }
    // V4
    if (!Number.isInteger(l.qty) || l.qty < 1) return { field: `inventory.${i}.qty`, message: `“${label}”: số lượng phải là số nguyên ≥ 1.` };
    if (l.condition === null || !Number.isInteger(l.condition) || l.condition < 0 || l.condition > 100 || l.condition % 10 !== 0) {
      return { field: `inventory.${i}.condition`, message: `“${label}”: chưa chọn % độ mới.` };
    }
    if (l.photoIds.length < 1) return { field: `inventory.${i}.photoIds`, message: `“${label}”: cần ít nhất 1 ảnh chụp tại căn.` };
    if (l.photoIds.length > perLineMax) return { field: `inventory.${i}.photoIds`, message: `“${label}”: tối đa ${perLineMax} ảnh.` };
    // V7
    if (l.spec.trim().length > 80) return { field: `inventory.${i}.spec`, message: `“${label}”: quy cách tối đa 80 ký tự.` };
    const specViolation = l.spec.trim() ? detectListingTextViolation(l.spec) : null; // F8: spec ra trang công khai
    if (specViolation) return { field: `inventory.${i}.spec`, message: `“${label}”: ${listingTextMessage(specViolation)}` };
    if (l.note.trim().length > 120) return { field: `inventory.${i}.note`, message: `“${label}”: ghi chú tối đa 120 ký tự.` };
    if (l.compensation.trim() !== "") {
      const n = Number(l.compensation);
      if (!Number.isFinite(n) || n < 0) return { field: `inventory.${i}.compensation`, message: `“${label}”: bồi thường phải là số ≥ 0.` };
    }
  }
  // V8
  const net = Number(draft.netAreaM2);
  if (!(net > 0)) return { field: "netAreaM2", message: "Nhập diện tích thông thuỷ đo thực tế (> 0)." };
  if (net > detail.areaM2) return { field: "netAreaM2", message: `Diện tích thông thuỷ (${net} m²) không thể lớn hơn diện tích tim tường (${detail.areaM2} m²).` };
  if (draft.furnishing !== "full" && draft.furnishing !== "basic" && draft.furnishing !== "empty") return { field: "furnishing", message: "Chọn nội thất thực tế." };
  // V9
  if (draft.recommendation === "approve") {
    const n = draft.listingPhotoIds.length;
    if (n < detail.limits.listingMin || n > detail.limits.listingMax) {
      return { field: "listingPhotoIds", message: `Cần ${detail.limits.listingMin}–${detail.limits.listingMax} ảnh niêm yết (đang có ${n}).` };
    }
  }
  // V10
  const note = draft.note.trim();
  if (draft.recommendation === "reject" && note.length < 1) return { field: "note", message: "Không đạt thì bắt buộc nhập lý do." };
  if (note.length > 300) return { field: "note", message: "Ghi chú tối đa 300 ký tự." };
  // V11
  if (draft.recommendation === "approve" && detail.doorKind === "smart" && !detail.doorCodeOnFile && !PIN_RE.test(draft.doorPin.trim())) {
    return { field: "doorPin", message: "Căn khoá điện tử chưa có mã: nhập mã PIN thật của cửa (4–8 chữ số)." };
  }
  return null;
}

/** V1–V11 rồi V12–V14 (facts/pricing/listing). Workspace dùng bản này; `validateDraft` giữ nguyên cho V1–V11. */
export function validateDraftFull(
  draft: InspectionDraft,
  detail: Pick<InspectionDetail, "areaM2" | "doorKind" | "doorCodeOnFile" | "limits" | "askRent" | "suggestedDeposit">,
): DraftError | null {
  return validateDraft(draft, detail) ?? validateExtras(draft, detail);
}

/** `field` của backend/validateDraft → id phần tử cần cuộn tới (hàng dòng thì bỏ phần thuộc tính). */
export function fieldAnchorId(field: string): string {
  // Trường hồ sơ 18 (facts./pricing./listing.): id kebab-case (areaM2 ⇒ area-m2) theo quy ước anchor B2.
  if (/^(facts|pricing|listing)(\.|$)/.test(field)) return `insp-${field.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/\./g, "-")}`;
  const m = /^(inventory\.\d+)(\..*)?$/.exec(field);
  return `insp-${(m ? m[1] : field).replace(/\./g, "-")}`;
}

/** Dựng body nộp: KHÔNG có `hostId`, `submittedAt`, `avgCondition` (server tự đặt). */
export function toSubmitDto(draft: InspectionDraft): SubmitInspectionDto {
  const declared = DECLARED_FIELDS.map((field) => {
    const d = draft.declared[field];
    return d.ok ? { field, ok: true } : { field, ok: false, actual: d.actual.trim() };
  });
  const inventory: InventoryLineReport[] = draft.inventory.map((l) => {
    if (!l.present) return { code: l.code, group: l.group, name: l.name.trim() || l.name, present: false, liability: l.liability, photoIds: [] };
    const out: InventoryLineReport = {
      code: l.code,
      group: l.group,
      name: l.name.trim(),
      present: true,
      qty: l.qty,
      condition: l.condition ?? 0,
      liability: l.liability,
      photoIds: [...l.photoIds],
    };
    if (l.spec.trim()) out.spec = l.spec.trim();
    if (l.note.trim()) out.note = l.note.trim();
    if (l.compensation.trim() !== "") out.compensation = Number(l.compensation);
    return out;
  });
  const dto: SubmitInspectionDto = {
    declared,
    inventory,
    functions: { ...draft.functions },
    netAreaM2: Number(draft.netAreaM2),
    furnishing: draft.furnishing,
    listingPhotoIds: draft.recommendation === "approve" ? [...draft.listingPhotoIds] : [],
    recommendation: draft.recommendation,
  };
  const note = draft.note.trim();
  if (note) dto.note = note;
  const pin = draft.doorPin.trim();
  if (draft.recommendation === "approve" && pin) dto.doorPin = pin;
  // Không đạt: không gửi facts/pricing/listing (backend bỏ qua pricing; phiếu chỉ cần lý do).
  if (draft.recommendation === "approve") Object.assign(dto, toExtrasDto(draft));
  return dto;
}

// ─── Danh sách ──────────────────────────────────────────────────────────────────────────────────

/** Số ca còn việc (badge menu): `mine` + `open`. */
export const boardBadge = (b: { mine: unknown[]; open: unknown[] }) => b.mine.length + b.open.length;

export function doneCounts(done: Pick<InspectionCard, "stage">[]): { approved: number; rejected: number } {
  return { approved: done.filter((c) => c.stage === "approved").length, rejected: done.filter((c) => c.stage === "rejected").length };
}

/** Giờ còn lại tới hạn (giờ máy chủ), làm tròn lên; ≤0 ⇒ 0. */
export function hoursLeft(inspectDueAt: string, serverNowMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(inspectDueAt) - serverNowMs) / 3_600_000));
}

/** Nháp lưu từ lần trước còn dùng được không (32 dòng đầu khớp mã catalog hiện tại, các dòng X đúng dạng). */
export function isDraftCompatible(draft: InspectionDraft, detail: Pick<InspectionDetail, "catalog">): boolean {
  const n = detail.catalog.length;
  if (draft.inventory.length < n || draft.inventory.length > n + MAX_EXTRA_LINES) return false;
  for (let i = 0; i < n; i++) if (draft.inventory[i]?.code !== detail.catalog[i].code) return false;
  for (let i = n; i < draft.inventory.length; i++) if (draft.inventory[i]?.code !== `X${i - n + 1}`) return false;
  return DECLARED_FIELDS.every((f) => isDeclaredCheck(draft.declared[f]));
}

const isDeclaredCheck = (x: unknown): boolean => typeof x === "object" && x !== null && typeof (x as { ok?: unknown }).ok === "boolean" && typeof (x as { actual?: unknown }).actual === "string";

/** 10 hạng mục Hộ chiếu bàn giao số: độ mới trung bình theo nhóm `passport` của catalog (thứ tự xuất hiện đầu tiên). */
export function passportSummary(
  lines: Pick<DraftLine, "code" | "present" | "condition">[],
  catalog: Pick<InspectionDetail["catalog"][number], "code" | "passport">[],
): { item: string; avg: number | null; count: number }[] {
  const order: string[] = [];
  const passportOf = new Map<string, string>();
  for (const c of catalog) {
    passportOf.set(c.code, c.passport);
    if (!order.includes(c.passport)) order.push(c.passport);
  }
  return order.map((item) => {
    const m = lines.filter((l) => l.present && l.condition !== null && passportOf.get(l.code) === item);
    return { item, avg: m.length ? Math.round(m.reduce((a, l) => a + (l.condition ?? 0), 0) / m.length) : null, count: m.length };
  });
}
