import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoGuard } from './demo.guard';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [DemoController],
  providers: [DemoGuard],
  exports: [DemoGuard],
})
export class DemoModule {}
