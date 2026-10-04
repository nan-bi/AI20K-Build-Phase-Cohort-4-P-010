import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { DepositModule } from '../deposit/deposit.module';
import { ContractModule } from '../contract/contract.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    TenantModule,
    DepositModule,
    ContractModule,
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
