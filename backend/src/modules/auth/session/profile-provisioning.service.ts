import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Portal, PORTAL_ROLE, ROLE_NAMES } from '../auth.constants';
import { PROFILE_INCLUDE, ProfileWithRole } from './auth-session.service';

/** Danh tính để tạo/nạp Profile. `passwordHash` chỉ dùng khi tạo mới (đăng ký email + mật khẩu). */
export interface ProvisionUser {
  id: string;
  email: string;
  fullName?: string | null;
  passwordHash?: string | null;
}

export type EnsureProfileError =
  | 'not_authorized' // Host chưa được Admin mời (hoặc lời mời đã dùng), hoặc Admin chưa được cấp
  | 'wrong_portal' // tài khoản đã gắn với vai trò khác
  | 'account_suspended'
  | 'account_conflict'; // email đã thuộc một Profile khác

export type EnsureProfileResult =
  | { ok: true; created: boolean; profile: ProfileWithRole; needsRfidVerification: false }
  | { ok: true; created: boolean; profile: ProfileWithRole; needsRfidVerification: true; hostId: string }
  | { ok: false; error: EnsureProfileError };

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === 'P2002';

/**
 * Gọi sau MỖI lần xác thực thành công (mật khẩu, Google, đăng ký) với cổng người dùng đi vào.
 * Tạo Profile ở lần đầu và bắt buộc tài khoản khớp cổng:
 *  - tenant / landlord: tự đăng ký.
 *  - host: email phải có HostInvite chưa dùng; sau khi nhập đúng RFID (AuthService.verifyRfid)
 *    mới có bản ghi FieldHost. Trước đó `needsRfidVerification: true`.
 *  - admin: không bao giờ tạo ở đây — chỉ bằng `npm run create:admin`.
 */
@Injectable()
export class ProfileProvisioningService {
  private readonly logger = new Logger(ProfileProvisioningService.name);
  private readonly roleIds = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(user: ProvisionUser, portal: Portal): Promise<EnsureProfileResult> {
    const email = user.email.toLowerCase();

    const existing = await this.findProfile(user.id);
    if (existing) return this.admitExisting(existing, portal, email);

    if (portal === 'admin') return { ok: false, error: 'not_authorized' };

    let inviteId: string | undefined;
    if (portal === 'host') {
      const invite = await this.prisma.hostInvite.findUnique({ where: { email } });
      if (!invite || invite.claimedAt) return { ok: false, error: 'not_authorized' };
      inviteId = invite.id;
    }

    const roleCode = PORTAL_ROLE[portal];
    const fullName = user.fullName ?? null;
    try {
      const profile = await this.prisma.profile.create({
        data: {
          id: user.id,
          roleId: await this.roleId(roleCode),
          email,
          passwordHash: user.passwordHash ?? null,
          fullName: fullName?.slice(0, 100) ?? null,
          lastLoginAt: new Date(),
        },
        include: PROFILE_INCLUDE,
      });
      return inviteId
        ? { ok: true, created: true, profile, needsRfidVerification: true, hostId: inviteId }
        : { ok: true, created: true, profile, needsRfidVerification: false };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Hai request đăng nhập đầu tiên song song: bên kia đã tạo → coi như đã tồn tại.
      const raced = await this.findProfile(user.id);
      return raced ? this.admitExisting(raced, portal, email) : { ok: false, error: 'account_conflict' };
    }
  }

  private async admitExisting(existing: ProfileWithRole, portal: Portal, email: string): Promise<EnsureProfileResult> {
    if (existing.role.code !== PORTAL_ROLE[portal]) return { ok: false, error: 'wrong_portal' };
    if (!existing.isActive) return { ok: false, error: 'account_suspended' };

    // lastLoginAt chỉ để tham khảo: không chờ DB (mỗi lượt khứ hồi ~0,6s) và không để lỗi ghi làm hỏng đăng nhập.
    const lastLoginAt = new Date();
    void this.prisma.profile
      .update({ where: { id: existing.id }, data: { lastLoginAt } })
      .catch((err) => this.logger.warn(`Không ghi được lastLoginAt: ${(err as Error).message}`));
    const profile = { ...existing, lastLoginAt };

    // Host đã đăng nhập nhưng chưa nhập RFID thì chưa được coi là Host (guard cũng chặn theo isHostVerified).
    if (portal === 'host' && !profile.hostProfile) {
      const invite = await this.prisma.hostInvite.findUnique({ where: { email } });
      if (!invite || invite.claimedAt) return { ok: false, error: 'not_authorized' };
      return { ok: true, created: false, profile, needsRfidVerification: true, hostId: invite.id };
    }
    return { ok: true, created: false, profile, needsRfidVerification: false };
  }

  private findProfile(id: string) {
    return this.prisma.profile.findUnique({ where: { id }, include: PROFILE_INCLUDE });
  }

  /** Bảng `roles` tự lành: thiếu dòng (chưa chạy seed) thì tạo, không làm hỏng đăng nhập. */
  private async roleId(code: string): Promise<string> {
    const cached = this.roleIds.get(code);
    if (cached) return cached;
    const role = await this.prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name: ROLE_NAMES[code] ?? code },
    });
    this.roleIds.set(code, role.id);
    return role.id;
  }
}
