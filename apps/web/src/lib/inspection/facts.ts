import { DIRECTIONS, defaultBathrooms } from "@/lib/units/facts";
import { LISTING_LIMITS, detectListingTextViolation, listingTextMessage } from "@/lib/units/listing-text";
import type {
  DraftError,
  FactsDraft,
  InspectionDetail,
  InspectionDraft,
  InspectionFacts,
  InspectionListing,
  InspectionPricing,
  ListingDraft,
  PricingDraft,
} from "./types";

/**
 * Thông tin thực tế / giá & cọc / giới thiệu căn của phiếu thẩm định (hồ sơ 18, SPEC-P03 §2). Hàm THUẦN, cùng luật V12–V14
 * của backend (`inspection-report.validator.ts`). Tách file riêng để không đụng bộ V1–V11 đã có test.
 */

export const RENT_MIN = 3_000_000; // cùng ngưỡng chủ nhà khi ký gửi và validator backend
export const RENT_MAX = 200_000_000;
export const REASON_MAX = 300;
/** Sàn cọc bảo đảm = cọc giữ chỗ backend đang thu (`holdingDepositAmount()`): cọc giữ chỗ chuyển 100% vào cọc bảo đảm. */
export const DEPOSIT_MIN = 2_000_000;
export const DEPOSIT_MAX_RENTS = 3;

type Source = Pick<InspectionDetail, "areaM2" | "layoutKind" | "floor" | "askRent" | "suggestedDeposit" | "declared">;

export const FACT_LABEL = {
  areaM2: "Diện tích (m²)",
  layout: "Loại căn",
  bathrooms: "Số WC",
  direction: "Hướng",
  floor: "Tầng",
} as const;
export type FactKey = keyof typeof FACT_LABEL;

/** Giá trị chủ khai gốc dạng chuỗi; `null` = không biết (API chưa trả) ⇒ không đánh dấu "đã sửa". */
export function declaredFact(detail: Source, key: FactKey): string | null {
  switch (key) {
    case "areaM2":
      return String(detail.areaM2);
    case "layout":
      return detail.layoutKind;
    case "floor":
      return String(detail.floor);
    case "bathrooms":
      return detail.declared?.bathrooms != null ? String(detail.declared.bathrooms) : null;
    case "direction":
      return detail.declared ? (detail.declared.direction ?? "") : null;
  }
}

/** Ô đã sửa so với chủ khai (chỉ khi biết giá trị gốc). */
export function factChanged(draft: FactsDraft, detail: Source, key: FactKey): boolean {
  const orig = declaredFact(detail, key);
  if (orig === null) return false;
  const now = key === "areaM2" || key === "floor" || key === "bathrooms" ? String(Number(draft[key])) : draft[key];
  const was = key === "areaM2" || key === "floor" || key === "bathrooms" ? String(Number(orig)) : orig;
  return now !== was;
}

export function factOriginalText(detail: Source, key: FactKey): string {
  const v = declaredFact(detail, key);
  if (key === "direction") return v ? v : "Chưa rõ";
  return v ?? "—";
}

export function blankFacts(detail: Source): FactsDraft {
  return {
    areaM2: String(detail.areaM2),
    layout: detail.layoutKind,
    bathrooms: String(detail.declared?.bathrooms ?? defaultBathrooms(detail.layoutKind)),
    direction: detail.declared?.direction ?? "",
    floor: String(detail.floor),
  };
}

export function blankPricing(detail: Source): PricingDraft {
  return { rent: String(Math.round(detail.askRent)), securityDeposit: String(Math.round(detail.suggestedDeposit)), reason: "" };
}

export function blankListing(detail: Source): ListingDraft {
  const h = detail.declared?.highlights ?? [];
  return {
    title: detail.declared?.title ?? "",
    highlights: [h[0] ?? "", h[1] ?? "", h[2] ?? ""],
    description: detail.declared?.description ?? "",
  };
}

/** "Đổi" = giá HOẶC cọc khác chủ khai, so số nguyên (khớp backend `pricingChanged`). */
export function pricingChanged(p: PricingDraft, detail: Pick<InspectionDetail, "askRent" | "suggestedDeposit">): boolean {
  return Math.round(Number(p.rent)) !== Math.round(detail.askRent) || Math.round(Number(p.securityDeposit)) !== Math.round(detail.suggestedDeposit);
}

/** Nhãn nút nộp: đổi giá ⇒ gửi chủ duyệt; không đổi ⇒ "Đạt — đăng ngay". */
export function submitLabel(draft: Pick<InspectionDraft, "recommendation" | "pricing">, detail: Pick<InspectionDetail, "askRent" | "suggestedDeposit">): string {
  if (draft.recommendation !== "approve") return "Nộp phiếu không đạt";
  return pricingChanged(draft.pricing, detail) ? "Đạt — gửi chủ nhà duyệt giá" : "Đạt — đăng ngay";
}

export const PRICE_CHANGE_WARNING = "Căn sẽ chờ chủ nhà đồng ý giá mới trước khi đăng";

