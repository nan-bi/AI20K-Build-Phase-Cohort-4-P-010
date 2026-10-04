import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, TenantModule, AuthModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
