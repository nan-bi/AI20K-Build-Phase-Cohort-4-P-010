import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface LeasePdfStore {
  readonly prefix: 'local:' | 'supabase:';
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export class LocalDirLeasePdfStore implements LeasePdfStore {
  readonly prefix = 'local:' as const;
  private readonly logger = new Logger(LocalDirLeasePdfStore.name);

  constructor(private readonly baseDir: string) {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, bytes);
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key);
    return fs.promises.readFile(fullPath);
  }
}

export class SupabaseLeasePdfStore implements LeasePdfStore {
  readonly prefix = 'supabase:' as const;
  private readonly logger = new Logger(SupabaseLeasePdfStore.name);
  private readonly bucketName = 'lease-documents';
  private bucketEnsured = false;

  constructor(private readonly supabase: SupabaseService) {}

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return;
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const { data: buckets } = await client.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === this.bucketName);
      if (!exists) {
        await client.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 10 * 1024 * 1024,
        });
      }
      this.bucketEnsured = true;
    } catch (err: any) {
      this.logger.warn(`Could not ensure bucket ${this.bucketName}: ${err.message}`);
    }
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    await this.ensureBucket();
    const client = this.supabase.getClient();
    if (!client) {
      throw new Error('Supabase client is not available');
    }
    const { error } = await client.storage
      .from(this.bucketName)
      .upload(key, bytes, { contentType: 'application/pdf', upsert: false });
    if (error) {
      throw new Error(`Failed to upload PDF to Supabase storage: ${error.message}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    const client = this.supabase.getClient();
    if (!client) {
      throw new Error('Supabase client is not available');
    }
    const { data, error } = await client.storage.from(this.bucketName).download(key);
    if (error || !data) {
      throw new Error(`Failed to download PDF from Supabase storage: ${error?.message || 'not found'}`);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
