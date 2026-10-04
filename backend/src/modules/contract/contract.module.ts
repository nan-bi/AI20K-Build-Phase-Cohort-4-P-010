import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { LeasePdfService } from './lease-pdf.service';
import { AuthModule } from '../auth/auth.module';
import { DoorModule } from '../door/door.module';

@Module({
  imports: [AuthModule, DoorModule],
  controllers: [ContractController],
  providers: [ContractService, LeasePdfService],
  exports: [ContractService, LeasePdfService],
})
export class ContractModule {}
