import { Injectable } from '@nestjs/common';
import { DoorKeyStatus, DoorLockType, Furnishing, MandateStatus, Prisma, UnitStatus } from '@prisma/client';
import { DoorCodeService } from '../door/door-code.service';
import type { MandateRow, MetaTx } from '../landlord/consignment-meta.store';
import { InspectionPhoto, InspectionReport, addMonths, readConsignmentMeta } from '../landlord/landlord.mappers';
import { LISTING_MANDATE_MONTHS, LISTING_MEDIA_PREFIX } from './inspection.constants';

const FURNISHING: Record<InspectionReport['furnishing'], Furnishing> = {
  full: Furnishing.FULL,
  basic: Furnishing.BASIC,
  empty: Furnishing.EMPTY,
};

export interface PublishOptions {
  now: Date;
  /** PIN thật Inspector nhập lúc nộp "đạt" (B6) — chỉ truyền khi căn chưa có PIN `aes:` hợp lệ. */
  doorPin?: string;
}

/**
 * Tự niêm yết khi Inspector nộp "đạt" (SPEC-P01 §5). CHỈ gọi từ `InspectionFlowService.submit`, bên trong giao
 * dịch của `ConsignmentMetaStore.mutate`: lỗi bất kỳ ⇒ rollback toàn bộ, căn vẫn UNLISTED (B4).
 *
 * Ghi: unit (AVAILABLE + Verified + furnishing + doorNumber) · unit_media (đúng ảnh niêm yết, theo thứ tự) ·
 * door_access_keys (nếu có `doorPin`). Cột ủy quyền (ACTIVE + validUntil) trả về qua `mandateData` để `mutate` ghi
 * chung câu UPDATE với meta (đỡ một vòng DB). Giá KHÔNG đụng tới (§5.3): `baseRentPrice`, `marketAvgPrice` giữ nguyên.
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
    const { now, doorPin } = opts;
    const byId = new Map(photos.map((p) => [p.id, p]));
    const form = readConsignmentMeta(mandate.doorAccessConfig)?.form;

    await tx.unit.update({
      where: { id: mandate.unitId },
      data: {
        status: UnitStatus.AVAILABLE,
        isVerified: true,
        verifiedAt: now,
        furnishing: FURNISHING[report.furnishing],
        ...(form?.door ? { doorNumber: form.door.slice(0, 10) } : {}),
      },
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

    if (doorPin) {
      const vaultSecretRef = this.doors.encryptDoorPin(doorPin);
      await tx.doorAccessKey.upsert({
        where: { unitId: mandate.unitId },
        update: { keyType: DoorLockType.ELECTRONIC_PIN, vaultSecretRef, status: DoorKeyStatus.ACTIVE, lastRotatedAt: now },
        create: { unitId: mandate.unitId, keyType: DoorLockType.ELECTRONIC_PIN, vaultSecretRef, status: DoorKeyStatus.ACTIVE, lastRotatedAt: now },
      });
    }

    return {
      mandateData: { status: MandateStatus.ACTIVE, validUntil: addMonths(mandate.signedAt ?? now, LISTING_MANDATE_MONTHS) },
      listedAt: now.toISOString(),
    };
  }
}
