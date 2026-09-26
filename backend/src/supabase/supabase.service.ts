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
