import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLE_NAMES } from '../auth.constants';

/** Bảng `roles` tự lành: thiếu dòng (chưa chạy seed) thì tạo, không làm hỏng đăng nhập/tạo tài khoản. */
@Injectable()
export class RoleIdService {
  private readonly cache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async idOf(code: string): Promise<string> {
    const cached = this.cache.get(code);
    if (cached) return cached;
    const role = await this.prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name: ROLE_NAMES[code] ?? code },
    });
    this.cache.set(code, role.id);
    return role.id;
  }
}
