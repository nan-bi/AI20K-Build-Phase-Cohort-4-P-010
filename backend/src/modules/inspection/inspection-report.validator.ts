import type { ConsignmentMeta, InspectionPhoto, InspectionReport, InventoryLineReport } from '../landlord/landlord.mappers';
import { INSPECTION_CATALOG } from './inspection.catalog';
import { CATALOG_SIZE, LISTING_PHOTOS_MAX, LISTING_PHOTOS_MIN, MAX_EXTRA_LINES, PHOTOS_PER_LINE_MAX } from './inspection.constants';
import { reportInvalid } from './inspection.errors';
import type { SubmitInspectionInput } from './inspection.types';

const DECLARED_FIELDS = ['identity', 'layout', 'areaM2', 'furnishing', 'lock'] as const;
const FURNISHINGS = ['full', 'basic', 'empty'] as const;
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
}

/** Dựng `InspectionReport` từ dữ liệu đã hợp lệ: server đặt `hostId`, `submittedAt`, `avgCondition` (không nhận từ client). */
export function buildReport(input: SubmitInspectionInput, meta: ConsignmentMeta, hostId: string, now: Date): InspectionReport {
  const photos = meta.inspection?.photos ?? [];
  const listingIds = new Set(photos.filter((p) => p.slot === 'listing').map((p) => p.id));
  const present = input.inventory.filter((l) => l.present && typeof l.condition === 'number');
  const avgCondition = present.length ? Math.round(present.reduce((s, l) => s + (l.condition as number), 0) / present.length) : 0;

  // Chủ nhà khai không nội thất mà thực tế có ⇒ tự ghi sai lệch (giữ quy tắc của luồng mock cũ).
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
    avgCondition,
  };
}
