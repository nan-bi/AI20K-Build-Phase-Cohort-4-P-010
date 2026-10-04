import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ContractModule } from '../contract/contract.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ContractModule, AuthModule], // AuthModule: PhoneService giải mã SĐT trả về cho chính chủ
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
