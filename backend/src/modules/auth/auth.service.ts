import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HostDutyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthAuditService } from './auth-audit.service';
import { PORTAL_HOME, Portal, PORTALS, loginPathForPortal } from './auth.constants';
import { AuthException, authError } from './auth.errors';
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS } from './demo-accounts';
import { GoogleIdentity } from './google/google.strategy';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password-hasher';
import { AuthenticatedUser, AuthUserView } from './session/authenticated-user';
import { AuthSessionService, PROFILE_INCLUDE, ProfileWithRole, toAuthenticatedUser } from './session/auth-session.service';
import { ProfileProvisioningService, ProvisionUser } from './session/profile-provisioning.service';
import { SessionTokens } from './session/session-cookies.service';
import { SessionTokenService } from './session/session-token.service';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginOutcome {
  tokens: SessionTokens;
  user: AuthUserView;
  needsRfidVerification: boolean;
  hostId?: string;
}

/** Callback Google luôn kết thúc bằng một redirect về FE (thành công → trang chủ cổng, lỗi → màn đăng nhập). */
export type OAuthResult =
  | { ok: true; redirectUrl: string; outcome: LoginOutcome }
  | { ok: false; redirectUrl: string };

const rfidEquals = (expected: string, given: string) => {
  // RFID thường nhập tay nên so không phân biệt hoa/thường; so sánh thời gian hằng số.
  const a = Buffer.from(expected.trim().toLowerCase());
  const b = Buffer.from(given.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Toàn bộ nghiệp vụ đăng nhập của VinStay: mật khẩu (băm scrypt trong `profiles.password_hash`), đăng ký, Google
 * (Passport), phiên (JWT do backend ký) và bước RFID của Field Host. Không dùng Supabase Auth. FE chỉ hiển thị
 * form và gọi các endpoint này.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly webUrl: string;
  private readonly apiPrefix: string;
  private readonly demoMode: boolean;
  private readonly demoPassword: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: AuthSessionService,
    private readonly provisioning: ProfileProvisioningService,
    private readonly audit: AuthAuditService,
    private readonly sessionTokens: SessionTokenService,
    config: ConfigService,
  ) {
    this.webUrl = (config.get<string>('WEB_APP_URL') || 'http://localhost:3000').replace(/\/+$/, '');
    this.apiPrefix = (config.get<string>('API_PREFIX') || 'api/v1').replace(/^\/+|\/+$/g, '');
    this.demoMode = config.get('AUTH_DEMO_MODE') === 'true' && config.get('NODE_ENV') !== 'production';
    this.demoPassword = config.get<string>('DEMO_PASSWORD') || DEFAULT_DEMO_PASSWORD;
  }

  // ------------------------------------------------------------------ Email + mật khẩu

  async login(dto: { email: string; password: string; portal: Portal }, ctx: RequestContext): Promise<LoginOutcome> {
    const email = dto.email.trim().toLowerCase();
    const profile = await this.prisma.profile.findUnique({
      where: { email },
      include: PROFILE_INCLUDE,
      omit: { passwordHash: false },
    });
    // Luôn băm một lần dù email không tồn tại / chưa có mật khẩu: độ trễ không để lộ email nào có tài khoản.
    const passwordOk = await verifyPassword(dto.password, profile?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!profile || !profile.passwordHash || !passwordOk) {
      await this.audit.record('login_failed', { ...ctx, metadata: { portal: dto.portal, method: 'password' } });
      // Tài khoản tạo bằng Google chưa có mật khẩu: chỉ dẫn người dùng sang Google thay vì báo sai mật khẩu.
      throw authError(profile && !profile.passwordHash ? 'password_not_set' : 'invalid_credentials');
    }
    return this.completeLogin({ id: profile.id, email }, dto.portal, ctx, 'password');
  }

  /** Đăng ký email + mật khẩu: tạo Profile rồi đăng nhập luôn (không xác nhận email). */
  async signup(
    dto: { email: string; password: string; fullName: string; portal: Portal },
    ctx: RequestContext,
  ): Promise<LoginOutcome> {
    if (dto.portal === 'admin') throw authError('signup_not_allowed');

    const email = dto.email.trim().toLowerCase();
    // Không đặt mật khẩu lên tài khoản đã có (kể cả tài khoản Google): email chưa được chứng minh nên làm vậy là chiếm tài khoản.
    const existing = await this.prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw authError('email_already_registered');

    if (dto.portal === 'host') {
      const invite = await this.prisma.hostInvite.findUnique({ where: { email } });
      if (!invite || invite.claimedAt) throw authError('not_authorized');
    }

    const passwordHash = await hashPassword(dto.password);
    return this.completeLogin(
      { id: randomUUID(), email, fullName: dto.fullName.trim(), passwordHash },
      dto.portal,
      ctx,
      'signup',
    );
  }

  /** Đăng nhập 1-chạm bằng tài khoản demo đã seed. Tắt hẳn khi không bật AUTH_DEMO_MODE. */
  async demoLogin(portal: Portal, ctx: RequestContext): Promise<LoginOutcome> {
    if (!this.demoMode) throw authError('demo_disabled');
    return this.login({ email: DEMO_ACCOUNTS[portal].email, password: this.demoPassword, portal }, ctx);
  }

  // ------------------------------------------------------------------ Google (Passport)

  /**
   * Bước 1: tạo `state` = `<portal>.<nonce>`. Nonce nằm trong cookie httpOnly; callback chỉ hợp lệ khi `state`
   * Google trả về khớp cookie (chống CSRF / dính phiên của người khác).
   */
  beginGoogle(portal: unknown): { state: string; nonce: string } {
    if (!PORTALS.includes(portal as Portal)) throw authError('invalid_request');
    // Admin chỉ đăng nhập email + mật khẩu.
    if (portal === 'admin') throw authError('signup_not_allowed');
    const nonce = randomBytes(24).toString('base64url');
    return { state: `${portal}.${nonce}`, nonce };
  }

  /** Guard callback dùng để bỏ qua bước đổi code với Google khi `state` không khớp cookie. */
  isGoogleStateValid(state?: string, nonce?: string): boolean {
    return this.parseGoogleState(state, nonce) !== null;
  }

  /**
   * Bước 2: hồ sơ Google (Passport đã đổi code) → Profile → JWT phiên do backend ký. Không ném lỗi — trả kết
   * quả để controller redirect về FE.
   */
  async completeGoogle(
    params: { identity: GoogleIdentity | null; state?: string; nonce?: string },
    ctx: RequestContext,
  ): Promise<OAuthResult> {
    const state = this.parseGoogleState(params.state, params.nonce);
    const failure = (error: string): OAuthResult => ({ ok: false, redirectUrl: this.loginErrorUrl(state?.portal ?? null, error) });
    const { identity } = params;
    if (!state || state.portal === 'admin' || !identity) return failure('oauth_failed');
    if (!identity.emailVerified) return failure('email_not_verified');

    try {
      const email = identity.email.trim().toLowerCase();
      // Cùng email đã có tài khoản (vd. đăng ký bằng mật khẩu trước đó) thì dùng chung Profile, không tạo bản thứ hai.
      const existing = await this.prisma.profile.findUnique({ where: { email }, select: { id: true } });
      const user: ProvisionUser = { id: existing?.id ?? randomUUID(), email, fullName: identity.fullName };
      const outcome = await this.completeLogin(user, state.portal, ctx, 'google');
      const path = outcome.needsRfidVerification
        ? `/admin/login?tab=host&rfidPending=${outcome.hostId}`
        : PORTAL_HOME[state.portal];
      return { ok: true, redirectUrl: `${this.webUrl}${path}`, outcome };
    } catch (err) {
      if (err instanceof AuthException) return failure(err.code);
      this.logger.error(`Google callback failed: ${(err as Error).message}`);
      return failure('oauth_failed');
    }
  }

  // ------------------------------------------------------------------ Phiên

  /** Phiên hiện tại cho FE/proxy. `clear` = cookie hiện có đã vô dụng (hết hạn / sai chữ ký / Profile bị xoá hoặc khoá). */
  async resolveSession(accessToken?: string): Promise<{ user: AuthUserView | null; clear?: boolean }> {
    if (accessToken) {
      const user = await this.safeAuthenticate(accessToken);
      if (user) return { user: await this.toView(user) };
    }
    return { user: null, clear: Boolean(accessToken) };
  }

  // ------------------------------------------------------------------ Field Host: xác nhận RFID

  async verifyRfid(user: AuthenticatedUser, dto: { hostId: string; rfid: string }, ctx: RequestContext): Promise<void> {
    if (user.role !== 'field_host' || user.isHostVerified) throw authError('invalid_host');

    const invite = await this.prisma.hostInvite.findUnique({ where: { id: dto.hostId } });
    if (!invite || invite.claimedAt || invite.email !== user.email?.toLowerCase()) throw authError('invalid_host');

    if (!rfidEquals(invite.rfidCardNumber, dto.rfid)) {
      await this.audit.record('rfid_failed', { userId: user.id, ...ctx });
      throw authError('rfid_mismatch');
    }

    await this.prisma.$transaction(async (tx) => {
      // Nhận lời mời nguyên tử: chỉ một request thắng.
      const claimed = await tx.hostInvite.updateMany({
        where: { id: invite.id, claimedAt: null },
        data: { claimedAt: new Date(), claimedById: user.id },
      });
      if (claimed.count !== 1) throw authError('invalid_host');

      await tx.fieldHost.create({
        data: {
          profileId: user.id,
          assignedZone: invite.assignedZone,
          rfidCardNumber: invite.rfidCardNumber,
          dutyStatus: HostDutyStatus.OFF_DUTY,
        },
      });
      await tx.profile.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    });
    this.sessions.invalidate(user.id);
    await this.audit.record('rfid_verified', { userId: user.id, ...ctx });
  }

  // ------------------------------------------------------------------ nội bộ

  /** Tạo/nạp Profile theo cổng rồi ký JWT phiên. Ném AuthException nếu bị từ chối. */
  private async completeLogin(
    user: ProvisionUser,
    portal: Portal,
    ctx: RequestContext,
    method: 'password' | 'google' | 'signup',
  ): Promise<LoginOutcome> {
    const admitted = await this.admit(user, portal, ctx, method);
    return {
      tokens: this.sessionTokens.sign(admitted.profile.id, user.email),
      user: this.viewOfProfile(admitted.profile),
      needsRfidVerification: admitted.needsRfidVerification,
      ...(admitted.hostId ? { hostId: admitted.hostId } : {}),
    };
  }

  /** Tạo/nạp Profile và bắt buộc khớp cổng (dùng chung cho mật khẩu, đăng ký và Google). Ném AuthException nếu bị từ chối. */
  private async admit(
    user: ProvisionUser,
    portal: Portal,
    ctx: RequestContext,
    method: 'password' | 'google' | 'signup',
  ): Promise<{ profile: ProfileWithRole; needsRfidVerification: boolean; hostId?: string }> {
    const result = await this.provisioning.ensureProfile(user, portal);
    // `in` thay vì `!result.ok`: backend chạy strictNullChecks=false nên TS không thu hẹp union theo boolean.
    if ('error' in result) {
      await this.audit.record('login_rejected', {
        userId: user.id,
        ...ctx,
        metadata: { portal, method, reason: result.error },
      });
      throw authError(result.error);
    }

    await this.audit.record('login_succeeded', { userId: user.id, ...ctx, metadata: { portal, method } });
    return {
      profile: result.profile,
      needsRfidVerification: result.needsRfidVerification,
      ...(result.needsRfidVerification ? { hostId: result.hostId } : {}),
    };
  }

  private viewOfProfile(profile: ProfileWithRole): AuthUserView {
    return toAuthenticatedUser({ id: profile.id, email: profile.email }, profile);
  }

  private async toView(user: AuthenticatedUser): Promise<AuthUserView> {
    if (user.role !== 'field_host' || user.isHostVerified || !user.email) return user;
    const invite = await this.prisma.hostInvite.findUnique({ where: { email: user.email.toLowerCase() } });
    return invite && !invite.claimedAt ? { ...user, pendingHostId: invite.id } : user;
  }

  private async safeAuthenticate(accessToken: string): Promise<AuthenticatedUser | null> {
    try {
      return await this.sessions.authenticate(accessToken);
    } catch (err) {
      if (err instanceof AuthException) return null; // tài khoản bị khoá → coi như không có phiên
      throw err;
    }
  }

  /** `<portal>.<nonce>` hợp lệ khi nonce trùng cookie; sai/thiếu → null (không tin portal do URL cung cấp). */
  private parseGoogleState(state?: string, nonce?: string): { portal: Portal } | null {
    if (!state || !nonce) return null;
    const dot = state.indexOf('.');
    const portal = state.slice(0, dot);
    const given = Buffer.from(state.slice(dot + 1));
    const expected = Buffer.from(nonce);
    if (dot < 0 || !PORTALS.includes(portal as Portal) || given.length !== expected.length) return null;
    return timingSafeEqual(given, expected) ? { portal: portal as Portal } : null;
  }

  private loginErrorUrl(portal: Portal | null, error: string): string {
    const target = portal ?? 'tenant';
    return `${this.webUrl}${loginPathForPortal(target)}?error=${encodeURIComponent(error)}&tab=${target}`;
  }
}
