import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { LeasePdfService } from './lease-pdf.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContractController],
  providers: [ContractService, LeasePdfService],
  exports: [ContractService, LeasePdfService],
})
export class ContractModule {}
