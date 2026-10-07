import { Injectable } from '@nestjs/common';
import { MandateStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { HostActor } from '../host-viewings/host-viewings.types';
import { DoorCodeService } from '../door/door-code.service';
import { LandlordPhotoStorage } from '../landlord/landlord-photo-storage.service';
import { ConsignmentMeta, ConsignmentStage, consignmentStage, readConsignmentMeta, toLockKind } from '../landlord/landlord.mappers';
import { INSPECTION_CATALOG } from './inspection.catalog';
import {
  BOARD_DONE_LIMIT,
  INSPECTION_PHOTOS_MAX,
  LISTING_PHOTOS_MAX,
  LISTING_PHOTOS_MIN,
  PHOTOS_PER_LINE_MAX,
  PHOTO_MIN_SIDE_PX,
} from './inspection.constants';
import { inspectionNotFound } from './inspection.errors';
import { MandateWithLandlord, awaitingTier, stageOf, toCard, toPhotoView } from './inspection.helpers';
import type { InspectionBoard, InspectionDetail } from './inspection.types';

const INCLUDE = { unit: { include: { building: true, landlord: { select: { fullName: true } } } } } as const;
const OWNER_STAGES: ConsignmentStage[] = ['inspecting', 'awaiting_landlord', 'approved', 'rejected'];

/** Đọc ca thẩm định cho Inspector: bảng (E1) và chi tiết (E2). Chỉ đọc, không ghi. */
@Injectable()
export class InspectionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LandlordPhotoStorage,
    private readonly doors: DoorCodeService,
  ) {}

  /**
   * E1. MỘT truy vấn, lọc meta trong bộ nhớ (số hồ sơ ký gửi < vài trăm).
   * TODO(hồ sơ 12): cột `hostId`/`stage` riêng để lọc ở DB.
   */
  async board(actor: HostActor, now: Date = new Date()): Promise<InspectionBoard> {
    const rows = (await this.prisma.exclusiveMandate.findMany({
      where: {
        status: { in: [MandateStatus.PENDING_INSPECTION, MandateStatus.ACTIVE, MandateStatus.TERMINATED] },
        signedAt: { not: null },
      },
      include: INCLUDE,
    })) as MandateWithLandlord[];

    const mine: { due: number; m: MandateWithLandlord; meta: ConsignmentMeta }[] = [];
    const open: typeof mine = [];
    const done: { at: number; m: MandateWithLandlord; meta: ConsignmentMeta }[] = [];

    for (const m of rows) {
      const meta = readConsignmentMeta(m.doorAccessConfig);
      if (!meta) continue;
      const stage = stageOf(m);
      const due = new Date(meta.inspectDueAt ?? 0).getTime();
      if (stage === 'awaiting_host') {
        const tier = awaitingTier(meta, m.signedAt, actor.hostId, now);
        if (tier === 'assigned') mine.push({ due, m, meta });
        else if (tier === 'open') open.push({ due, m, meta });
      } else if (stage === 'inspecting' && meta.hostId === actor.hostId) {
        mine.push({ due, m, meta });
      } else if ((stage === 'approved' || stage === 'rejected' || stage === 'awaiting_landlord') && meta.decidedBy === actor.hostId) {
        done.push({ at: new Date(meta.decidedAt ?? 0).getTime(), m, meta });
      }
    }

    const byDue = (a: { due: number }, b: { due: number }) => a.due - b.due;
    return {
      serverTime: now.toISOString(),
      mine: mine.sort(byDue).map((x) => toCard(x.m, x.meta, 'assigned', now)),
      open: open.sort(byDue).map((x) => toCard(x.m, x.meta, 'open', now)),
      done: done
        .sort((a, b) => b.at - a.at)
        .slice(0, BOARD_DONE_LIMIT)
        .map((x) => toCard(x.m, x.meta, 'assigned', now)),
    };
  }

  /** E2. Chủ ca HOẶC ca đang ở Open Pool; ngoài ra 404 (không lộ tồn tại). */
  async detail(actor: HostActor, id: string, now: Date = new Date()): Promise<InspectionDetail> {
    const m = (await this.prisma.exclusiveMandate.findUnique({ where: { id }, include: INCLUDE })) as MandateWithLandlord | null;
    const meta = m ? readConsignmentMeta(m.doorAccessConfig) : null;
    if (!m || !meta || !m.signedAt) throw inspectionNotFound();

    const stage = consignmentStage(m);
    let tier: 'assigned' | 'open' | null = null;
    if (stage === 'awaiting_host') tier = awaitingTier(meta, m.signedAt, actor.hostId, now);
    else if (OWNER_STAGES.includes(stage) && meta.hostId === actor.hostId) tier = 'assigned';
    if (!tier) throw inspectionNotFound();
    return this.toDetail(m, meta, actor, tier, now);
  }

  /**
   * Dựng chi tiết từ hồ sơ đã nạp. Chỉ chủ ca (`hostId` = tôi) được link ảnh tham khảo của chủ nhà, ảnh thẩm định
   * và biết căn đã có mã cửa chưa (B10); người xem ca Open Pool chỉ thấy danh sách ảnh với `url: null`.
   * KHÔNG BAO GIỜ trả PIN ở đây (B6).
   */
  async toDetail(
    m: MandateWithLandlord,
    meta: ConsignmentMeta,
    actor: HostActor,
    tier: 'assigned' | 'open',
    now: Date,
  ): Promise<InspectionDetail> {
    const owner = meta.hostId === actor.hostId;
    const landlordPhotos = meta.photos ?? [];
    const inspectionPhotos = meta.inspection?.photos ?? [];
    const [urls, door] = await Promise.all([
      owner ? this.storage.signedUrls([...landlordPhotos.map((p) => p.path), ...inspectionPhotos.map((p) => p.path)]) : Promise.resolve(new Map<string, string | null>()),
      owner ? this.doors.readPin(m.unitId) : Promise.resolve(null),
    ]);

    const form = meta.form;
    return {
      ...toCard(m, meta, tier, now),
      declared: {
        bathrooms: m.unit.bathrooms ?? 1,
        direction: m.unit.direction ?? null,
        title: m.unit.title ?? null,
        highlights: m.unit.highlights ?? [],
        description: m.unit.description ?? null,
      },
      suggestedDeposit: form.suggestedDeposit ?? Number(m.unit.baseRentPrice),
      leaseTerm: form.leaseTerm ?? null,
      note: form.note ?? null,
      landlordPhotos: landlordPhotos.map((p) => ({ id: p.id, name: p.name, url: urls.get(p.path) ?? null })),
      photos: inspectionPhotos.map((p) => toPhotoView(p, urls)),
      doorKind: toLockKind(m.unit.doorLockType),
      doorCodeOnFile: door !== null,
      catalog: INSPECTION_CATALOG.map((c) => ({ ...c })),
      limits: {
        minSidePx: PHOTO_MIN_SIDE_PX,
        perLineMax: PHOTOS_PER_LINE_MAX,
        listingMin: LISTING_PHOTOS_MIN,
        listingMax: LISTING_PHOTOS_MAX,
        totalMax: INSPECTION_PHOTOS_MAX,
      },
      report: meta.report ?? null,
    };
  }
}
