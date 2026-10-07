import type { ConsignmentMeta, InspectionPhoto, InspectionReport, InventoryLineReport } from '../landlord/landlord.mappers';
import { assertListingText } from '../property/listing-text';
import { holdingDepositAmount } from '../deposit/deposit-amount';
import { DIRECTIONS } from '../property/unit-facts';
import { INSPECTION_CATALOG } from './inspection.catalog';
import { CATALOG_SIZE, LISTING_PHOTOS_MAX, LISTING_PHOTOS_MIN, MAX_EXTRA_LINES, PHOTOS_PER_LINE_MAX } from './inspection.constants';
import { reportInvalid } from './inspection.errors';
import type { SubmitInspectionInput } from './inspection.types';

const DECLARED_FIELDS = ['identity', 'layout', 'areaM2', 'furnishing', 'lock'] as const;
const FURNISHINGS = ['full', 'basic', 'empty'] as const;
const LAYOUTS = ['Studio', '1PN', '2PN', '3PN'] as const;
export const RENT_MIN = 3_000_000; // cùng ngưỡng chủ nhà khi ký gửi (landlord-consignment)
export const RENT_MAX = 200_000_000;
const len = (v: unknown): number => (typeof v === 'string' ? v.trim().length : 0);

/**
 * Luật hợp lệ phiếu thẩm định V1–V10 (SPEC-P01 §4.2), THUẦN, chạy theo thứ tự bảng (rule-major): lỗi ĐẦU TIÊN ném
 * `report_invalid` kèm `field`. V11 (mã cửa) cần DB nên nằm ở `InspectionFlowService`.
 */
