import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsignmentCoreModule } from '../inspection/consignment-core.module';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordConsignmentService } from './landlord-consignment.service';
import { LandlordController } from './landlord.controller';
import { LandlordDirectoryService } from './landlord-directory.service';
import { LandlordFeeService } from './landlord-fee.service';
import { LandlordFinanceService } from './landlord-finance.service';
import { LandlordPhotoService } from './landlord-photo.service';
import { LandlordMandateService } from './landlord-mandate.service';
import { LandlordService } from './landlord.service';
import { LandlordUnitsService } from './landlord-units.service';

@Module({
  // AuthModule: OtpService + PhoneService (xác thực OTP khi ký, giải mã SĐT).
  // ConsignmentCoreModule: kho meta khóa dòng + kho ảnh Storage + bộ chọn Inspector (dùng chung với InspectionModule).
  imports: [AuthModule, ConsignmentCoreModule],
  controllers: [LandlordController],
  providers: [
    LandlordAccessService,
    LandlordDirectoryService,
    LandlordFeeService,
    LandlordService,
    LandlordUnitsService,
    LandlordConsignmentService,
    LandlordPhotoService,
    LandlordFinanceService,
    LandlordMandateService,
  ],
  exports: [LandlordService],
})
export class LandlordModule {}
