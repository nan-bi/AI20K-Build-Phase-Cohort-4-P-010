import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isUuid } from './landlord.mappers';

/**
 * Cửa kiểm soát sở hữu duy nhất của khu Chủ nhà: mọi truy cập một căn/ủy quyền theo id đều đi qua đây,
 * điều kiện `landlordId` luôn lấy từ phiên đăng nhập. Căn của người khác trả 404 (không phải 403)
 * để không lộ việc id đó có tồn tại.
 */
@Injectable()
export class LandlordAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** `idOrCode` là uuid hoặc mã căn (vd VHOP-S1.02-12A08). */
  async ownedUnit<T extends Prisma.UnitInclude>(landlordId: string, idOrCode: string, include?: T) {
    const unit = await this.prisma.unit.findFirst({
      where: { landlordId, ...(isUuid(idOrCode) ? { id: idOrCode } : { unitCode: idOrCode }) },
      ...(include ? { include } : {}),
    });
    if (!unit) throw new NotFoundException('Không tìm thấy căn hộ');
    return unit as Prisma.UnitGetPayload<{ include: T }>;
  }

  async ownedMandate(landlordId: string, mandateId: string) {
    const mandate = isUuid(mandateId)
      ? await this.prisma.exclusiveMandate.findFirst({
          where: { id: mandateId, unit: { landlordId } },
          include: { unit: { include: { building: true } } },
        })
      : null;
    if (!mandate) throw new NotFoundException('Không tìm thấy hồ sơ ủy quyền');
    return mandate;
  }
}