export function validateSubmission(input: SubmitInspectionInput, meta: ConsignmentMeta): void {
  const photos = meta.inspection?.photos ?? [];
  const byId = new Map<string, InspectionPhoto>(photos.map((p) => [p.id, p]));
  const inv: InventoryLineReport[] = Array.isArray(input.inventory) ? input.inventory : [];

  // V1
  const declared = Array.isArray(input.declared) ? input.declared : [];
  if (declared.length !== DECLARED_FIELDS.length) throw reportInvalid('declared', 'Thông tin đối chiếu kê khai phải đủ 5 mục.');
  const seen = new Set<string>();
  declared.forEach((d, i) => {
    if (!DECLARED_FIELDS.includes(d.field) || seen.has(d.field)) {
      throw reportInvalid(`declared.${i}`, 'Thông tin đối chiếu bị trùng lặp hoặc không hợp lệ.');
    }
    seen.add(d.field);
    if (!d.ok && (len(d.actual) < 1 || (d.actual as string).trim().length > 80)) {
      throw reportInvalid(`declared.${i}`, 'Nhập giá trị thực tế (1–80 ký tự) cho thông tin sai lệch.');
    }
  });

  // V2
  if (inv.length < CATALOG_SIZE || inv.length > CATALOG_SIZE + MAX_EXTRA_LINES) {
    throw reportInvalid('inventory', `Danh mục kiểm định phải có ${CATALOG_SIZE}–${CATALOG_SIZE + MAX_EXTRA_LINES} dòng.`);
  }
  INSPECTION_CATALOG.forEach((c, i) => {
    const l = inv[i];
    if (l.code !== c.code || l.group !== c.group || l.name !== c.name || l.liability !== c.liability) {
      throw reportInvalid(`inventory.${i}`, `Hạng mục thứ ${i + 1} không khớp danh mục chuẩn Điều 5.`);
    }
  });

  // V3
  for (let i = CATALOG_SIZE; i < inv.length; i += 1) {
    if (inv[i].code !== `X${i - CATALOG_SIZE + 1}`) {
      throw reportInvalid(`inventory.${i}`, `Hạng mục phát sinh thứ ${i - CATALOG_SIZE + 1} phải có mã X${i - CATALOG_SIZE + 1}.`);
    }
    if (len(inv[i].name) < 1 || inv[i].name.trim().length > 60) {
      throw reportInvalid(`inventory.${i}.name`, 'Tên hạng mục thêm phải từ 1 đến 60 ký tự.');
    }
    assertListingText(`inventory.${i}.name`, inv[i].name.trim()); // F8: tên X ra trang công khai + LLM
  }

  // V4
  inv.forEach((l, i) => {
    if (!l.present) return;
    if (!Number.isInteger(l.qty) || (l.qty as number) < 1) throw reportInvalid(`inventory.${i}.qty`, 'Số lượng phải từ 1 trở lên.');
    if (!Number.isInteger(l.condition) || (l.condition as number) < 0 || (l.condition as number) > 100 || (l.condition as number) % 10 !== 0) {
      throw reportInvalid(`inventory.${i}.condition`, 'Độ mới phải là bội số của 10 (0–100%).');
    }
    if (!Array.isArray(l.photoIds) || l.photoIds.length < 1 || l.photoIds.length > PHOTOS_PER_LINE_MAX) {
      throw reportInvalid(`inventory.${i}.photoIds`, `Hạng mục hiện diện cần 1–${PHOTOS_PER_LINE_MAX} ảnh xác thực.`);
    }
  });

  // V5
  const used = new Set<string>();
  inv.forEach((l, i) => {
    for (const pid of Array.isArray(l.photoIds) ? l.photoIds : []) {
      const p = byId.get(pid);
      if (!p || p.slot !== l.code || used.has(pid)) {
        throw reportInvalid(`inventory.${i}.photoIds`, 'Ảnh không thuộc hạng mục này hoặc đã dùng ở hạng mục khác.');
      }
      used.add(pid);
    }
  });

  // V6
  inv.forEach((l, i) => {
    if (!l.present && Array.isArray(l.photoIds) && l.photoIds.length > 0) {
      throw reportInvalid(`inventory.${i}.photoIds`, 'Hạng mục không có mặt thì không đính kèm ảnh.');
    }
  });

  // V7
  inv.forEach((l, i) => {
    if (l.spec !== undefined && (typeof l.spec !== 'string' || l.spec.length > 80)) throw reportInvalid(`inventory.${i}.spec`, 'Quy cách tối đa 80 ký tự.');
    if (typeof l.spec === 'string' && l.spec.trim()) assertListingText(`inventory.${i}.spec`, l.spec.trim()); // F8: spec ra trang công khai + LLM
    if (l.note !== undefined && (typeof l.note !== 'string' || l.note.length > 120)) throw reportInvalid(`inventory.${i}.note`, 'Ghi chú tối đa 120 ký tự.');
    if (l.compensation !== undefined && (!Number.isFinite(l.compensation) || l.compensation < 0)) {
      throw reportInvalid(`inventory.${i}.compensation`, 'Mức bồi thường phải từ 0 trở lên.');
    }
  });

  // V8
  if (!Number.isFinite(input.netAreaM2) || input.netAreaM2 <= 0 || input.netAreaM2 > meta.form.areaM2) {
    throw reportInvalid('netAreaM2', 'Diện tích thông thủy phải lớn hơn 0 và không vượt diện tích kê khai.');
  }
  if (!FURNISHINGS.includes(input.furnishing)) throw reportInvalid('furnishing', 'Nội thất phải là full, basic hoặc empty.');

  // V9
  if (input.recommendation === 'approve') {
    const ids = Array.isArray(input.listingPhotoIds) ? input.listingPhotoIds : [];
    const ok =
      ids.length >= LISTING_PHOTOS_MIN &&
      ids.length <= LISTING_PHOTOS_MAX &&
      new Set(ids).size === ids.length &&
      ids.every((id) => byId.get(id)?.slot === 'listing');
    if (!ok) {
      throw reportInvalid('listingPhotoIds', `Cần ${LISTING_PHOTOS_MIN}–${LISTING_PHOTOS_MAX} ảnh niêm yết khác nhau (ô "listing").`);
    }
  }

  // V10
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > 300) throw reportInvalid('note', 'Ghi chú tối đa 300 ký tự.');
  if (input.recommendation === 'reject' && note.length < 1) throw reportInvalid('note', 'Từ chối phải ghi lý do (1–300 ký tự).');

  // V12–V14
  validateFactsPricingListing(input, meta);
}

