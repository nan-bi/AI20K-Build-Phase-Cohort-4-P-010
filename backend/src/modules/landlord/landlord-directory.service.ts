import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HostEntry {
  id: string;
  name: string | null;
  assignedZone: string;
}

const TTL_MS = 60_000;

/**
 * Danh bạ Field Host nạp một lần rồi giữ trong bộ nhớ 60 giây. Bảng này nhỏ và ít đổi, trong khi mỗi lần tra
 * trực tiếp là thêm vài lượt truy vấn tới Supabase (mỗi lượt ~0,5–1 giây) vào trang chi tiết căn.
 */
@Injectable()
export class LandlordDirectoryService implements OnModuleInit {
  private readonly logger = new Logger(LandlordDirectoryService.name);
  private cache: { at: number; hosts: HostEntry[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Làm nóng cache lúc khởi động để lượt xem chi tiết đầu tiên không phải trả thêm một lượt truy vấn. Lỗi thì bỏ qua, lần gọi sau tự nạp. */
  onModuleInit() {
    void this.hosts().catch((err) => this.logger.warn(`Chưa nạp được danh bạ Host: ${err.message}`));
  }

  async hosts(now = Date.now()): Promise<HostEntry[]> {
    if (this.cache && now - this.cache.at < TTL_MS) return this.cache.hosts;
    const rows = await this.prisma.fieldHost.findMany({
      select: { id: true, assignedZone: true, profile: { select: { fullName: true } } },
    });
    const hosts = rows.map((h) => ({ id: h.id, name: h.profile?.fullName ?? null, assignedZone: h.assignedZone }));
    this.cache = { at: now, hosts };
    return hosts;
  }

  /** Field Host phụ trách phân khu (khớp theo tên phân khu nằm trong `assignedZone`). */
  hostForZone(hosts: HostEntry[], zoneName: string): HostEntry | null {
    return hosts.find((h) => h.assignedZone.includes(zoneName)) ?? null;
  }
}
