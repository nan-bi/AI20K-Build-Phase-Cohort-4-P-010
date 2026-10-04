import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { DoorModule } from '../door/door.module';
import { HostActorService } from './host-actor.service';
import { HostBoardService } from './host-board.service';
import { HostViewingsController } from './host-viewings.controller';
import { ViewingFlowService } from './viewing-flow.service';

@Module({
  imports: [AuthModule, DispatchModule, DoorModule],
  controllers: [HostViewingsController],
  providers: [HostActorService, HostBoardService, ViewingFlowService],
  exports: [HostActorService, ViewingFlowService],
})
export class HostViewingsModule {}
