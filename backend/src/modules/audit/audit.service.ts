import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  actorId?: string;
  actorRole: string;
  actionType: string;
  entityName: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: CreateAuditLogDto) {
    try {
      this.logger.log(
        `[AUDIT] Action: ${data.actionType} | Actor: ${data.actorRole} (${data.actorId || 'system'}) | Target: ${data.entityName}#${data.entityId}`,
      );

      // Default system actor fallback if actorId not provided or foreign key issue
      const actorId = data.actorId || '00000000-0000-0000-0000-000000000001';

      return await this.prisma.auditLog.create({
        data: {
          actorId,
          actorRole: data.actorRole,
          actionType: data.actionType,
          entityName: data.entityName,
          entityId: data.entityId,
          oldValue: data.oldValue || undefined,
          newValue: data.newValue || undefined,
          ipAddress: data.ipAddress || '127.0.0.1',
          userAgent: data.userAgent || 'VinStay-System',
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  async getRecentLogs(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            role: { select: { code: true, name: true } },
          },
        },
      },
    });
  }
}
