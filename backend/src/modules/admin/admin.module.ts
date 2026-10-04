import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminFeeService } from './admin-fee.service';
import { AdminPayoutService } from './admin-payout.service';
import { AdminDispatchService } from './admin-dispatch.service';
import { AdminBiService } from './admin-bi.service';
import { AdminInventoryService } from './admin-inventory.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminFeeService, AdminPayoutService, AdminDispatchService, AdminBiService, AdminInventoryService],
  exports: [AdminService, AdminFeeService, AdminPayoutService, AdminDispatchService, AdminBiService, AdminInventoryService],
})
export class AdminModule {}
