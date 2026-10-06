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

      const actorId = data.actorId || (await this.systemActorId());

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

  private async systemActorId(): Promise<string> {
    const admin = await this.prisma.profile.findFirst({
      where: { role: { code: 'ops_admin' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!admin) throw new Error('Không có tài khoản Admin thật để ghi audit hệ thống.');
    return admin.id;
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
