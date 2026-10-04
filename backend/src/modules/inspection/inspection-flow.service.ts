import { Injectable, Logger } from '@nestjs/common';
import { DoorLockType, MandateStatus, Prisma } from '@prisma/client';
import { DoorCodeService } from '../door/door-code.service';
import { toDoorView } from '../host-viewings/host-viewings.mappers';
import type { DoorAccessView, HostActor, ReqCtx } from '../host-viewings/host-viewings.types';
import { AuditService } from '../audit/audit.service';
import { ConsignmentMetaStore } from '../landlord/consignment-meta.store';
import { ConsignmentMeta, consignmentStage } from '../landlord/landlord.mappers';
import { DOOR_REVEALED_KEEP } from './inspection.constants';
import {
  doorCodeMissing,
  doorCodeRequired,
  inspectionBadStage,
  inspectionNotFound,
  inspectionNotOpen,
  inspectionTaken,
  reportInvalid,
} from './inspection.errors';
import { assertCaseOwner, isOpenPool, mutateInspection } from './inspection.helpers';
import { InspectionQueryService } from './inspection-query.service';
import { buildReport, validateSubmission } from './inspection-report.validator';
import { ListingPublisher } from './listing-publisher.service';
import type { InspectionDetail, InspectionResult, SubmitInspectionInput } from './inspection.types';

/**
 * Nguồn chuyển trạng thái DUY NHẤT của hồ sơ thẩm định (B2):
 * `awaiting_host → inspecting → approved | rejected` (cộng `draft → awaiting_host` ở `LandlordConsignmentService.sign`).
 * Mọi thao tác chạy trong `ConsignmentMetaStore.mutate` (khóa dòng) và KIỂM LẠI stage + chủ ca TRONG khóa.
 */
@Injectable()
export class InspectionFlowService {
  private readonly logger = new Logger(InspectionFlowService.name);

  constructor(
    private readonly store: ConsignmentMetaStore,
    private readonly query: InspectionQueryService,
    private readonly doors: DoorCodeService,
    private readonly publisher: ListingPublisher,
    private readonly audit: AuditService,
  ) {}

  /** E3 — nhận ca được giao (tầng 1). Nhận lại ca của chính mình ⇒ 200 (idempotent). */
  accept(actor: HostActor, id: string, ctx: ReqCtx = {}): Promise<InspectionDetail> {
    return this.take(actor, id, ctx, false);
  }

  /** E4 — nhận ca ở Open Pool (ai nhận trước được giao, nguyên tử nhờ khóa dòng). */
  claim(actor: HostActor, id: string, ctx: ReqCtx = {}): Promise<InspectionDetail> {
    return this.take(actor, id, ctx, true);
  }

