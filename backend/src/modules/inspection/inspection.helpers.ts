import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConsignmentMetaStore, MandateRow, MetaTx } from '../landlord/consignment-meta.store';
import {
  ConsignmentMeta,
  ConsignmentStage,
  InspectionPhoto,
  PhotoSlot,
  consignmentStage,
  toLayoutKind,
  toLockKind,
} from '../landlord/landlord.mappers';
import { INSPECT_OFFER_HOURS, INSPECT_SLA_HOURS } from './inspection.constants';
import { inspectionBadStage, inspectionNotFound } from './inspection.errors';
import type { InspectionCard, InspectionPhotoView } from './inspection.types';

/** Hồ sơ kèm tên chủ nhà (chỉ họ tên — B10, Host không thấy SĐT/email). */
export type MandateWithLandlord = MandateRow & { unit: MandateRow['unit'] & { landlord?: { fullName: string | null } | null } };

const HOUR_MS = 3_600_000;

export type MutateFn<T> = (
  mandate: MandateRow,
  meta: ConsignmentMeta,
  tx: MetaTx,
) => Promise<{ meta: ConsignmentMeta; result: T; extra?: Prisma.ExclusiveMandateUncheckedUpdateInput }>;

/**
 * `mutate` của kho meta ném `NotFoundException` thô khi hồ sơ không tồn tại / thiếu biểu mẫu; ở luồng thẩm định
 * client cần mã `inspection_not_found` (01 §8).
 */
export async function mutateInspection<T>(store: ConsignmentMetaStore, id: string, fn: MutateFn<T>): Promise<T> {
  try {
    return await store.mutate<T>(id, fn);
  } catch (err) {
    if (err instanceof NotFoundException && !(err.getResponse() as { code?: string }).code) throw inspectionNotFound();
    throw err;
  }
}

/** Mốc giao ca: `offeredAt`; hồ sơ cũ (trước hồ sơ 16) không có thì lấy lúc ký. */
function offerMs(meta: ConsignmentMeta, signedAt: Date | null): number | null {
  if (meta.offeredAt) return new Date(meta.offeredAt).getTime();
  return signedAt ? signedAt.getTime() : null;
}

/** Ca `awaiting_host` ở Open Pool: không có `hostId`, HOẶC đã quá 4 giờ kể từ lúc giao (tính lúc đọc, không cron). */
export function isOpenPool(meta: ConsignmentMeta, signedAt: Date | null, now: Date): boolean {
  if (!meta.hostId) return true;
  const offered = offerMs(meta, signedAt);
  return offered !== null && now.getTime() - offered >= INSPECT_OFFER_HOURS * HOUR_MS;
}

/** Tầng của ca đối với Inspector `hostId` (SPEC-P01 §2); null = không thấy. Chỉ xét `awaiting_host`. */
export function awaitingTier(meta: ConsignmentMeta, signedAt: Date | null, hostId: string, now: Date): 'assigned' | 'open' | null {
  if (meta.hostId === hostId) return 'assigned';
  return isOpenPool(meta, signedAt, now) ? 'open' : null;
}

export function stageOf(m: Parameters<typeof consignmentStage>[0]): ConsignmentStage {
  return consignmentStage(m);
}

export function dueAt(meta: ConsignmentMeta, signedAt: Date | null): string {
  if (meta.inspectDueAt) return meta.inspectDueAt;
  return new Date((signedAt?.getTime() ?? Date.now()) + INSPECT_SLA_HOURS * HOUR_MS).toISOString();
}

export function toCard(
  m: MandateWithLandlord,
  meta: ConsignmentMeta,
  tier: 'assigned' | 'open',
  now: Date,
): InspectionCard {
  const unit = m.unit;
  const form = meta.form;
  const stage = stageOf(m);
  const due = dueAt(meta, m.signedAt);
  return {
    id: m.id,
    unitCode: unit.unitCode,
    building: unit.building.buildingCode,
    zone: unit.building.zoneName,
    floor: unit.floorNumber,
    door: form.door ?? null,
    layoutKind: toLayoutKind(unit.layoutType),
    areaM2: form.areaM2 ?? Number(unit.carpetAreaM2),
    askRent: form.askRent ?? Number(unit.baseRentPrice),
    furnished: form.furnished ?? null,
    locks: form.locks ?? [toLockKind(unit.doorLockType)],
    landlordName: unit.landlord?.fullName || 'Chủ nhà Ocean Park',
    stage,
    signedAt: (m.signedAt ?? now).toISOString(),
    inspectDueAt: due,
    overdue: (stage === 'awaiting_host' || stage === 'inspecting') && now.getTime() > new Date(due).getTime(),
    tier,
    hostAcceptedAt: meta.hostAcceptedAt ?? null,
    decidedAt: meta.decidedAt ?? null,
  };
}

export function toPhotoView(p: InspectionPhoto, urls: Map<string, string | null>): InspectionPhotoView {
  return {
    id: p.id,
    slot: p.slot,
    room: p.room ?? null,
    width: p.width,
    height: p.height,
    size: p.size,
    uploadedAt: p.uploadedAt,
    url: urls.get(p.path) ?? null,
  };
}

const SLOT_LINE_RE = /^(?:[1-9]|[12]\d|3[0-2])$/;
const SLOT_EXTRA_RE = /^X(?:[1-9]|10)$/;

/** `1`..`32` hoặc `X1`..`X10` (hạng mục phiếu). */
export const isLineSlot = (slot: string): boolean => SLOT_LINE_RE.test(slot) || SLOT_EXTRA_RE.test(slot);

/** `listing` ∪ `1..32` ∪ `X1..X10`; sai ⇒ null. */
export function parseSlot(raw: unknown): PhotoSlot | null {
  if (typeof raw !== 'string') return null;
  if (raw === 'listing' || isLineSlot(raw)) return raw as PhotoSlot;
  return null;
}

/** Số hữu hạn từ chuỗi multipart; sai định dạng ⇒ null (không báo lỗi — chỉ là số đo tham khảo, B7). */
export function parseMetric(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  if (typeof raw === 'string' && !raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** ISO 8601 hợp lệ ⇒ chuẩn hoá `toISOString()`; sai ⇒ null. */
export function parseIso(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Chủ ca + `inspecting`. Không phải chủ ca ⇒ 404 (không lộ tồn tại); đúng chủ ca nhưng sai stage ⇒ `inspection_bad_stage`. */
export function assertCaseOwner(m: Parameters<typeof consignmentStage>[0], meta: ConsignmentMeta, hostId: string): void {
  if (meta.hostId !== hostId) throw inspectionNotFound();
  if (stageOf(m) !== 'inspecting') throw inspectionBadStage();
}
