# Digest: auth

## Files
- backend/src/modules/auth/auth-audit.service.ts (39 dòng)
- backend/src/modules/auth/auth.constants.ts (54 dòng)
- backend/src/modules/auth/auth.controller.ts (176 dòng)
- backend/src/modules/auth/auth.errors.ts (52 dòng)
- backend/src/modules/auth/auth.http.spec.ts (507 dòng)
- backend/src/modules/auth/auth.module.ts (62 dòng)
- backend/src/modules/auth/auth.service.spec.ts (521 dòng)
- backend/src/modules/auth/auth.service.ts (371 dòng)
- backend/src/modules/auth/demo-accounts.ts (15 dòng)
- backend/src/modules/auth/dto/auth.dto.ts (124 dòng)
- backend/src/modules/auth/google/google-auth.guard.ts (64 dòng)
- backend/src/modules/auth/google/google.strategy.ts (64 dòng)
- backend/src/modules/auth/host-invites/host-invites.controller.ts (28 dòng)
- backend/src/modules/auth/host-invites/host-invites.service.ts (45 dòng)
- backend/src/modules/auth/otp/action-token.service.ts (51 dòng)
- backend/src/modules/auth/otp/action-token.spec.ts (37 dòng)
- backend/src/modules/auth/otp/action-token.ts (62 dòng)
- backend/src/modules/auth/otp/otp-crypto.spec.ts (19 dòng)
- backend/src/modules/auth/otp/otp-crypto.ts (19 dòng)
- backend/src/modules/auth/otp/otp.controller.ts (80 dòng)
- backend/src/modules/auth/otp/otp.service.spec.ts (171 dòng)
- backend/src/modules/auth/otp/otp.service.ts (186 dòng)
- backend/src/modules/auth/otp/phone-verification.service.ts (45 dòng)
- backend/src/modules/auth/otp/senders/console-otp.sender.ts (15 dòng)
- backend/src/modules/auth/otp/senders/otp-channel.ts (7 dòng)
- backend/src/modules/auth/otp/senders/sms-fallback.sender.ts (10 dòng)
- backend/src/modules/auth/otp/senders/zalo-zns.sender.ts (15 dòng)
- backend/src/modules/auth/phone/phone.service.spec.ts (38 dòng)
- backend/src/modules/auth/phone/phone.service.ts (53 dòng)
- backend/src/modules/auth/phone/phone.spec.ts (31 dòng)
- backend/src/modules/auth/phone/phone.ts (28 dòng)
- backend/src/modules/auth/secrets.ts (34 dòng)
- backend/src/modules/auth/session/auth-session.service.ts (96 dòng)
- backend/src/modules/auth/session/authenticated-user.ts (20 dòng)
- backend/src/modules/auth/session/profile-provisioning.service.spec.ts (130 dòng)
- backend/src/modules/auth/session/profile-provisioning.service.ts (118 dòng)
- backend/src/modules/auth/session/session-cookies.service.ts (79 dòng)
- backend/src/modules/auth/session/session-token.service.ts (36 dòng)
- backend/src/modules/auth/testing/fake-config.ts (8 dòng)
- backend/src/modules/auth/testing/fake-prisma.ts (147 dòng)
- backend/src/modules/auth/testing/fake-session-token.ts (12 dòng)
- backend/src/modules/auth/testing/fake-supabase.ts (50 dòng)
## Controller (route -> handler; guard)
- AuthController: POST /auth/login -> login; @UseGuards(ThrottlerGuard), @Public
- AuthController: POST /auth/signup -> signup; @UseGuards(ThrottlerGuard), @Public
- AuthController: POST /auth/demo-login -> demoLogin; @UseGuards(ThrottlerGuard), @Public
- AuthController: GET /auth/google -> CHƯA RÕ; @UseGuards(ThrottlerGuard), @Public
- AuthController: GET /auth/google/callback -> googleCallback; @UseGuards(ThrottlerGuard), @Public
- AuthController: GET /auth/session -> session; @UseGuards(ThrottlerGuard), @Public
- AuthController: POST /auth/refresh -> refresh; @UseGuards(ThrottlerGuard), @Public
- AuthController: POST /auth/logout -> logout; @UseGuards(ThrottlerGuard), @Public
- AuthController: POST /auth/verify-rfid -> verifyRfid; @UseGuards(ThrottlerGuard)
- HostInvitesController: GET /admin/field-hosts -> list; @Roles('ops_admin')
- HostInvitesController: POST /admin/field-hosts -> create; @Roles('ops_admin')
- OtpController: POST /auth/otp/send -> send; @UseGuards(ThrottlerGuard), @Public
- OtpController: POST /auth/otp/verify -> verify; @UseGuards(ThrottlerGuard), @Public
- OtpController: POST /auth/phone/verify -> verifyPhone; @UseGuards(ThrottlerGuard), @Roles('landlord', 'field_host')
## Service
#### auth-audit.service.ts
- Public method: L24 `record(event: string, entry: AuthAuditEntry = {}): Promise<void>`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
#### auth.service.ts
- Public method: L79 `async login(dto: { email: string; password: string; portal: Portal }, ctx: RequestContext): Promise<LoginOutcome>`; L89 `async signup( dto: { email: string; password: string; fullName: string; portal: Portal }, ctx: RequestContext, ): Promise<SignupOutcome>`; L118 `async demoLogin(portal: Portal, ctx: RequestContext): Promise<LoginOutcome>`; L129 `beginGoogle(portal: unknown): { state: string; nonce: string }`; L138 `isGoogleStateValid(state?: string, nonce?: string): boolean`; L146 `async completeGoogle( params: { identity: GoogleIdentity | null; state?: string; nonce?: string }, ctx: RequestContext, ): Promise<OAuthResult>`; L187 `async refresh(refreshToken: string): Promise<SessionTokens>`; L200 `async resolveSession( accessToken?: string, refreshToken?: string, ): Promise<{ user: AuthUserView | null; tokens?: SessionTokens; clear?: boolean }>`; L221 `async logout(accessToken?: string): Promise<void>`; L230 `async verifyRfid(user: AuthenticatedUser, dto: { hostId: string; rfid: string }, ctx: RequestContext): Promise<void>`
- Prisma: fieldHost.create (L249); hostInvite.findUnique (L99,233,319); hostInvite.updateMany (L243); profile.findUnique (L159); profile.update (L257)
- $transaction: CÓ (L241)
- Gọi ngoài: supabase.service@L6, supabase.signInWithPassword@L81, supabase.signUp@L103, supabase.refreshSession@L189, supabase.isConfigured@L208, supabase.refreshSession@L209, supabase.isConfigured@L223, supabase.signOut@L224, supabase.signOut@L276, supabase.isConfigured@L349
- Import thư viện ngoài (ngoài @nestjs): @prisma/client, node:crypto
- Dấu mock/TODO: L10: import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS } from '<str>'; | L117: /** Đăng nhập 1-chạm bằng tài khoản demo đã seed. Tắt hẳn khi không bật AUTH_DEMO_MODE. */
#### google-auth.guard.ts
- Public method: L24 `getAuthenticateOptions(context: ExecutionContext)`; L50 `async canActivate(context: ExecutionContext): Promise<boolean>`; L60 `handleRequest<T>(err: unknown, user: T | false | null): T | null`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): express
#### google.strategy.ts
- Public method: L50 `authorizationParams(): Record<string, string>`; L54 `validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleIdentity | null`
- $transaction: KHÔNG
- Import thư viện ngoài (ngoài @nestjs): passport-google-oauth20
#### host-invites.service.ts
- Public method: L13 `async list()`; L25 `async create(dto: CreateHostInviteDto)`
- Prisma: hostInvite.create (L33); hostInvite.findMany (L14); profile.findUnique (L29)
- $transaction: KHÔNG
#### action-token.service.ts
- Public method: L31 `issue(params: { phone: string; purpose: ActionTokenPurpose; otpId: string }): string`; L39 `async redeem(token: string, purpose: ActionTokenPurpose): Promise<ActionTokenPayload>`
- $transaction: KHÔNG
#### otp.service.ts
- Public method: L59 `async send(params: { phone: string; purpose: OtpPurpose } & OtpRequestContext): Promise<{ devCode?: string }>`; L111 `async verify(params: { phone: string; purpose: OtpPurpose; code: string } & OtpRequestContext): Promise<OtpCode>`; L158 `async consume(id: string): Promise<boolean>`
- Prisma: otpCode.create (L86); otpCode.findFirst (L63,115); otpCode.update (L124,137); otpCode.updateMany (L82,147,159)
- $transaction: CÓ (L80)
## DTO (field: kiểu [validator])
- LoginDto: email: string [ApiProperty, IsEmail, MaxLength(EMAIL_MAX)]; password: string [ApiProperty, IsString, MinLength(1), MaxLength(200)]; portal: Portal [ApiProperty, IsIn(PORTALS as unknown as string[])]
## File khác
- auth.constants.ts (export): ACCESS_COOKIE, GOOGLE_SESSION_TTL_SECONDS, OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE_MS, PORTALS, PORTAL_HOME, PORTAL_ROLE, Portal, REFRESH_COOKIE, REFRESH_COOKIE_MAX_AGE_MS, ROLE_NAMES, ROLE_PORTAL, loginPathForPortal, portalForRole

(đã cắt 60 dòng)
