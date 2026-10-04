import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingAccessService } from './booking-access.service';

@Module({
  imports: [PrismaModule],
  providers: [BookingAccessService],
  exports: [BookingAccessService],
})
export class TenantModule {}
