import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'https://mock.supabase.co';
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'mock_key';

    this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Initialized Supabase Admin Client for: ${supabaseUrl}`);
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  async verifyJwtToken(token: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseClient.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return data.user;
    } catch (err) {
      this.logger.error(`Error verifying JWT: ${err.message}`);
      return null;
    }
  }

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
