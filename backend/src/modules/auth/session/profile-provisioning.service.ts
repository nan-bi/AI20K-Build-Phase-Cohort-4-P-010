import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '../../../supabase/supabase.service';
import { Portal, PORTAL_ROLE, ROLE_NAMES } from '../auth.constants';
import { PROFILE_INCLUDE, ProfileWithRole } from './auth-session.service';

export type EnsureProfileError =
  | 'email_not_verified'
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
 * Gọi sau MỖI lần đăng nhập thành công (mật khẩu, Google, đăng ký có phiên) với cổng người dùng đi vào.
 * Tạo Profile ở lần đầu và bắt buộc tài khoản khớp cổng:
 *  - tenant / landlord: tự đăng ký.
 *  - host: email phải có HostInvite chưa dùng; sau khi nhập đúng RFID (AuthService.verifyRfid)
 *    mới có bản ghi FieldHost. Trước đó `needsRfidVerification: true`.
 *  - admin: không bao giờ tạo ở đây — chỉ bằng `npm run create:admin`.
 */
@Injectable()
export class ProfileProvisioningService {
  private readonly roleIds = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(user: User, portal: Portal): Promise<EnsureProfileResult> {
    const email = user.email?.toLowerCase();
    // Email phải được chứng minh (Google luôn có; đăng ký email cần bấm link) — nếu không, ai cũng có
    // thể chiếm email của một Host đã được mời.
    if (!email || !user.email_confirmed_at) return { ok: false, error: 'email_not_verified' };

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
    const fullName: string | null = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
    try {
      const profile = await this.prisma.profile.create({
        data: {
          id: user.id,
          roleId: await this.roleId(roleCode),
          email,
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

    const profile = await this.prisma.profile.update({
      where: { id: existing.id },
      data: { lastLoginAt: new Date() },
      include: PROFILE_INCLUDE,
    });

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
