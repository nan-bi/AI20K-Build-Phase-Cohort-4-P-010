import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsignmentMeta, readConsignmentMeta, withConsignmentMeta } from './landlord.mappers';

export type MandateRow = Prisma.ExclusiveMandateGetPayload<{ include: { unit: { include: { building: true } } } }>;
export type MetaTx = Prisma.TransactionClient;

/**
 * Cửa DUY NHẤT để ghi `doorAccessConfig.consignment` (hồ sơ 16, B3). Meta là JSON trong một cột nên ghi kiểu
 * đọc-sửa-ghi trần sẽ ghi đè lẫn nhau (vd chủ nhà thêm ảnh đúng lúc Inspector nhận ca ⇒ stage bị trả về cũ).
 * `mutate` khóa dòng ủy quyền (`FOR UPDATE`), ĐỌC LẠI hồ sơ trong khóa rồi mới gọi `fn` — nên mọi kiểm tra stage
 * phải làm bên trong `fn`, không dựa vào bản đọc trước khi vào khóa.
 */
@Injectable()
export class ConsignmentMetaStore {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `fn` trả meta mới + kết quả. `extra` (tuỳ chọn) là cột ủy quyền ghi cùng một câu UPDATE (vd `signedAt`).
   * `fn` ném lỗi ⇒ hoàn tác toàn bộ, không ghi gì.
   */
  async mutate<T>(
    mandateId: string,
    fn: (
      mandate: MandateRow,
      meta: ConsignmentMeta,
      tx: MetaTx,
    ) => Promise<{ meta: ConsignmentMeta; result: T; extra?: Prisma.ExclusiveMandateUncheckedUpdateInput }>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Khóa dòng: giao dịch khác ghi cùng hồ sơ phải chờ; sau khi nhả khóa nó đọc lại bản mới nhất.
      await tx.$queryRaw`SELECT id FROM exclusive_mandates WHERE id = ${mandateId}::uuid FOR UPDATE`;
      const mandate = await tx.exclusiveMandate.findUnique({
        where: { id: mandateId },
        include: { unit: { include: { building: true } } },
      });
      if (!mandate) throw new NotFoundException('Không tìm thấy hồ sơ ủy quyền');
      const meta = readConsignmentMeta(mandate.doorAccessConfig);
      if (!meta) throw new NotFoundException('Hồ sơ ký gửi không có dữ liệu biểu mẫu.');

      const out = await fn(mandate, meta, tx);
      await tx.exclusiveMandate.update({
        where: { id: mandateId },
        data: { ...(out.extra ?? {}), doorAccessConfig: withConsignmentMeta(mandate.doorAccessConfig, out.meta) as object },
      });
      return out.result;
    });
  }
}
