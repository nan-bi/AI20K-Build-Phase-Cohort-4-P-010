import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabaseUrl: string;
  private readonly configured: boolean;
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')?.trim();
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-ref')) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured with real Supabase credentials.');
    }

    try {
      const parsedUrl = new URL(supabaseUrl);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') throw new Error();
    } catch {
      throw new Error('SUPABASE_URL must be a valid HTTP(S) URL.');
    }

    this.supabaseUrl = supabaseUrl;
    this.configured = true;

    // Client service-role: chỉ dùng cho Storage (ảnh hồ sơ ký gửi). Đăng nhập không đi qua Supabase.
    this.supabaseClient = createClient(this.supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Initialized Supabase Storage client.');
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /** false khi thiếu SUPABASE_URL / SERVICE_ROLE_KEY hoặc còn giá trị mẫu (chỉ ảnh hưởng Storage, không ảnh hưởng đăng nhập). */
  isConfigured(): boolean {
    return this.configured;
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
