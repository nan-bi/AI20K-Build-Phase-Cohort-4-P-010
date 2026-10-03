import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Băm mật khẩu không bao giờ rò sang response của module khác; AuthService.login tự bật lại cho mình.
      omit: { profile: { passwordHash: true } },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('🚀 Connected successfully to PostgreSQL (Supabase) via Prisma ORM');
    } catch (error) {
      this.logger.warn('⚠️ Prisma could not connect to PostgreSQL immediately (check DATABASE_URL). Continuing in mock/offline mode.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Disconnected Prisma client from PostgreSQL');
  }
}
