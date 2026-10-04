import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoorCodeService } from './door-code.service';

@Module({
  imports: [AuthModule],
  providers: [DoorCodeService],
  exports: [DoorCodeService],
})
export class DoorModule {}
