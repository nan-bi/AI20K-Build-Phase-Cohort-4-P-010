import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { authError } from '../auth/auth.errors';
import type { HostActor } from './host-viewings.types';

/** DB ở xa (~1,2s/vòng): nhớ hồ sơ Host trong bộ nhớ ngắn hạn. `dutyStatus` trong cache có thể cũ — nơi cần đúng (nhận ca) tự đọc lại. */
const TTL_MS = 30_000;
const MAX_ENTRIES = 500;

@Injectable()
export class HostActorService {
  private readonly cache = new Map<string, { actor: HostActor; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Dựng Host đang thao tác từ id hồ sơ đăng nhập. Chưa có hồ sơ `field_hosts` ⇒ 403 `host_not_provisioned`. */
  async resolve(profileId: string): Promise<HostActor> {
    const hit = this.cache.get(profileId);
    if (hit && hit.expiresAt > Date.now()) return hit.actor;
    const host = await this.prisma.fieldHost.findUnique({ where: { profileId } });
    if (!host) throw authError('host_not_provisioned');
    const actor: HostActor = {
      hostId: host.id,
      profileId,
      assignedZone: host.assignedZone,
      rating: Number(host.rating),
      dutyStatus: host.dutyStatus,
    };
    if (this.cache.size >= MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(profileId, { actor, expiresAt: Date.now() + TTL_MS });
    return actor;
  }

  /** Admin đổi vai/phân khu/khoá Host, hoặc Host đổi ca trực ⇒ bỏ cache để lần sau đọc lại. */
  forget(profileId: string): void {
    this.cache.delete(profileId);
  }
}
