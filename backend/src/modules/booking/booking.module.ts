import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { HostViewingsModule } from '../host-viewings/host-viewings.module';
import { DepositModule } from '../deposit/deposit.module';

@Module({
  imports: [PrismaModule, TenantModule, AuthModule, DispatchModule, HostViewingsModule, DepositModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
