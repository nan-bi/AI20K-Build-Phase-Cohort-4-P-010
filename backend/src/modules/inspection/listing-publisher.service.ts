import { Injectable } from '@nestjs/common';
import { DoorKeyStatus, DoorLockType, Furnishing, MandateStatus, Prisma, UnitStatus } from '@prisma/client';
import { DoorCodeService } from '../door/door-code.service';
import type { MandateRow, MetaTx } from '../landlord/consignment-meta.store';
import { InspectionPhoto, InspectionReport, addMonths, readConsignmentMeta, toLayoutKind, toLayoutType } from '../landlord/landlord.mappers';
import { mgmtFeePerM2 } from '../landlord/mgmt-fee';
import { LISTING_MANDATE_MONTHS, LISTING_MEDIA_PREFIX } from './inspection.constants';

const FURNISHING: Record<InspectionReport['furnishing'], Furnishing> = {
  full: Furnishing.FULL,
  basic: Furnishing.BASIC,
  empty: Furnishing.EMPTY,
};

export interface PublishOptions {
  now: Date;
  /** Giá + cọc bảo đảm ĐÃ ĐƯỢC CHỦ ĐỒNG Ý (hoặc Inspector giữ nguyên) — hồ sơ 18 SPEC-P02 §3. */
  agreed: { rent: number; securityDeposit: number };
}

/**
 * Tự niêm yết khi Inspector nộp "đạt" (SPEC-P01 §5). CHỈ gọi từ `InspectionFlowService.submit`, bên trong giao
 * dịch của `ConsignmentMetaStore.mutate`: lỗi bất kỳ ⇒ rollback toàn bộ, căn vẫn UNLISTED (B4).
 *
 * Ghi: unit (AVAILABLE + Verified + furnishing + doorNumber) · unit_media (đúng ảnh niêm yết, theo thứ tự) ·
 * door_access_keys (nếu có `doorPin`). Cột ủy quyền (ACTIVE + validUntil) trả về qua `mandateData` để `mutate` ghi
 * chung câu UPDATE với meta (đỡ một vòng DB). Hồ sơ 18: ghi thêm facts thực tế, giá/cọc đã thoả thuận (`agreed`), title/highlights/description;
 * `marketAvgPrice = agreed.rent` ⇒ vẫn chưa có badge "Căn hời" (H9). PIN cửa lưu riêng qua `storeDoorPin` (lúc nộp phiếu, kể cả khi chưa niêm yết).
 */
@Injectable()
export class ListingPublisher {
  constructor(private readonly doors: DoorCodeService) {}

  async publish(
    tx: MetaTx,
    mandate: MandateRow,
    report: InspectionReport,
    photos: InspectionPhoto[],
    opts: PublishOptions,
  ): Promise<{ mandateData: Prisma.ExclusiveMandateUncheckedUpdateInput; listedAt: string }> {
    const { now, agreed } = opts;
    const byId = new Map(photos.map((p) => [p.id, p]));
    const form = readConsignmentMeta(mandate.doorAccessConfig)?.form;

    const facts = report.facts;
    const listing = report.listing;
    // Giữ layout hiện tại nếu cùng loại (vd TWO_BED_TWO_BATH và '2PN' không bị hạ xuống ONE_BATH).
    const layout = facts && toLayoutKind(mandate.unit.layoutType) !== facts.layout ? toLayoutType(facts.layout) : null;
    const mgmtRate = facts ? await mgmtFeePerM2(tx) : 0;

    await tx.unit.update({
      where: { id: mandate.unitId },
      data: {
        status: UnitStatus.AVAILABLE,
        isVerified: true,
        verifiedAt: now,
        furnishing: FURNISHING[report.furnishing],
        ...(form?.door ? { doorNumber: form.door.slice(0, 10) } : {}),
        ...(facts
          ? {
              carpetAreaM2: facts.areaM2,
              ...(layout ? { layoutType: layout } : {}),
              bathrooms: facts.bathrooms,
              direction: facts.direction,
              floorNumber: facts.floor,
              managementFee: Math.round(facts.areaM2 * mgmtRate),
            }
          : {}),
        baseRentPrice: agreed.rent,
        securityDeposit: agreed.securityDeposit,
        marketAvgPrice: agreed.rent,
        ...(listing
          ? {
              title: listing.title,
              highlights: listing.highlights,
              description: listing.description || null,
            }
          : {}),
      },
    });

    // Nội thất thật (SPEC-P01 §3): chỉ dòng present, thay toàn bộ ⇒ chạy lại không nhân đôi.
    await tx.unitInventoryItem.deleteMany({ where: { unitId: mandate.unitId } });
    await tx.unitInventoryItem.createMany({
      data: report.inventory
        .filter((l) => l.present)
        .map((l) => ({
          unitId: mandate.unitId,
          code: l.code,
          groupCode: l.group,
          name: l.name,
          qty: l.qty ?? 1,
          spec: l.spec?.trim().slice(0, 120) || null,
          condition: l.condition ?? null,
        })),
    });

    // Ảnh niêm yết chính thức thay toàn bộ ảnh cũ của căn (nếu có), đúng thứ tự Inspector chọn.
    await tx.unitMedia.deleteMany({ where: { unitId: mandate.unitId } });
    await tx.unitMedia.createMany({
      data: report.listingPhotoIds.map((pid, order) => {
        const p = byId.get(pid) as InspectionPhoto;
        const ext = p.path.slice(p.path.lastIndexOf('.') + 1);
        return {
          unitId: mandate.unitId,
          url: `${LISTING_MEDIA_PREFIX}${mandate.id}/${p.id}.${ext}`,
          category: 'room',
          order,
          verifiedAt: new Date(p.uploadedAt),
        };
      }),
    });

    return {
      mandateData: { status: MandateStatus.ACTIVE, validUntil: addMonths(mandate.signedAt ?? now, LISTING_MANDATE_MONTHS) },
      listedAt: now.toISOString(),
    };
  }

  /** Lưu PIN thật Inspector nhập lúc nộp "đạt" (B6): mã hoá `aes:`; ghi cả khi hồ sơ chờ chủ duyệt giá (căn vẫn UNLISTED). */
  async storeDoorPin(tx: MetaTx, unitId: string, doorPin: string, now: Date): Promise<void> {
    const vaultSecretRef = this.doors.encryptDoorPin(doorPin);
    await tx.doorAccessKey.upsert({
      where: { unitId },
      update: { keyType: DoorLockType.ELECTRONIC_PIN, vaultSecretRef, status: DoorKeyStatus.ACTIVE, lastRotatedAt: now },
      create: { unitId, keyType: DoorLockType.ELECTRONIC_PIN, vaultSecretRef, status: DoorKeyStatus.ACTIVE, lastRotatedAt: now },
    });
  }
}
