import { Module } from '@nestjs/common';
import { HandoverService } from './handover.service';
import { HandoverController } from './handover.controller';
import { ConsignmentCoreModule } from '../inspection/consignment-core.module';

@Module({
  imports: [ConsignmentCoreModule],
  controllers: [HandoverController],
  providers: [HandoverService],
  exports: [HandoverService],
})
export class HandoverModule {}
