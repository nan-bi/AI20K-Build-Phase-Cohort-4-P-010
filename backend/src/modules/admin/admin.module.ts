import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PhoneService } from '../auth/phone/phone.service';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminFeeService } from './admin-fee.service';
import { AdminPayoutService } from './admin-payout.service';
import { AdminDispatchService } from './admin-dispatch.service';
import { AdminBiService } from './admin-bi.service';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminDepositService } from './admin-deposit.service';
import { AdminKeyService, ADMIN_KEY_CRYPTO } from './admin-key.service';

const services = [
  AdminService,
  AdminFeeService,
  AdminPayoutService,
  AdminDispatchService,
  AdminBiService,
  AdminInventoryService,
  AdminDepositService,
  AdminKeyService,
];

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [...services, { provide: ADMIN_KEY_CRYPTO, useExisting: PhoneService }],
  exports: services,
})
export class AdminModule {}