/** Giá/cọc chủ khai lúc ký gửi (cọc mặc định = giá chào), số nguyên. */
export function originalPricing(meta: ConsignmentMeta): { rent: number; securityDeposit: number } {
  return { rent: Math.round(meta.form.askRent), securityDeposit: Math.round(meta.form.suggestedDeposit ?? meta.form.askRent) };
}

/** "Đổi" = giá HOẶC cọc khác bản chủ khai, so số nguyên sau `Math.round` (SPEC-P02 §2). */
export function pricingChanged(pricing: { rent: number; securityDeposit: number }, meta: ConsignmentMeta): boolean {
  const o = originalPricing(meta);
  return Math.round(pricing.rent) !== o.rent || Math.round(pricing.securityDeposit) !== o.securityDeposit;
}

/**
 * V12–V14 (hồ sơ 18): facts, pricing, listing. Bắt buộc khi `approve`; `reject` thì bỏ qua pricing (bỏ qua hoàn toàn,
 * không lưu) và chỉ kiểm facts/listing nếu có gửi. Chạy SAU V1–V10 để không đổi thứ tự lỗi của hồ sơ 16.
 */
function validateFactsPricingListing(input: SubmitInspectionInput, meta: ConsignmentMeta): void {
  const approve = input.recommendation === 'approve';
  const f = input.facts;
  if (f === undefined || f === null) {
    if (approve) throw reportInvalid('facts', 'Thiếu thông tin thực tế của căn (diện tích, loại căn, WC, hướng, tầng).');
  } else {
    if (!Number.isFinite(f.areaM2) || f.areaM2 <= 0 || f.areaM2 > 500) throw reportInvalid('facts.areaM2', 'Diện tích phải lớn hơn 0 và không quá 500 m².');
    if (!LAYOUTS.includes(f.layout)) throw reportInvalid('facts.layout', 'Loại căn phải là Studio, 1PN, 2PN hoặc 3PN.');
    if (!Number.isInteger(f.bathrooms) || f.bathrooms < 1 || f.bathrooms > 4) throw reportInvalid('facts.bathrooms', 'Số WC từ 1 đến 4.');
    if (f.direction !== null && !(DIRECTIONS as readonly string[]).includes(f.direction)) {
      throw reportInvalid('facts.direction', 'Hướng căn không hợp lệ.');
    }
    if (!Number.isInteger(f.floor) || f.floor < 1 || f.floor > 80) throw reportInvalid('facts.floor', 'Tầng phải là số nguyên từ 1 đến 80.');
  }

  const p = input.pricing;
  if (p === undefined || p === null) {
    if (approve) throw reportInvalid('pricing', 'Thiếu giá thuê và tiền cọc bảo đảm.');
  } else if (approve) {
    if (!Number.isInteger(p.rent) || p.rent < RENT_MIN || p.rent > RENT_MAX) {
      throw reportInvalid('pricing', 'Giá thuê phải là số nguyên từ 3.000.000đ đến 200.000.000đ.');
    }
    // Cọc giữ chỗ chuyển 100% vào cọc bảo đảm ⇒ cọc bảo đảm không được nhỏ hơn cọc giữ chỗ; tối đa 3 tháng thuê.
    if (!Number.isInteger(p.securityDeposit) || p.securityDeposit < holdingDepositAmount() || p.securityDeposit > 3 * p.rent) {
      throw reportInvalid('pricing', 'Tiền cọc bảo đảm phải là số nguyên từ cọc giữ chỗ (2.000.000đ) đến 3 lần giá thuê.');
    }
    if (pricingChanged(p, meta)) {
      const reason = typeof p.reason === 'string' ? p.reason.trim() : '';
      if (reason.length < 1 || reason.length > 300) throw reportInvalid('pricing.reason', 'Đổi giá/cọc phải ghi lý do (1–300 ký tự).');
    } else if (typeof p.reason === 'string' && p.reason.length > 300) {
      throw reportInvalid('pricing.reason', 'Lý do tối đa 300 ký tự.');
    }
  }

  const l = input.listing;
  if (l === undefined || l === null) {
    if (approve) throw reportInvalid('listing', 'Thiếu tiêu đề, điểm nổi bật và mô tả công khai.');
  } else {
    const title = typeof l.title === 'string' ? l.title.trim() : '';
    if (title.length < 1 || title.length > 80) throw reportInvalid('listing.title', 'Tiêu đề từ 1 đến 80 ký tự.');
    const highlights = Array.isArray(l.highlights) ? l.highlights.map((h) => (typeof h === 'string' ? h.trim() : '')) : null;
    if (!highlights || highlights.length > 3 || highlights.some((h) => h.length < 1 || h.length > 60)) {
      throw reportInvalid('listing.highlights', 'Tối đa 3 điểm nổi bật, mỗi điểm 1–60 ký tự.');
    }
    const description = typeof l.description === 'string' ? l.description.trim() : '';
    if (typeof l.description !== 'string' || description.length > 600) throw reportInvalid('listing.description', 'Mô tả tối đa 600 ký tự.');
    assertListingText('title', title);
    for (const h of highlights) assertListingText('highlights', h);
    if (description) assertListingText('description', description);
  }
}

