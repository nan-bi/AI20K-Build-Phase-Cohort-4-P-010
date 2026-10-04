import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { portalForRole } from '../auth.constants';
import { authError } from '../auth.errors';
import { AuthenticatedUser } from './authenticated-user';
import { toHostRoleCodes } from '../host-roles';
import { SessionTokenService } from './session-token.service';

export type ProfileWithRole = Prisma.ProfileGetPayload<{
  include: { role: true; hostProfile: { select: { id: true; roles: true } } };
}>;

export const PROFILE_INCLUDE = { role: true, hostProfile: { select: { id: true, roles: true } } } as const;

export function toAuthenticatedUser(
  identity: { id: string; email?: string | null },
  profile: ProfileWithRole | null,
): AuthenticatedUser {
  const role = profile?.role?.code ?? null;
  const isHostVerified = role === 'field_host' && Boolean(profile?.hostProfile);
  return {
    id: identity.id,
    email: profile?.email ?? identity.email ?? null,
    fullName: profile?.fullName ?? null,
    role,
    portal: portalForRole(role),
    isPhoneVerified: profile?.isPhoneVerified ?? false,
    isHostVerified,
    hostRoles: isHostVerified ? toHostRoleCodes(profile.hostProfile.roles) : [],
  };
}

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 1000;
// Lỗi kết nối tạm thời của Prisma (không tới được DB / pool đóng / timeout).
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const transient = TRANSIENT_PRISMA_CODES.has((err as { code?: string })?.code ?? '');
      if (!transient || i >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 150 * i));
    }
  }
}

/**
 * access token (JWT do backend ký, kiểm tra cục bộ) → người dùng của hệ thống, rồi lấy vai trò từ DB.
 * Vai trò KHÔNG đọc từ JWT nên đổi vai trò/khoá tài khoản có hiệu lực ngay ở request kế tiếp.
 */
@Injectable()
export class AuthSessionService {
  // Cache ngắn: mỗi lần chuyển trang có 2–3 request session liên tiếp, mỗi cái tốn 1 lượt DB (DB ở xa nên chậm).
  // Đổi vai trò / khoá tài khoản có hiệu lực sau tối đa CACHE_TTL_MS.
  private readonly cache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  /** Gọi sau khi hồ sơ/vai trò của user đổi (RFID, SĐT...) để request kế tiếp đọc lại từ DB. */
  invalidate(userId: string): void {
    for (const [key, entry] of this.cache) if (entry.user.id === userId) this.cache.delete(key);
  }

  /** null nếu token không hợp lệ/hết hạn; ném `account_suspended` nếu tài khoản bị khoá. */
  async authenticate(accessToken: string): Promise<AuthenticatedUser | null> {
    const key = createHash('sha256').update(accessToken).digest('hex');
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.user;
    this.cache.delete(key);

    // Kiểm tra cục bộ (HMAC, không tốn mạng).
    const claims = this.sessionTokens.verify(accessToken);
    if (!claims) return null;
    const identity = { id: claims.sub, email: claims.email };

    const profile = await withRetry(() =>
      this.prisma.profile.findUnique({
        where: { id: identity.id },
        include: PROFILE_INCLUDE,
      }),
    );
    // Token luôn gắn với một Profile đã tạo; Profile bị xoá thì token vô hiệu.
    if (!profile) return null;
    if (!profile.isActive) throw authError('account_suspended');

    const user = toAuthenticatedUser(identity, profile);
    if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  }
}
