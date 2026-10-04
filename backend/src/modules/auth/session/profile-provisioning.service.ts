import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Portal, PORTAL_ROLE } from '../auth.constants';
import { PROFILE_INCLUDE, ProfileWithRole } from './auth-session.service';
import { RoleIdService } from './role-ids.service';

/** Danh tính để tạo/nạp Profile. `passwordHash` chỉ dùng khi tạo mới (đăng ký email + mật khẩu). */
export interface ProvisionUser {
  id: string;
  email: string;
  fullName?: string | null;
  passwordHash?: string | null;
}

export type EnsureProfileError =
  | 'not_authorized' // Host/Admin chưa có tài khoản (Host do Admin tạo, Admin tạo bằng `npm run create:admin`)
  | 'host_not_provisioned' // Profile vai field_host nhưng chưa có hồ sơ `field_hosts`
  | 'wrong_portal' // tài khoản đã gắn với vai trò khác
  | 'account_suspended'
  | 'account_conflict'; // email đã thuộc một Profile khác

export type EnsureProfileResult =
  | { ok: true; created: boolean; profile: ProfileWithRole }
  | { ok: false; error: EnsureProfileError };

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === 'P2002';

/**
 * Gọi sau MỖI lần xác thực thành công (mật khẩu, Google, đăng ký) với cổng người dùng đi vào.
 * Tạo Profile ở lần đầu và bắt buộc tài khoản khớp cổng:
 *  - tenant / landlord: tự đăng ký.
 *  - host: KHÔNG tự tạo — Admin tạo Profile + FieldHost ở `POST /admin/field-hosts`. Profile field_host
 *    chưa có FieldHost (vd. chỉnh `role_id` bằng tay) bị từ chối `host_not_provisioned`.
 *  - admin: không bao giờ tạo ở đây — chỉ bằng `npm run create:admin`.
 */
@Injectable()
export class ProfileProvisioningService {
  private readonly logger = new Logger(ProfileProvisioningService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleIds: RoleIdService,
  ) {}

  async ensureProfile(user: ProvisionUser, portal: Portal): Promise<EnsureProfileResult> {
    const email = user.email.toLowerCase();

    const existing = await this.findProfile(user.id);
    if (existing) return this.admitExisting(existing, portal);

    if (portal === 'admin' || portal === 'host') return { ok: false, error: 'not_authorized' };

    const roleCode = PORTAL_ROLE[portal];
    const fullName = user.fullName ?? null;
    try {
      const profile = await this.prisma.profile.create({
        data: {
          id: user.id,
          roleId: await this.roleIds.idOf(roleCode),
          email,
          passwordHash: user.passwordHash ?? null,
          fullName: fullName?.slice(0, 100) ?? null,
          lastLoginAt: new Date(),
        },
        include: PROFILE_INCLUDE,
      });
      return { ok: true, created: true, profile };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Hai request đăng nhập đầu tiên song song: bên kia đã tạo → coi như đã tồn tại.
      const raced = await this.findProfile(user.id);
      return raced ? this.admitExisting(raced, portal) : { ok: false, error: 'account_conflict' };
    }
  }

  private async admitExisting(existing: ProfileWithRole, portal: Portal): Promise<EnsureProfileResult> {
    if (existing.role.code !== PORTAL_ROLE[portal]) return { ok: false, error: 'wrong_portal' };
    if (!existing.isActive) return { ok: false, error: 'account_suspended' };
    if (portal === 'host' && !existing.hostProfile) return { ok: false, error: 'host_not_provisioned' };

    // lastLoginAt chỉ để tham khảo: không chờ DB (mỗi lượt khứ hồi ~0,6s) và không để lỗi ghi làm hỏng đăng nhập.
    const lastLoginAt = new Date();
    void this.prisma.profile
      .update({ where: { id: existing.id }, data: { lastLoginAt } })
      .catch((err) => this.logger.warn(`Không ghi được lastLoginAt: ${(err as Error).message}`));
    const profile = { ...existing, lastLoginAt };

    return { ok: true, created: false, profile };
  }

  private findProfile(id: string) {
    return this.prisma.profile.findUnique({ where: { id }, include: PROFILE_INCLUDE });
  }
}