/** Dựng `InspectionReport` từ dữ liệu đã hợp lệ: server đặt `hostId`, `submittedAt`, `avgCondition` (không nhận từ client). */
export function buildReport(input: SubmitInspectionInput, meta: ConsignmentMeta, hostId: string, now: Date): InspectionReport {
  const photos = meta.inspection?.photos ?? [];
  const listingIds = new Set(photos.filter((p) => p.slot === 'listing').map((p) => p.id));
  const present = input.inventory.filter((l) => l.present && typeof l.condition === 'number');
  const avgCondition = present.length ? Math.round(present.reduce((s, l) => s + (l.condition as number), 0) / present.length) : 0;

  // Chủ nhà khai không nội thất mà thực tế có ⇒ tự ghi sai lệch để Admin đối soát.
  const declared = input.declared.map((d) => ({ ...d, ...(d.actual !== undefined ? { actual: d.actual.trim() } : {}) }));
  if (meta.form.furnished === false && input.furnishing !== 'empty') {
    const idx = declared.findIndex((d) => d.field === 'furnishing');
    if (idx >= 0) declared[idx] = { field: 'furnishing', ok: false, actual: input.furnishing === 'full' ? 'Full nội thất' : 'Nội thất cơ bản' };
  }

  const note = input.note?.trim();
  return {
    hostId,
    submittedAt: now.toISOString(),
    declared,
    inventory: input.inventory.map((l) => ({
      code: l.code,
      group: l.group,
      name: l.name.trim(),
      present: l.present,
      ...(l.present ? { qty: l.qty, condition: l.condition } : {}),
      ...(l.spec ? { spec: l.spec } : {}),
      ...(l.note ? { note: l.note } : {}),
      liability: l.liability,
      ...(l.compensation !== undefined ? { compensation: l.compensation } : {}),
      photoIds: l.photoIds ?? [],
    })),
    functions: input.functions,
    netAreaM2: input.netAreaM2,
    furnishing: input.furnishing,
    // Từ chối: giữ lại chỉ các ảnh niêm yết có thật (tránh id lạ trong bằng chứng).
    listingPhotoIds: input.recommendation === 'approve' ? input.listingPhotoIds : (input.listingPhotoIds ?? []).filter((id) => listingIds.has(id)),
    recommendation: input.recommendation,
    ...(note ? { note } : {}),
    // Pricing chỉ ý nghĩa khi đạt (SPEC-P02 §5: "Submit fail kèm pricing ⇒ bỏ qua pricing").
    ...(input.facts ? { facts: { ...input.facts } } : {}),
    ...(input.recommendation === 'approve' && input.pricing
      ? {
          pricing: {
            rent: Math.round(input.pricing.rent),
            securityDeposit: Math.round(input.pricing.securityDeposit),
            ...(input.pricing.reason?.trim() ? { reason: input.pricing.reason.trim() } : {}),
          },
        }
      : {}),
    ...(input.listing
      ? {
          listing: {
            title: input.listing.title.trim(),
            highlights: input.listing.highlights.map((h) => h.trim()),
            description: input.listing.description.trim(),
          },
        }
      : {}),
    avgCondition,
  };
}
