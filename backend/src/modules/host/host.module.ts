import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HostController } from './host.controller';
import { HostService } from './host.service';

@Module({
  imports: [AuthModule],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
