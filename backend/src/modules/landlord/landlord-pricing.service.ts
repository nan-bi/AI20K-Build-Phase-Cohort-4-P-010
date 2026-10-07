import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { MandateStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ListingPublisher } from '../inspection/listing-publisher.service';
import { ConsignmentMetaStore } from './consignment-meta.store';
import { ConsignmentMeta, consignmentStage } from './landlord.mappers';

export interface PricingDecisionResult {
  stage: 'approved' | 'rejected';
  unitCode: string;
  listedAt: string | null;
  rent?: number;
  securityDeposit?: number;
}

const pricingNotPending = () =>
  new ConflictException({ message: 'Hồ sơ không còn chờ bạn duyệt giá. Đang tải lại…', code: 'PRICING_NOT_PENDING' });
const notOwner = () => new ForbiddenException({ message: 'Hồ sơ này không thuộc về bạn.', code: 'NOT_OWNER' });

/**
 * Chủ nhà duyệt giá/cọc do Inspector đề xuất (hồ sơ 18 SPEC-P02 §4). Stage `awaiting_landlord` được ĐỌC LẠI TRONG khoá
 * dòng của `ConsignmentMetaStore.mutate` (B10) ⇒ bấm 2 lần / 2 tab chỉ thành công 1 lần, lần sau 409 `PRICING_NOT_PENDING`.
 * accept ⇒ niêm yết với giá đề xuất + mandate ACTIVE; decline ⇒ đóng hồ sơ (rejected, TERMINATED), KHÔNG niêm yết (Q1 = b).
 */
@Injectable()
export class LandlordPricingService {
  private readonly logger = new Logger(LandlordPricingService.name);

  constructor(
    private readonly store: ConsignmentMetaStore,
    private readonly publisher: ListingPublisher,
    private readonly audit: AuditService,
  ) {}

  async decide(landlordId: string, id: string, decision: 'accept' | 'decline'): Promise<PricingDecisionResult> {
    const now = new Date();
    const out = await this.store.mutate<PricingDecisionResult & { proposalRent: number; proposalDeposit: number; unitId: string }>(
      id,
      async (locked, meta, tx) => {
        // Sở hữu kiểm TRONG khoá: khác chủ ⇒ 403 NOT_OWNER; id không tồn tại ⇒ 404 từ kho meta.
        if (locked.unit.landlordId !== landlordId) throw notOwner();
        const proposal = meta.pricingProposal;
        if (consignmentStage(locked) !== 'awaiting_landlord' || !proposal || !meta.report) throw pricingNotPending();

        const base = { unitCode: locked.unit.unitCode, proposalRent: proposal.rent, proposalDeposit: proposal.securityDeposit, unitId: locked.unitId };
        const decided = { pricingDecision: { decision, decidedAt: now.toISOString() } };
        if (decision === 'decline') {
          const next: ConsignmentMeta = { ...meta, stage: 'rejected', decisionNote: 'Chủ nhà không đồng ý giá đề xuất', ...decided };
          return {
            meta: next,
            extra: { status: MandateStatus.TERMINATED },
            result: { ...base, stage: 'rejected', listedAt: null },
          };
        }
        const published = await this.publisher.publish(tx, locked, meta.report, meta.inspection?.photos ?? [], {
          now,
          agreed: { rent: proposal.rent, securityDeposit: proposal.securityDeposit },
        });
        const next: ConsignmentMeta = { ...meta, stage: 'approved', ...decided };
        return {
          meta: next,
          extra: published.mandateData,
          result: { ...base, stage: 'approved', listedAt: published.listedAt, rent: proposal.rent, securityDeposit: proposal.securityDeposit },
        };
      },
    );

    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'CONSIGNMENT_PRICING_DECISION',
      entityName: 'ExclusiveMandate',
      entityId: id,
      newValue: { decision, rent: out.proposalRent, securityDeposit: out.proposalDeposit },
    });
    if (out.stage === 'approved') {
      await this.audit.log({
        actorId: landlordId,
        actorRole: 'landlord',
        actionType: 'UNIT_PUBLISHED',
        entityName: 'Unit',
        entityId: out.unitId,
        newValue: { unitCode: out.unitCode, mandateId: id, via: 'pricing_accept' },
      });
    }
    this.logger.log(`[PRICING] ${landlordId} ${decision} đề xuất giá của ${out.unitCode}`);
    const { proposalRent: _r, proposalDeposit: _d, unitId: _u, ...result } = out;
    return result;
  }
}
