import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthAuditEntry {
  userId?: string;
  phoneHash?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Nhật ký sự kiện xác thực (SAD §9, NĐ 13/2023): ai/khi nào/từ đâu.
 * Ghi lỗi không được làm hỏng luồng đăng nhập nên chỉ log cảnh báo.
 */
@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Không chờ DB: ghi audit không được làm chậm hay làm hỏng đăng nhập. */
  record(event: string, entry: AuthAuditEntry = {}): Promise<void> {
    void this.prisma.authAuditLog
      .create({
        data: {
          event,
          userId: entry.userId,
          phoneHash: entry.phoneHash,
          ipAddress: entry.ipAddress?.slice(0, 45),
          userAgent: entry.userAgent,
          metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err) => this.logger.warn(`Không ghi được auth audit "${event}": ${(err as Error).message}`));
    return Promise.resolve();
  }
}