const err = (field: string, message: string): DraftError => ({ field, message });

/** V12–V14, chỉ khi Đạt. `field` cùng dạng backend (`facts.bathrooms`, `pricing.reason`, `listing.highlights.1`…). */
export function validateExtras(draft: InspectionDraft, detail: Pick<InspectionDetail, "askRent" | "suggestedDeposit">): DraftError | null {
  if (draft.recommendation !== "approve") return null;
  const f = draft.facts;
  const area = Number(f.areaM2);
  if (!(area > 0) || area > 500) return err("facts.areaM2", "Diện tích phải lớn hơn 0 và không quá 500 m².");
  const bath = Number(f.bathrooms);
  if (!Number.isInteger(bath) || bath < 1 || bath > 4) return err("facts.bathrooms", "Số WC từ 1 đến 4.");
  if (f.direction !== "" && !(DIRECTIONS as readonly string[]).includes(f.direction)) return err("facts.direction", "Hướng căn không hợp lệ.");
  const floor = Number(f.floor);
  if (!Number.isInteger(floor) || floor < 1 || floor > 80) return err("facts.floor", "Tầng phải là số nguyên từ 1 đến 80.");

  const p = draft.pricing;
  const rent = Number(p.rent);
  if (p.rent.trim() === "" || !Number.isInteger(rent) || rent < RENT_MIN || rent > RENT_MAX) {
    return err("pricing.rent", "Giá thuê phải là số nguyên từ 3.000.000đ đến 200.000.000đ.");
  }
  const dep = Number(p.securityDeposit);
  if (p.securityDeposit.trim() === "" || !Number.isInteger(dep) || dep < DEPOSIT_MIN || dep > DEPOSIT_MAX_RENTS * rent) {
    return err("pricing.securityDeposit", "Tiền cọc bảo đảm phải là số nguyên từ 2.000.000đ (cọc giữ chỗ) đến 3 lần giá thuê.");
  }
  const reason = p.reason.trim();
  if (pricingChanged(p, detail)) {
    if (reason.length < 1) return err("pricing.reason", "Đổi giá hoặc cọc thì bắt buộc ghi lý do.");
  }
  if (reason.length > REASON_MAX) return err("pricing.reason", `Lý do tối đa ${REASON_MAX} ký tự.`);

  const l = draft.listing;
  const title = l.title.trim();
  if (title.length < 1 || title.length > LISTING_LIMITS.title) return err("listing.title", `Tiêu đề từ 1 đến ${LISTING_LIMITS.title} ký tự.`);
  const tv = detectListingTextViolation(title);
  if (tv) return err("listing.title", listingTextMessage(tv));
  const hs = l.highlights.map((h) => h.trim());
  for (let i = 0; i < hs.length; i++) {
    if (hs[i].length > LISTING_LIMITS.highlight) return err(`listing.highlights.${i}`, `Điểm nổi bật tối đa ${LISTING_LIMITS.highlight} ký tự.`);
    const v = hs[i] ? detectListingTextViolation(hs[i]) : null;
    if (v) return err(`listing.highlights.${i}`, listingTextMessage(v));
  }
  const desc = l.description.trim();
  if (desc.length > LISTING_LIMITS.description) return err("listing.description", `Mô tả tối đa ${LISTING_LIMITS.description} ký tự.`);
  const dv = desc ? detectListingTextViolation(desc) : null;
  if (dv) return err("listing.description", listingTextMessage(dv));
  return null;
}

/** Body `facts`/`pricing`/`listing` của submit khi Đạt (đã qua `validateExtras`). */
export function toExtrasDto(draft: InspectionDraft): { facts: InspectionFacts; pricing: InspectionPricing; listing: InspectionListing } {
  const f = draft.facts;
  const reason = draft.pricing.reason.trim();
  return {
    facts: { areaM2: Number(f.areaM2), layout: f.layout, bathrooms: Number(f.bathrooms), direction: f.direction === "" ? null : f.direction, floor: Number(f.floor) },
    pricing: {
      rent: Math.round(Number(draft.pricing.rent)),
      securityDeposit: Math.round(Number(draft.pricing.securityDeposit)),
      ...(reason ? { reason } : {}),
    },
    listing: {
      title: draft.listing.title.trim(),
      highlights: draft.listing.highlights.map((h) => h.trim()).filter(Boolean),
      description: draft.listing.description.trim(),
    },
  };
}

/** Lỗi 400 `LISTING_TEXT_FORBIDDEN` của submit (`field` title|highlights|description) → `field` của phiếu. */
export function listingForbiddenField(field: string | undefined, listing: ListingDraft): string {
  if (field === "title") return "listing.title";
  if (field === "description") return "listing.description";
  if (field && /^inventory\.\d+\.(spec|name)$/.test(field)) return field; // F8: ô nội thất
  const i = listing.highlights.findIndex((h) => h.trim() && detectListingTextViolation(h.trim()));
  return `listing.highlights.${i >= 0 ? i : 0}`;
}
