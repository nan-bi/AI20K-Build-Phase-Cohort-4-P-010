import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthError, createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';

export type { AuthError, Session, User };

const MOCK_URL = 'https://mock.supabase.co';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabaseUrl: string;
  private readonly anonKey: string;
  private readonly configured: boolean;
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || MOCK_URL;
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'mock_key';

    // Placeholder trong .env.example không tính là đã cấu hình.
    this.configured = Boolean(
      this.configService.get<string>('SUPABASE_URL') &&
        this.anonKey &&
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') &&
        !this.supabaseUrl.includes('your-project-ref') &&
        this.supabaseUrl !== MOCK_URL,
    );

    // Client service-role: chỉ dùng cho Admin API / getUser(jwt) / Storage. KHÔNG gọi signInWithPassword
    // trên client này (sẽ gắn phiên người dùng vào client dùng chung) — dùng anonClient() bên dưới.
    this.supabaseClient = createClient(this.supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Initialized Supabase Admin Client for: ${this.supabaseUrl}`);
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /** false khi thiếu SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY hoặc còn giá trị mẫu. */
  isConfigured(): boolean {
    return this.configured;
  }

  /** Client anon không lưu phiên, tạo mới mỗi lần gọi để các request đồng thời không dẫm lên nhau. */
  private anonClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async verifyJwtToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return data.user;
    } catch (err) {
      this.logger.error(`Error verifying JWT: ${(err as Error).message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------- Đăng nhập / đăng ký

  signInWithPassword(email: string, password: string) {
    return this.anonClient().auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string, options: { fullName: string; emailRedirectTo: string }) {
    return this.anonClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: options.emailRedirectTo, data: { full_name: options.fullName } },
    });
  }

  refreshSession(refreshToken: string) {
    return this.anonClient().auth.refreshSession({ refresh_token: refreshToken });
  }

  /** Thu hồi phiên hiện tại (best-effort: token hết hạn/không tồn tại vẫn coi là đã đăng xuất). */
  async signOut(accessToken: string): Promise<void> {
    try {
      await this.supabaseClient.auth.admin.signOut(accessToken, 'local');
    } catch (err) {
      this.logger.warn(`signOut failed: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------- OAuth (PKCE, do backend điều khiển)

  /** URL bắt đầu OAuth: Supabase → Google → `redirectTo?code=...`. */
  buildOAuthUrl(params: {
    provider: string;
    redirectTo: string;
    codeChallenge: string;
    queryParams?: Record<string, string>;
  }): string {
    const url = new URL(`${this.supabaseUrl}/auth/v1/authorize`);
    url.searchParams.set('provider', params.provider);
    url.searchParams.set('redirect_to', params.redirectTo);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 's256');
    for (const [key, value] of Object.entries(params.queryParams ?? {})) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /** Đổi `code` lấy phiên (PKCE) — cùng endpoint mà supabase-js gọi trong exchangeCodeForSession. */
  async exchangePkceCode(authCode: string, codeVerifier: string): Promise<Session | null> {
    try {
      const res = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
        },
        body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
      });
      if (!res.ok) {
        this.logger.warn(`PKCE exchange rejected: HTTP ${res.status}`);
        return null;
      }
      const session = (await res.json()) as Session;
      return session?.access_token && session?.refresh_token && session?.user ? session : null;
    } catch (err) {
      this.logger.error(`PKCE exchange failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------- Admin API

  createUser(params: { email: string; password: string; emailConfirm?: boolean }) {
    return this.supabaseClient.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: params.emailConfirm ?? true,
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.supabaseClient.auth.admin.deleteUser(userId);
  }

  // ---------------------------------------------------------------- Storage

  async uploadFile(bucket: string, path: string, fileBuffer: Buffer, contentType: string) {
    return this.supabaseClient.storage.from(bucket).upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    return this.supabaseClient.storage.from(bucket).createSignedUrl(path, expiresIn);
  }
}
