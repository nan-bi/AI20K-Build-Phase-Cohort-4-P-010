import { Module } from '@nestjs/common';
import { MatchmakerService } from './matchmaker.service';
import { MatchmakerController } from './matchmaker.controller';
import { PropertyModule } from '../property/property.module';

@Module({
  imports: [PropertyModule],
  controllers: [MatchmakerController],
  providers: [MatchmakerService],
  exports: [MatchmakerService],
})
export class MatchmakerModule {}