  private async take(actor: HostActor, id: string, ctx: ReqCtx, claimed: boolean): Promise<InspectionDetail> {
    const now = new Date();
    await mutateInspection<boolean>(this.store, id, async (locked, meta, tx) => {
      const stage = consignmentStage(locked);
      if (stage === 'inspecting') {
        if (meta.hostId === actor.hostId) return { meta, result: true };
        throw inspectionTaken();
      }
      if (stage !== 'awaiting_host') throw inspectionBadStage();
      if (claimed) {
        if (!isOpenPool(meta, locked.signedAt, now)) throw inspectionNotOpen();
      } else if (meta.hostId !== actor.hostId) {
        throw inspectionNotFound();
      }

      const next: ConsignmentMeta = { ...meta, stage: 'inspecting', hostId: actor.hostId, hostAcceptedAt: now.toISOString() };
      await tx.auditLog.create({
        data: {
          actorId: actor.profileId,
          actorRole: 'field_host',
          actionType: 'INSPECTION_ACCEPTED',
          entityName: 'ExclusiveMandate',
          entityId: locked.id,
          newValue: { claimed, hostId: actor.hostId },
          ipAddress: ctx.ipAddress?.slice(0, 45) ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
      return { meta: next, result: true };
    });
    // Đọc lại để có tên chủ nhà + link ảnh; sau khi nhận, ca đã là của tôi nên luôn đọc được.
    return this.query.detail(actor, id, now);
  }

  /** E5 — cấp mã cửa cho chủ ca đang `inspecting`; mỗi lần ghi audit `DOOR_KEY_REVEAL` (purpose `inspection`). Không PIN giả (B6). */
  async revealDoor(actor: HostActor, id: string, ctx: ReqCtx = {}): Promise<DoorAccessView> {
    const now = new Date();
    return mutateInspection(this.store, id, async (locked, meta, tx) => {
      assertCaseOwner(locked, meta, actor.hostId);
      const read = await this.doors.readPin(locked.unitId, tx);
      if (!read) throw doorCodeMissing();
      if (read.type === 'PHYSICAL_KEY') await this.doors.markKeyWithHost(tx, locked.unitId, actor.hostId);

      const door = toDoorView(read, locked.unit.building.zoneName, now);
      // Bản ghi cho chủ nhà xem ở audit-trail của căn. KHÔNG BAO GIỜ chứa PIN.
      await tx.auditLog.create({
        data: {
          actorId: actor.profileId,
          actorRole: 'field_host',
          actionType: 'DOOR_KEY_REVEAL',
          entityName: 'Unit',
          entityId: locked.unitId,
          newValue: { purpose: 'inspection', mandateId: locked.id, lockType: read.type, revealedAt: now.toISOString(), expiresAt: door.expiresAt },
          ipAddress: ctx.ipAddress?.slice(0, 45) ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
      const revealed = [...(meta.inspection?.doorRevealedAt ?? []), now.toISOString()].slice(-DOOR_REVEALED_KEEP);
      const next: ConsignmentMeta = { ...meta, inspection: { photos: meta.inspection?.photos ?? [], doorRevealedAt: revealed } };
      return { meta: next, result: door };
    });
  }

  /**
   * E8 — nộp phiếu. Đạt ⇒ MỘT giao dịch tự niêm yết (B4); không đạt ⇒ chấm dứt ủy quyền, ảnh GIỮ làm bằng chứng.
   */
  async submit(actor: HostActor, id: string, input: SubmitInspectionInput, ctx: ReqCtx = {}): Promise<InspectionResult> {
    const now = new Date();
    const out = await mutateInspection(this.store, id, async (locked, meta, tx) => {
      assertCaseOwner(locked, meta, actor.hostId);
      validateSubmission(input, meta);

      const approve = input.recommendation === 'approve';
      // V11: căn khóa điện tử chưa có PIN `aes:` hợp lệ ⇒ Inspector nhập PIN thật (không bao giờ PIN giả).
      let doorPin: string | undefined;
      if (approve && locked.unit.doorLockType === DoorLockType.ELECTRONIC_PIN) {
        const read = await this.doors.readPin(locked.unitId, tx);
        if (read?.type !== 'ELECTRONIC_PIN') {
          if (input.doorPin === undefined || input.doorPin === '') throw doorCodeRequired();
          if (!/^\d{4,8}$/.test(input.doorPin)) {
            throw reportInvalid('doorPin', 'Mã cửa phải gồm 4–8 chữ số.');
          }
          doorPin = input.doorPin;
        }
      }

      const report = buildReport(input, meta, actor.hostId, now);
      const decided = { decidedAt: now.toISOString(), decidedBy: actor.hostId };
      let extra: Prisma.ExclusiveMandateUncheckedUpdateInput;
      let listedAt: string | null = null;
      let next: ConsignmentMeta;
      if (approve) {
        const published = await this.publisher.publish(tx, locked, report, meta.inspection?.photos ?? [], { now, doorPin });
        extra = published.mandateData;
        listedAt = published.listedAt;
        next = { ...meta, stage: 'approved', report, ...decided };
      } else {
        extra = { status: MandateStatus.TERMINATED };
        next = { ...meta, stage: 'rejected', report, decisionNote: report.note, ...decided };
      }
      // Chìa cơ: trả về quầy phân khu khi Inspector đã xong việc (đạt hay không).
      await this.doors.markKeyAtDesk(tx, locked.unitId);

      return {
        meta: next,
        extra,
        result: {
          result: { stage: next.stage as 'approved' | 'rejected', unitCode: locked.unit.unitCode, listedAt } as InspectionResult,
          unitId: locked.unitId,
          mandateId: locked.id,
          report,
          photoCount: meta.inspection?.photos.length ?? 0,
        },
      };
    });

    // Sau commit: audit không được làm hỏng kết quả đã chốt (AuditService nuốt lỗi).
    const base = { actorId: actor.profileId, actorRole: 'field_host', ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
    await this.audit.log({
      ...base,
      actionType: 'INSPECTION_SUBMITTED',
      entityName: 'ExclusiveMandate',
      entityId: out.mandateId,
      newValue: { recommendation: out.report.recommendation, avgCondition: out.report.avgCondition, photoCount: out.photoCount },
    });
    if (out.result.stage === 'approved') {
      await this.audit.log({
        ...base,
        actionType: 'UNIT_PUBLISHED',
        entityName: 'Unit',
        entityId: out.unitId,
        newValue: { unitCode: out.result.unitCode, mandateId: out.mandateId, listingPhotos: out.report.listingPhotoIds.length },
      });
    }
    this.logger.log(`[INSPECTION] ${actor.hostId} nộp phiếu ${out.result.unitCode}: ${out.result.stage}`);
    return out.result;
  }
}
