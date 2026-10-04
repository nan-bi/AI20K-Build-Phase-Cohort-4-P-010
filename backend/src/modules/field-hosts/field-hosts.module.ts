import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FieldHostsController } from './field-hosts.controller';
import { FieldHostsService } from './field-hosts.service';

@Module({
  imports: [AuthModule],
  controllers: [FieldHostsController],
  providers: [FieldHostsService],
})
export class FieldHostsModule {}
