import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Core & Global Modules
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';

// Business Modules
import { PropertyModule } from './modules/property/property.module';
import { MatchmakerModule } from './modules/matchmaker/matchmaker.module';
import { BookingModule } from './modules/booking/booking.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DepositModule } from './modules/deposit/deposit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ContractModule } from './modules/contract/contract.module';
import { LandlordModule } from './modules/landlord/landlord.module';
import { HandoverModule } from './modules/handover/handover.module';
import { AdminModule } from './modules/admin/admin.module';
import { AccountModule } from './modules/account/account.module';
import { HostModule } from './modules/host/host.module';
import { FieldHostsModule } from './modules/field-hosts/field-hosts.module';
import { DemoModule } from './modules/demo/demo.module';

// Common Filters, Guards & Interceptors
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    // Chỉ áp dụng ở nơi có @UseGuards(ThrottlerGuard) (các endpoint auth), không phải toàn cục.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    SupabaseModule,
    AuditModule,
    AuthModule,

    // 12 Business Modules
    PropertyModule,
    MatchmakerModule,
    BookingModule,
    DispatchModule,
    DepositModule,
    IdentityModule,
    ContractModule,
    LandlordModule,
    HandoverModule,
    AdminModule,
    AccountModule,
    HostModule,
    FieldHostsModule,
    DemoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
